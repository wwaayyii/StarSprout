import {
    _decorator,
    Collider2D,
    Component,
    Enum,
    ERaycast2DType,
    ERigidBody2DType,
    game,
    Game,
    Node,
    PhysicsSystem2D,
    RigidBody2D,
    Vec2,
} from 'cc';
import { Damageable, KnockbackEvent } from '../combat/Damageable';

const { ccclass, property, requireComponent } = _decorator;

/** Observable high-level state of the basic pursuit controller. */
export enum EnemyChaserState {
    Idle,
    Chase,
    Stopping,
    DisabledDead,
}

Enum(EnemyChaserState);

/** Basic, ground-bound pursuit AI. It deliberately has no attack or path finding. */
@ccclass('EnemyChaser')
@requireComponent(RigidBody2D)
export class EnemyChaser extends Component {
    @property({ type: Node, tooltip: 'Player node to pursue.' })
    public target: Node | null = null;

    @property({ min: 0, tooltip: 'Horizontal detection range in pixels.' })
    public detectionRange = 500;

    @property({ min: 0, tooltip: 'Distance at which horizontal pursuit stops, in pixels.' })
    public stopDistance = 75;

    @property({ min: 0, tooltip: 'Maximum horizontal speed in physics units per second.' })
    public maxMoveSpeed = 2.5;

    @property({ min: 0, tooltip: 'Pursuit acceleration in physics units per second squared.' })
    public acceleration = 15;

    @property({ min: 0, tooltip: 'Stopping acceleration in physics units per second squared.' })
    public deceleration = 20;

    @property({ min: 0, tooltip: 'Horizontal distance from the body edge used for the ground probe.' })
    public edgeCheckDistance = 45;

    @property({ min: 0, tooltip: 'Downward length of the ground probe, in pixels.' })
    public edgeCheckDepth = 80;

    @property({ min: 0, tooltip: 'Horizontal length of the obstacle probe, in pixels.' })
    public obstacleCheckDistance = 35;

    @property({ min: 0, tooltip: 'Extra distance required to leave Stopping, preventing boundary jitter.' })
    public stopHysteresis = 15;

    @property({ min: 0, tooltip: 'Seconds during which AI preserves knockback velocity.' })
    public hitStunDuration = 0.18;

    @property({ type: Node, tooltip: 'Visual-only child to flip. Never assign the physics root.' })
    public visualRoot: Node | null = null;

    @property({ type: RigidBody2D, tooltip: 'Dynamic enemy body; defaults to this node.' })
    public rigidBody: RigidBody2D | null = null;

    @property({ type: Damageable, tooltip: 'Enemy health; defaults to this node.' })
    public damageable: Damageable | null = null;

    private currentState = EnemyChaserState.DisabledDead;
    private listeningTo: Damageable | null = null;
    private bodyCollider: Collider2D | null = null;
    private hitStunRemaining = 0;
    private facingSign = 1;
    private visualBaseScaleX = 1;
    private warnedInvalidVisualRoot = false;
    private warnedConfiguration = false;
    private hasLoggedFirstChase = false;

    public get state(): EnemyChaserState {
        return this.currentState;
    }

    protected onLoad(): void {
        this.resolveReferences();
        this.captureVisualScale();
    }

    protected onEnable(): void {
        this.resolveReferences();
        this.captureVisualScale();
        this.startListening();
        game.on(Game.EVENT_HIDE, this.onGameHide, this);
        game.on(Game.EVENT_SHOW, this.onGameShow, this);
        this.hitStunRemaining = 0;
        this.hasLoggedFirstChase = false;
        this.setState(this.hasUsableReferences()
            ? EnemyChaserState.Idle
            : EnemyChaserState.DisabledDead);
    }

    protected update(deltaTime: number): void {
        if (!this.hasUsableReferences()) {
            this.enterDisabledState();
            return;
        }

        const body = this.rigidBody!;
        if (this.damageable!.isDead || body.type !== ERigidBody2DType.Dynamic) {
            this.enterDisabledState();
            return;
        }

        if (this.hitStunRemaining > 0) {
            this.hitStunRemaining = Math.max(0, this.hitStunRemaining - Math.max(0, deltaTime));
            return;
        }

        const deltaX = this.target!.worldPosition.x - this.node.worldPosition.x;
        const distance = Math.abs(deltaX);
        this.updateFacing(deltaX);

        let desiredSpeed = 0;
        if (distance > this.detectionRange) {
            this.setState(EnemyChaserState.Idle);
        } else if (this.shouldStopForTarget(distance)) {
            this.setState(EnemyChaserState.Stopping);
        } else {
            const direction = Math.sign(deltaX);
            if (direction !== 0 && this.hasGroundAhead(direction) && !this.hasObstacleAhead(direction)) {
                this.setState(EnemyChaserState.Chase);
                desiredSpeed = direction * this.maxMoveSpeed;
            } else {
                this.setState(EnemyChaserState.Stopping);
            }
        }

        const velocity = body.linearVelocity;
        const rate = desiredSpeed === 0 ? this.deceleration : this.acceleration;
        const nextX = this.moveTowards(velocity.x, desiredSpeed, Math.max(0, rate * deltaTime));
        // Preserve Y exactly: gravity, landing and knockback own vertical motion.
        body.linearVelocity = new Vec2(nextX, velocity.y);
    }

    protected onDisable(): void {
        game.off(Game.EVENT_HIDE, this.onGameHide, this);
        game.off(Game.EVENT_SHOW, this.onGameShow, this);
        this.stopListening();
        this.hitStunRemaining = 0;
        this.currentState = EnemyChaserState.DisabledDead;
        this.stopHorizontally();
    }

    protected onDestroy(): void {
        game.off(Game.EVENT_HIDE, this.onGameHide, this);
        game.off(Game.EVENT_SHOW, this.onGameShow, this);
        this.stopListening();
        this.hitStunRemaining = 0;
        this.currentState = EnemyChaserState.DisabledDead;
        this.rigidBody = null;
        this.damageable = null;
        this.target = null;
        this.visualRoot = null;
        this.bodyCollider = null;
    }

    private resolveReferences(): void {
        this.rigidBody ??= this.getComponent(RigidBody2D);
        this.damageable ??= this.getComponent(Damageable);
        this.bodyCollider = this.getComponents(Collider2D).find((collider) => !collider.sensor) ?? null;
        if ((!this.rigidBody || !this.damageable || !this.target) && !this.warnedConfiguration) {
            this.warnedConfiguration = true;
            console.warn('[EnemyChaser] Target, Dynamic RigidBody2D and Damageable are required.', this.node);
        }
    }

    private hasUsableReferences(): boolean {
        return Boolean(
            this.node?.isValid
            && this.target?.isValid
            && this.target.activeInHierarchy
            && this.rigidBody?.isValid
            && this.rigidBody.enabledInHierarchy
            && this.damageable?.isValid,
        );
    }

    private startListening(): void {
        this.stopListening();
        if (!this.damageable?.isValid) {
            return;
        }
        this.listeningTo = this.damageable;
        this.listeningTo.combatEvents.on(Damageable.EVENT_KNOCKBACK, this.onKnockback, this);
        this.listeningTo.combatEvents.on(Damageable.EVENT_DIED, this.onDied, this);
        this.listeningTo.combatEvents.on(Damageable.EVENT_RESET, this.onReset, this);
    }

    private stopListening(): void {
        if (!this.listeningTo) {
            return;
        }
        this.listeningTo.combatEvents.off(Damageable.EVENT_KNOCKBACK, this.onKnockback, this);
        this.listeningTo.combatEvents.off(Damageable.EVENT_DIED, this.onDied, this);
        this.listeningTo.combatEvents.off(Damageable.EVENT_RESET, this.onReset, this);
        this.listeningTo = null;
    }

    private readonly onKnockback = (_event: KnockbackEvent): void => {
        if (!this.damageable?.isDead) {
            this.hitStunRemaining = Math.max(0, this.hitStunDuration);
            this.currentState = EnemyChaserState.Stopping;
        }
    };

    private readonly onDied = (): void => {
        this.hitStunRemaining = 0;
        this.enterDisabledState();
    };

    private readonly onReset = (): void => {
        this.hitStunRemaining = 0;
        this.setState(EnemyChaserState.Idle);
    };

    private readonly onGameHide = (): void => {
        this.hitStunRemaining = 0;
        this.setState(EnemyChaserState.DisabledDead);
        this.stopHorizontally();
    };

    private readonly onGameShow = (): void => {
        this.resolveReferences();
        this.hitStunRemaining = 0;
        if (this.hasUsableReferences()
            && !this.damageable!.isDead
            && this.rigidBody!.type === ERigidBody2DType.Dynamic) {
            this.setState(EnemyChaserState.Idle);
        }
    };

    private enterDisabledState(): void {
        this.setState(EnemyChaserState.DisabledDead);
        this.stopHorizontally();
    }

    private setState(nextState: EnemyChaserState): void {
        if (this.currentState === nextState) {
            return;
        }
        this.currentState = nextState;
        if (nextState === EnemyChaserState.Chase && !this.hasLoggedFirstChase) {
            this.hasLoggedFirstChase = true;
            console.info('[EnemyChaser] Entered Chase.', this.node);
        }
    }

    private stopHorizontally(): void {
        const body = this.rigidBody;
        if (!body?.isValid || !body.enabledInHierarchy) {
            return;
        }
        const velocity = body.linearVelocity;
        body.linearVelocity = new Vec2(0, velocity.y);
    }

    private shouldStopForTarget(distance: number): boolean {
        const threshold = this.currentState === EnemyChaserState.Stopping
            ? this.stopDistance + this.stopHysteresis
            : this.stopDistance;
        return distance <= threshold;
    }

    private hasGroundAhead(direction: number): boolean {
        const collider = this.getBodyCollider();
        const physics = PhysicsSystem2D.instance;
        if (!collider?.isValid || !physics) {
            return false;
        }
        const bounds = collider.worldAABB;
        const x = direction > 0
            ? bounds.xMax + this.edgeCheckDistance
            : bounds.xMin - this.edgeCheckDistance;
        const start = new Vec2(x, bounds.yMin + 2);
        const end = new Vec2(x, start.y - this.edgeCheckDepth);
        return physics.raycast(start, end, ERaycast2DType.All)
            .some((result) => this.isTerrainCollider(result.collider));
    }

    private hasObstacleAhead(direction: number): boolean {
        const collider = this.getBodyCollider();
        const physics = PhysicsSystem2D.instance;
        if (!collider?.isValid || !physics) {
            return true;
        }
        const bounds = collider.worldAABB;
        const startX = direction > 0 ? bounds.xMax + 1 : bounds.xMin - 1;
        const endX = startX + direction * this.obstacleCheckDistance;
        const y = (bounds.yMin + bounds.yMax) * 0.5;
        return physics.raycast(new Vec2(startX, y), new Vec2(endX, y), ERaycast2DType.All)
            .some((result) => this.isBlockingCollider(result.collider));
    }

    private isTerrainCollider(collider: Collider2D): boolean {
        if (!this.isBlockingCollider(collider)) {
            return false;
        }
        const body = collider.body;
        return !body || body.type === ERigidBody2DType.Static;
    }

    private isBlockingCollider(collider: Collider2D): boolean {
        return Boolean(
            collider?.isValid
            && collider.enabledInHierarchy
            && !collider.sensor
            && !this.isOwnNode(collider.node),
        );
    }

    private isOwnNode(candidate: Node): boolean {
        let current: Node | null = candidate;
        while (current) {
            if (current === this.node) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    private getBodyCollider(): Collider2D | null {
        if (!this.bodyCollider?.isValid) {
            this.bodyCollider = this.getComponents(Collider2D).find((collider) => !collider.sensor) ?? null;
        }
        return this.bodyCollider?.isValid ? this.bodyCollider : null;
    }

    private updateFacing(deltaX: number): void {
        const sign = Math.sign(deltaX);
        if (sign === 0 || sign === this.facingSign) {
            return;
        }
        this.facingSign = sign;
        if (!this.visualRoot?.isValid || this.visualRoot === this.node) {
            if (this.visualRoot === this.node && !this.warnedInvalidVisualRoot) {
                this.warnedInvalidVisualRoot = true;
                console.warn('[EnemyChaser] Visual Root must be a visual-only child, not the physics root.', this.node);
            }
            return;
        }
        this.visualRoot.setScale(
            this.visualBaseScaleX * this.facingSign,
            this.visualRoot.scale.y,
            this.visualRoot.scale.z,
        );
    }

    private captureVisualScale(): void {
        if (this.visualRoot?.isValid && this.visualRoot !== this.node) {
            this.visualBaseScaleX = Math.abs(this.visualRoot.scale.x) || 1;
        }
    }

    private moveTowards(current: number, target: number, maxDelta: number): number {
        return Math.abs(target - current) <= maxDelta
            ? target
            : current + Math.sign(target - current) * maxDelta;
    }
}
