import { _decorator, Collider2D, Component, Enum } from 'cc';
import { Damageable } from './Damageable';
import type { Hitbox } from './Hitbox';
import { canDamageTeam, Team } from './Team';

const { ccclass, property, requireComponent } = _decorator;

/** Receives and validates hit requests before forwarding them to health. */
@ccclass('Hurtbox')
@requireComponent(Collider2D)
export class Hurtbox extends Component {
    @property({ type: Enum(Team), tooltip: 'Faction of the Damageable that owns this hurtbox.' })
    public team = Team.Player;

    @property({ type: Damageable, tooltip: 'Health component that receives accepted hits.' })
    public damageable: Damageable | null = null;

    private readonly receivedAttackIds = new Set<number>();

    protected onLoad(): void {
        if (!this.damageable) {
            this.damageable = this.getComponent(Damageable)
                ?? this.node.parent?.getComponent(Damageable)
                ?? null;
        }
    }

    /** Attempts to accept one hit. Called by Hitbox contact handling. */
    public receiveHit(hitbox: Hitbox, attackId: number): boolean {
        if (!this.enabledInHierarchy || !hitbox || attackId <= 0) {
            return false;
        }
        if (this.receivedAttackIds.has(attackId)) {
            return false;
        }
        if (!canDamageTeam(hitbox.team, this.team)) {
            return false;
        }

        const target = this.damageable;
        if (!target?.isValid) {
            console.warn(`[Hurtbox] ${this.node.name} cannot receive attack ${attackId}: Damageable is not assigned or valid.`);
            return false;
        }

        // Record only a fully validated request. Damageable may still reject it when dead.
        this.receivedAttackIds.add(attackId);
        return target.takeDamage(hitbox.damage, hitbox.getKnockback());
    }

    protected onDisable(): void {
        this.receivedAttackIds.clear();
    }

    protected onDestroy(): void {
        this.receivedAttackIds.clear();
        this.damageable = null;
    }
}
