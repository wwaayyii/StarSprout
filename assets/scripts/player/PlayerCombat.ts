import { _decorator, Color, Component, game, Game, log, Size, Sprite, UITransform, Vec2, warn } from 'cc';
import { Hitbox } from '../combat/Hitbox';
import { KeyboardInput } from '../input/KeyboardInput';

const { ccclass, property } = _decorator;

enum AttackPhase {
    Idle,
    Active,
    Recovery,
}

const MAX_PHASE_TRANSITIONS_PER_FRAME = 8;

/** Drives the player's three-step normal-attack combo without locking movement. */
@ccclass('PlayerCombat')
export class PlayerCombat extends Component {
    @property(KeyboardInput)
    public keyboardInput: KeyboardInput | null = null;

    @property(Hitbox)
    public hitbox: Hitbox | null = null;

    @property({ type: Sprite, tooltip: 'Optional debug sprite shown while the attack hitbox is active.' })
    public hitboxSprite: Sprite | null = null;

    @property({ type: Vec2, tooltip: 'Attack1 攻击框相对 PlayerHitbox 节点的偏移。' })
    public attack1Offset = new Vec2(45, 0);

    @property({ type: Size, tooltip: 'Attack1 攻击框尺寸；运行时负数与异常值按 0 处理。' })
    public attack1Size = new Size(60, 50);

    @property({ type: Vec2, tooltip: 'Attack2 攻击框相对 PlayerHitbox 节点的偏移。' })
    public attack2Offset = new Vec2(55, 5);

    @property({ type: Size, tooltip: 'Attack2 攻击框尺寸；运行时负数与异常值按 0 处理。' })
    public attack2Size = new Size(80, 55);

    @property({ type: Vec2, tooltip: 'Attack3 攻击框相对 PlayerHitbox 节点的偏移。' })
    public attack3Offset = new Vec2(70, 0);

    @property({ type: Size, tooltip: 'Attack3 攻击框尺寸；运行时负数与异常值按 0 处理。' })
    public attack3Size = new Size(110, 65);

    @property({ min: 0, tooltip: 'Seconds for which the Attack1 Hitbox stays active.' })
    public attackActiveDuration = 0.15;

    @property({ min: 0, tooltip: 'Seconds after the Attack1 active window before its combo transition.' })
    public attackRecoveryDuration = 0.25;

    @property({ min: 0, tooltip: 'Damage dealt by Attack1.' })
    public attack1Damage = 10;

    @property({ min: 0, tooltip: 'Damage dealt by Attack2.' })
    public attack2Damage = 12;

    @property({ min: 0, tooltip: 'Damage dealt by Attack3.' })
    public attack3Damage = 18;

    @property({ min: 0, tooltip: 'Seconds for which the Attack2 Hitbox stays active.' })
    public attack2ActiveDuration = 0.14;

    @property({ min: 0, tooltip: 'Seconds after the Attack2 active window before its combo transition.' })
    public attack2RecoveryDuration = 0.20;

    @property({ min: 0, tooltip: 'Seconds for which the Attack3 Hitbox stays active.' })
    public attack3ActiveDuration = 0.18;

    @property({ min: 0, tooltip: 'Seconds after the Attack3 active window before the combo ends.' })
    public attack3RecoveryDuration = 0.35;

    @property({ min: 0, tooltip: 'Final seconds of active plus recovery time in which the next attack may be buffered.' })
    public comboInputWindow = 0.16;

    private phase = AttackPhase.Idle;
    private currentComboStep = 0;
    private phaseTimeRemaining = 0;
    private currentRecoveryDuration = 0;
    private bufferedNextAttack = false;
    private warnedMissingReferences = false;

    public get isAttacking(): boolean {
        return this.phase === AttackPhase.Active;
    }

    public get isRecovering(): boolean {
        return this.phase === AttackPhase.Recovery;
    }

    /** Zero while idle; otherwise the currently executing attack (1, 2, or 3). */
    public get comboStep(): number {
        return this.currentComboStep;
    }

    public get hasBufferedNextAttack(): boolean {
        return this.bufferedNextAttack;
    }

    public get isComboActive(): boolean {
        return this.currentComboStep !== 0;
    }

    protected onEnable(): void {
        game.on(Game.EVENT_HIDE, this.resetAttack, this);
        this.hideHitboxSprite();
        this.validateReferences();
    }

    protected update(dt: number): void {
        if (this.isComboActive && !this.getValidHitbox()) {
            this.resetAttack();
        }

        // Always consume exactly once. This merges simultaneous keyboard/touch edges and
        // ensures rejected input cannot leak into a later phase or combo.
        const keyboard = this.getValidKeyboardInput();
        const attackPressed = keyboard?.consumeAttackPressed() ?? false;
        const startedThisFrame = attackPressed && this.handleAttackPressed();

        // A newly pressed attack keeps its full positive-duration first frame, but still
        // normalizes zero-duration phases immediately so its Hitbox cannot linger a frame.
        this.advanceAttack(startedThisFrame ? 0 : this.nonNegative(dt));
    }

    protected onDisable(): void {
        game.off(Game.EVENT_HIDE, this.resetAttack, this);
        this.resetAttack();
    }

    protected onDestroy(): void {
        game.off(Game.EVENT_HIDE, this.resetAttack, this);
        this.resetAttack();
    }

    private handleAttackPressed(): boolean {
        if (!this.isComboActive) {
            if (this.validateReferences()) {
                this.startAttack(1);
                return this.isComboActive;
            }
            return false;
        }

        if (this.currentComboStep >= 3 || this.bufferedNextAttack || !this.isInComboInputWindow()) {
            return false;
        }

        this.bufferedNextAttack = true;
        log(`[PlayerCombat] Attack${this.currentComboStep + 1} buffered`);
        return false;
    }

    private startAttack(step: number): void {
        const hitbox = this.getValidHitbox();
        if (!hitbox) {
            this.resetAttack();
            return;
        }

        this.currentComboStep = step;
        this.bufferedNextAttack = false;
        this.currentRecoveryDuration = this.getRecoveryDuration(step);
        this.phase = AttackPhase.Active;
        this.phaseTimeRemaining = this.getActiveDuration(step);
        hitbox.damage = this.getDamage(step);
        const bounds = this.getAttackBounds(step);
        if (!hitbox.setBoxBounds(bounds.offset, bounds.size)) {
            warn(`[PlayerCombat] ${hitbox.node.name} 缺少 BoxCollider2D，攻击已安全取消。`);
            this.resetAttack();
            return;
        }
        this.syncHitboxSprite(bounds.offset, bounds.size);
        hitbox.beginAttack();
        this.showHitboxSprite();
        log(`[PlayerCombat] Attack${step} started`);
    }

    private advanceAttack(dt: number): void {
        let remainingDt = dt;
        for (let transitions = 0;
            this.isComboActive && transitions < MAX_PHASE_TRANSITIONS_PER_FRAME;
            transitions += 1) {
            if (this.phaseTimeRemaining > remainingDt) {
                this.phaseTimeRemaining -= remainingDt;
                return;
            }

            remainingDt = Math.max(0, remainingDt - this.phaseTimeRemaining);
            this.phaseTimeRemaining = 0;
            if (this.phase === AttackPhase.Active) {
                this.getValidHitbox()?.endAttack();
                this.hideHitboxSprite();
                this.phase = AttackPhase.Recovery;
                this.phaseTimeRemaining = this.currentRecoveryDuration;
            } else if (this.phase === AttackPhase.Recovery) {
                if (this.currentComboStep < 3 && this.bufferedNextAttack) {
                    this.startAttack(this.currentComboStep + 1);
                } else {
                    this.endCombo();
                }
            }

            if (remainingDt === 0 && this.phaseTimeRemaining > 0) {
                return;
            }
        }
    }

    private isInComboInputWindow(): boolean {
        const remaining = this.phase === AttackPhase.Active
            ? this.phaseTimeRemaining + this.currentRecoveryDuration
            : this.phaseTimeRemaining;
        return remaining <= this.nonNegative(this.comboInputWindow);
    }

    private getDamage(step: number): number {
        return this.nonNegative(step === 1 ? this.attack1Damage : step === 2 ? this.attack2Damage : this.attack3Damage);
    }

    private getActiveDuration(step: number): number {
        return this.nonNegative(step === 1
            ? this.attackActiveDuration
            : step === 2 ? this.attack2ActiveDuration : this.attack3ActiveDuration);
    }

    private getRecoveryDuration(step: number): number {
        return this.nonNegative(step === 1
            ? this.attackRecoveryDuration
            : step === 2 ? this.attack2RecoveryDuration : this.attack3RecoveryDuration);
    }

    private nonNegative(value: number): number {
        return Number.isFinite(value) ? Math.max(0, value) : 0;
    }

    private getAttackBounds(step: number): { offset: Vec2; size: Size } {
        const configuredOffset = step === 1
            ? this.attack1Offset : step === 2 ? this.attack2Offset : this.attack3Offset;
        const configuredSize = step === 1
            ? this.attack1Size : step === 2 ? this.attack2Size : this.attack3Size;
        return {
            offset: new Vec2(this.finite(configuredOffset?.x), this.finite(configuredOffset?.y)),
            size: new Size(
                this.nonNegative(configuredSize?.width),
                this.nonNegative(configuredSize?.height),
            ),
        };
    }

    private finite(value: number | undefined): number {
        return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }

    private validateReferences(): boolean {
        if (this.getValidKeyboardInput() && this.getValidHitbox()) {
            return true;
        }
        if (!this.warnedMissingReferences) {
            const missing = [
                !this.getValidKeyboardInput() ? 'KeyboardInput' : '',
                !this.getValidHitbox() ? 'Hitbox' : '',
            ].filter(Boolean).join('、');
            warn(`[PlayerCombat] ${this.node.name} 缺少 Inspector 引用：${missing}，攻击输入将被安全忽略。`);
            this.warnedMissingReferences = true;
        }
        return false;
    }

    private endCombo(): void {
        this.getValidHitbox()?.endAttack();
        this.hideHitboxSprite();
        this.phase = AttackPhase.Idle;
        this.currentComboStep = 0;
        this.phaseTimeRemaining = 0;
        this.currentRecoveryDuration = 0;
        this.bufferedNextAttack = false;
        log('[PlayerCombat] Combo ended');
    }

    private readonly resetAttack = (): void => {
        const hadCombo = this.isComboActive;
        this.getValidHitbox()?.endAttack();
        this.hideHitboxSprite();
        this.phase = AttackPhase.Idle;
        this.currentComboStep = 0;
        this.phaseTimeRemaining = 0;
        this.currentRecoveryDuration = 0;
        this.bufferedNextAttack = false;
        if (hadCombo) {
            log('[PlayerCombat] Combo ended');
        }
    };

    private getValidKeyboardInput(): KeyboardInput | null {
        return this.keyboardInput?.isValid ? this.keyboardInput : null;
    }

    private getValidHitbox(): Hitbox | null {
        return this.hitbox?.isValid && this.hitbox.enabledInHierarchy ? this.hitbox : null;
    }

    private showHitboxSprite(): void {
        if (!this.hitboxSprite?.isValid) {
            return;
        }
        this.hitboxSprite.color = new Color(255, 255, 0, 128);
        this.hitboxSprite.enabled = true;
    }

    private syncHitboxSprite(offset: Readonly<Vec2>, size: Readonly<Size>): void {
        const sprite = this.hitboxSprite;
        const hitbox = this.getValidHitbox();
        if (!sprite?.isValid || !hitbox) {
            return;
        }
        sprite.node.getComponent(UITransform)?.setContentSize(size.width, size.height);
        // The documented setup uses a Sprite child so its local position can mirror the
        // collider offset without moving the PlayerHitbox node itself.
        if (sprite.node !== hitbox.node) {
            sprite.node.setPosition(offset.x, offset.y, sprite.node.position.z);
        }
    }

    private hideHitboxSprite(): void {
        if (this.hitboxSprite?.isValid) {
            this.hitboxSprite.enabled = false;
        }
    }
}
