import {
    _decorator,
    BoxCollider2D,
    Collider2D,
    Component,
    Contact2DType,
    director,
    Director,
    Enum,
    game,
    Game,
    IPhysics2DContact,
    Node,
    PhysicsSystem2D,
    Size,
    Vec2,
} from 'cc';
import { Hurtbox } from './Hurtbox';
import { Team } from './Team';

const { ccclass, property, requireComponent } = _decorator;

let nextAttackId = 1;

/** An explicitly activated attack volume driven by Collider2D contacts. */
@ccclass('Hitbox')
@requireComponent(Collider2D)
export class Hitbox extends Component {
    @property({ type: Enum(Team), tooltip: 'Faction that owns this attack.' })
    public team = Team.Player;

    @property({ min: 0, tooltip: 'Damage dealt to an accepted target.' })
    public damage = 10;

    @property({ tooltip: 'Horizontal knockback. It follows this node world scale X.' })
    public horizontalKnockback = 5;

    @property({ tooltip: 'Vertical knockback.' })
    public verticalKnockback = 3;

    private collider: Collider2D | null = null;
    private activeAttackId = 0;
    // Cocos may clear component fields while nodes are being torn down.
    private hitTargets: Set<Hurtbox> | null = new Set<Hurtbox>();

    public get attackId(): number {
        return this.activeAttackId;
    }

    public get isAttacking(): boolean {
        return this.activeAttackId !== 0;
    }

    /** Updates a box attack volume while it is closed. Invalid values become safe zeroes. */
    public setBoxBounds(offset: Readonly<Vec2>, size: Readonly<Size>): boolean {
        // Never reshape an active collider: callers must configure a complete attack before
        // beginAttack() so physics cannot observe half-updated bounds.
        this.endAttack();
        const collider = this.getCollider();
        if (!(collider instanceof BoxCollider2D)) {
            return false;
        }

        collider.offset = new Vec2(this.finite(offset.x), this.finite(offset.y));
        collider.size = new Size(this.nonNegativeFinite(size.width), this.nonNegativeFinite(size.height));
        return true;
    }

    protected onLoad(): void {
        this.collider = this.getComponent(Collider2D);
        if (this.collider) {
            this.collider.enabled = false;
        }
    }

    protected onEnable(): void {
        const collider = this.getCollider();
        collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        game.on(Game.EVENT_HIDE, this.endAttack, this);
    }

    /** Starts a new attack window and returns its process-unique ID. */
    public beginAttack(): number {
        if (!this.isValid) {
            return 0;
        }
        this.endAttack();
        this.activeAttackId = nextAttackId;
        nextAttackId += 1;
        const collider = this.getCollider();
        if (collider) {
            collider.enabled = true;
            const attackId = this.activeAttackId;
            director.once(Director.EVENT_AFTER_PHYSICS, () => {
                if (!this.isValid || !this.collider?.isValid) {
                    return;
                }
                this.queryOverlaps(attackId);
            }, this);
        }
        return this.activeAttackId;
    }

    /** Closes the active window. Contacts outside a window never deal damage. */
    public endAttack(): void {
        this.activeAttackId = 0;
        this.hitTargets?.clear();
        const collider = this.collider;
        if (collider?.isValid) {
            collider.enabled = false;
        }
    }

    public getKnockback(): Vec2 {
        const facing = this.node.worldScale.x < 0 ? -1 : 1;
        return new Vec2(this.horizontalKnockback * facing, this.verticalKnockback);
    }

    protected onDisable(): void {
        game.off(Game.EVENT_HIDE, this.endAttack, this);
        this.removeContactListener();
        this.endAttack();
    }

    protected onDestroy(): void {
        game.off(Game.EVENT_HIDE, this.endAttack, this);
        this.removeContactListener();
        this.endAttack();
        this.collider = null;
        this.hitTargets = null;
    }

    private onBeginContact(
        _selfCollider: Collider2D,
        otherCollider: Collider2D,
        _contact: IPhysics2DContact | null,
    ): void {
        if (!this.isAttacking || !otherCollider) {
            return;
        }

        this.tryHitCollider(otherCollider, this.activeAttackId);
    }

    private getCollider(): Collider2D | null {
        if (!this.collider?.isValid) {
            if (!this.isValid || !this.node?.isValid) {
                this.collider = null;
                return null;
            }
            this.collider = this.getComponent(Collider2D);
        }
        return this.collider?.isValid ? this.collider : null;
    }

    private removeContactListener(): void {
        const collider = this.collider;
        if (collider?.isValid) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    private finite(value: number): number {
        return Number.isFinite(value) ? value : 0;
    }

    private nonNegativeFinite(value: number): number {
        return Number.isFinite(value) ? Math.max(0, value) : 0;
    }

    private findHurtbox(node: Node): Hurtbox | null {
        let current: Node | null = node;
        while (current) {
            const hurtbox = current.getComponent(Hurtbox);
            if (hurtbox) {
                return hurtbox;
            }
            current = current.parent;
        }
        return null;
    }

    /** Catches colliders which were already overlapping when this attack was enabled. */
    private queryOverlaps(attackId: number): void {
        if (!this.isValid) {
            return;
        }
        const collider = this.getCollider();
        if (attackId !== this.activeAttackId
            || !this.enabledInHierarchy
            || !collider?.isValid
            || !collider.enabled) {
            return;
        }

        const overlaps = PhysicsSystem2D.instance.testAABB(collider.worldAABB);
        for (const overlap of overlaps) {
            // Re-check on every iteration in case receiving a hit ends or replaces the attack.
            if (attackId !== this.activeAttackId) {
                return;
            }
            this.tryHitCollider(overlap, attackId);
        }
    }

    private tryHitCollider(otherCollider: Collider2D, attackId: number): void {
        if (attackId === 0 || attackId !== this.activeAttackId || otherCollider === this.collider) {
            return;
        }

        const hurtbox = this.findHurtbox(otherCollider.node);
        const hitTargets = this.hitTargets;
        if (!hurtbox || !hitTargets || hitTargets.has(hurtbox)) {
            return;
        }

        // Reserve before dispatch so contacts and the overlap query cannot hit it twice.
        hitTargets.add(hurtbox);
        console.log(`[Hitbox] Hit target: ${hurtbox.node.name}`);
        hurtbox.receiveHit(this, attackId);
    }
}
