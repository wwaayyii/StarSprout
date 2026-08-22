import { _decorator, Component, game, Game, Node, Size, Sprite, UITransform, Vec2, warn } from 'cc';
import { Damageable } from '../combat/Damageable';
import { Hitbox } from '../combat/Hitbox';
import { EnemyChaser, EnemyMovementLock } from './EnemyChaser';

const { ccclass, property } = _decorator;

export enum EnemyAttackPhase { Idle, Windup, Active, Recovery, DisabledDead }
const MAX_TRANSITIONS_PER_FRAME = 8;

/** Timed melee attack driver. Scene wiring is intentionally left to the Creator Inspector. */
@ccclass('EnemyCombat')
export class EnemyCombat extends Component {
    @property({ type: Node, tooltip: '要攻击的 Player 根节点。' }) public target: Node | null = null;
    @property({ type: EnemyChaser, tooltip: '同一 EnemyDebug 上的追逐组件。' }) public enemyChaser: EnemyChaser | null = null;
    @property({ type: Hitbox, tooltip: '物理根下 EnemyHitbox 的 Hitbox。' }) public hitbox: Hitbox | null = null;
    @property({ type: Sprite, tooltip: '可选：Active 期间显示的调试 Sprite。' }) public hitboxSprite: Sprite | null = null;
    @property({ min: 0 }) public attackRange = 90;
    @property({ min: 0 }) public verticalTolerance = 70;
    @property({ min: 0 }) public windupDuration = 0.25;
    @property({ min: 0 }) public activeDuration = 0.15;
    @property({ min: 0 }) public recoveryDuration = 0.60;
    @property({ min: 0 }) public damage = 10;
    @property({ type: Vec2 }) public hitboxOffset = new Vec2(55, 0);
    @property({ type: Size }) public hitboxSize = new Size(70, 55);
    @property({ min: 0 }) public horizontalKnockback = 4;
    @property({ min: 0 }) public verticalKnockback = 3;

    private currentPhase = EnemyAttackPhase.DisabledDead;
    private phaseRemaining = 0;
    private attackFacing: 1 | -1 = 1;
    private movementLock: EnemyMovementLock | null = null;
    private listeningTo: Damageable | null = null;
    private warnedMissing = false;

    public get phase(): EnemyAttackPhase { return this.currentPhase; }

    protected onEnable(): void {
        this.resolveReferences();
        this.listen();
        game.on(Game.EVENT_HIDE, this.cancelAttack, this);
        this.hideSprite();
        this.currentPhase = this.isOperational() ? EnemyAttackPhase.Idle : EnemyAttackPhase.DisabledDead;
    }

    protected update(deltaTime: number): void {
        if (!this.isOperational()) { this.disableCombat(); return; }
        if (this.currentPhase === EnemyAttackPhase.DisabledDead) this.currentPhase = EnemyAttackPhase.Idle;
        if (this.currentPhase === EnemyAttackPhase.Idle) {
            if (this.canStartAttack()) this.startWindup();
            else return;
        }
        this.advance(this.nonNegative(deltaTime));
    }

    protected onDisable(): void { this.cleanup(); }
    protected onDestroy(): void { this.cleanup(); this.target = null; this.enemyChaser = null; this.hitbox = null; this.hitboxSprite = null; }

    private startWindup(): void {
        const chaser = this.enemyChaser!;
        this.attackFacing = chaser.facing;
        this.movementLock = chaser.acquireMovementLock();
        this.currentPhase = EnemyAttackPhase.Windup;
        this.phaseRemaining = this.nonNegative(this.windupDuration);
    }

    private beginActive(): boolean {
        const hitbox = this.validHitbox();
        if (!hitbox) { this.cancelAttack(); return false; }
        const offset = new Vec2(Math.abs(this.finite(this.hitboxOffset?.x)) * this.attackFacing, this.finite(this.hitboxOffset?.y));
        const size = new Size(this.nonNegative(this.hitboxSize?.width), this.nonNegative(this.hitboxSize?.height));
        hitbox.damage = this.nonNegative(this.damage);
        hitbox.horizontalKnockback = this.nonNegative(this.horizontalKnockback);
        hitbox.verticalKnockback = this.nonNegative(this.verticalKnockback);
        if (!hitbox.setBoxBounds(offset, size)) { warn('[EnemyCombat] EnemyHitbox 需要 BoxCollider2D。'); this.cancelAttack(); return false; }
        this.syncSprite(offset, size);
        this.currentPhase = EnemyAttackPhase.Active;
        this.phaseRemaining = this.nonNegative(this.activeDuration);
        hitbox.beginAttack();
        if (this.hitboxSprite?.isValid) this.hitboxSprite.enabled = true;
        return true;
    }

    private advance(dt: number): void {
        let remaining = dt;
        for (let count = 0; count < MAX_TRANSITIONS_PER_FRAME && this.isAttackingPhase(); count += 1) {
            if (this.phaseRemaining > remaining) { this.phaseRemaining -= remaining; return; }
            remaining = Math.max(0, remaining - this.phaseRemaining);
            this.phaseRemaining = 0;
            if (this.currentPhase === EnemyAttackPhase.Windup) {
                if (!this.enemyChaser?.canAttack) {
                    // Hit-stun is operational but interrupts this swing. Invalid, disabled,
                    // or dead dependencies must remain DisabledDead until they recover.
                    if (this.isOperational()) this.cancelAttack();
                    else this.disableCombat();
                    return;
                }
                if (!this.beginActive()) return;
            } else if (this.currentPhase === EnemyAttackPhase.Active) {
                this.closeHitbox();
                this.currentPhase = EnemyAttackPhase.Recovery;
                this.phaseRemaining = this.nonNegative(this.recoveryDuration);
            } else {
                this.releaseMovement();
                this.currentPhase = EnemyAttackPhase.Idle;
                // A fully zero-duration attack may try again next frame, never spin or leave a hitbox open.
                if (this.windupDuration <= 0 && this.activeDuration <= 0 && this.recoveryDuration <= 0) return;
                if (this.canStartAttack()) this.startWindup(); else return;
            }
            if (remaining === 0 && this.phaseRemaining > 0) return;
        }
        if (this.currentPhase === EnemyAttackPhase.Active && this.phaseRemaining === 0) this.closeHitbox();
    }

    private canStartAttack(): boolean {
        if (!this.enemyChaser?.canAttack || !this.target?.isValid || !this.target.activeInHierarchy) return false;
        const health = this.getTargetDamageable();
        if (!health?.isValid || health.isDead) return false;
        const dx = Math.abs(this.target.worldPosition.x - this.node.worldPosition.x);
        const dy = Math.abs(this.target.worldPosition.y - this.node.worldPosition.y);
        return Number.isFinite(dx) && Number.isFinite(dy)
            && dx <= this.nonNegative(this.attackRange) && dy <= this.nonNegative(this.verticalTolerance);
    }

    private isOperational(): boolean {
        return Boolean(this.node?.isValid && this.enabledInHierarchy
            && this.target?.isValid && this.target.activeInHierarchy
            && this.enemyChaser?.isValid && this.enemyChaser.enabledInHierarchy
            && this.hitbox?.isValid && this.hitbox.enabledInHierarchy
            && this.listeningTo?.isValid && !this.listeningTo!.isDead
            && this.getTargetDamageable()?.isValid && !this.getTargetDamageable()!.isDead);
    }
    private isAttackingPhase(): boolean { return this.currentPhase >= EnemyAttackPhase.Windup && this.currentPhase <= EnemyAttackPhase.Recovery; }
    private validHitbox(): Hitbox | null { return this.hitbox?.isValid && this.hitbox.enabledInHierarchy ? this.hitbox : null; }
    private getTargetDamageable(): Damageable | null { return this.target?.getComponent(Damageable) ?? null; }

    private resolveReferences(): void {
        this.enemyChaser ??= this.getComponent(EnemyChaser);
        const health = this.getComponent(Damageable);
        if (!this.enemyChaser || !this.hitbox || !this.target || !health) {
            if (!this.warnedMissing) { this.warnedMissing = true; warn('[EnemyCombat] Target、EnemyChaser、Hitbox 和自身 Damageable 均为必填。'); }
        }
        this.listeningTo = health;
    }
    private listen(): void {
        const health = this.listeningTo;
        health?.combatEvents.on(Damageable.EVENT_DAMAGED, this.onInterrupted, this);
        health?.combatEvents.on(Damageable.EVENT_DIED, this.onDied, this);
    }
    private unlisten(): void {
        this.listeningTo?.combatEvents.off(Damageable.EVENT_DAMAGED, this.onInterrupted, this);
        this.listeningTo?.combatEvents.off(Damageable.EVENT_DIED, this.onDied, this);
    }
    private readonly onInterrupted = (): void => this.cancelAttack();
    private readonly onDied = (): void => this.disableCombat();
    private readonly cancelAttack = (): void => { this.closeHitbox(); this.releaseMovement(); this.currentPhase = EnemyAttackPhase.Idle; this.phaseRemaining = 0; };
    private disableCombat(): void { this.closeHitbox(); this.releaseMovement(); this.currentPhase = EnemyAttackPhase.DisabledDead; this.phaseRemaining = 0; }
    private cleanup(): void { game.off(Game.EVENT_HIDE, this.cancelAttack, this); this.unlisten(); this.disableCombat(); }
    private closeHitbox(): void { this.hitbox?.endAttack(); this.hideSprite(); }
    private releaseMovement(): void { this.movementLock?.release(); this.movementLock = null; }
    private hideSprite(): void { if (this.hitboxSprite?.isValid) this.hitboxSprite.enabled = false; }
    private syncSprite(offset: Vec2, size: Size): void {
        const sprite = this.hitboxSprite;
        if (!sprite?.isValid) return;
        sprite.getComponent(UITransform)?.setContentSize(size);
        // The recommended setup shares EnemyHitbox with Hitbox/Collider. Never move that
        // node to visualize the collider offset or the collider would receive it twice.
        if (sprite.node !== this.hitbox?.node) {
            sprite.node.setPosition(offset.x, offset.y, sprite.node.position.z);
        }
    }
    private finite(value: number | undefined): number { return Number.isFinite(value) ? value! : 0; }
    private nonNegative(value: number | undefined): number { return Number.isFinite(value) ? Math.max(0, value!) : 0; }
}
