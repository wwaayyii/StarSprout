import { _decorator, Component, game, Game, warn } from 'cc';
import { Hitbox } from '../combat/Hitbox';
import { KeyboardInput } from '../input/KeyboardInput';

const { ccclass, property } = _decorator;

/** Drives the player's first normal attack without animation or input buffering. */
@ccclass('PlayerCombat')
export class PlayerCombat extends Component {
    @property(KeyboardInput)
    public keyboardInput: KeyboardInput | null = null;

    @property(Hitbox)
    public hitbox: Hitbox | null = null;

    @property({ min: 0, tooltip: 'Seconds for which the attack Hitbox stays active.' })
    public attackActiveDuration = 0.15;

    @property({ min: 0, tooltip: 'Seconds after the active window before another attack.' })
    public attackRecoveryDuration = 0.25;

    private activeTimeRemaining = 0;
    private recoveryTimeRemaining = 0;
    private warnedMissingReferences = false;

    public get isAttacking(): boolean {
        return this.activeTimeRemaining > 0;
    }

    public get isRecovering(): boolean {
        return this.recoveryTimeRemaining > 0;
    }

    protected onEnable(): void {
        game.on(Game.EVENT_HIDE, this.resetAttack, this);
        this.validateReferences();
    }

    protected update(dt: number): void {
        this.advanceAttack(Math.max(0, dt));

        const attackPressed = this.keyboardInput?.consumeAttackPressed() ?? false;
        if (!attackPressed || this.isAttacking || this.isRecovering) {
            return;
        }
        if (!this.validateReferences()) {
            return;
        }

        this.startAttack();
    }

    protected onDisable(): void {
        game.off(Game.EVENT_HIDE, this.resetAttack, this);
        this.resetAttack();
    }

    protected onDestroy(): void {
        game.off(Game.EVENT_HIDE, this.resetAttack, this);
        this.resetAttack();
    }

    private startAttack(): void {
        this.hitbox?.beginAttack();
        this.activeTimeRemaining = Math.max(0, this.attackActiveDuration);
        if (this.activeTimeRemaining === 0) {
            this.hitbox?.endAttack();
            this.recoveryTimeRemaining = Math.max(0, this.attackRecoveryDuration);
        }
    }

    private advanceAttack(dt: number): void {
        if (this.isAttacking) {
            const activeBefore = this.activeTimeRemaining;
            this.activeTimeRemaining = Math.max(0, activeBefore - dt);
            if (this.activeTimeRemaining === 0) {
                this.hitbox?.endAttack();
                const overflow = Math.max(0, dt - activeBefore);
                this.recoveryTimeRemaining = Math.max(0, this.attackRecoveryDuration - overflow);
            }
            return;
        }

        this.recoveryTimeRemaining = Math.max(0, this.recoveryTimeRemaining - dt);
    }

    private validateReferences(): boolean {
        if (this.keyboardInput && this.hitbox) {
            return true;
        }
        if (!this.warnedMissingReferences) {
            const missing = [
                !this.keyboardInput ? 'KeyboardInput' : '',
                !this.hitbox ? 'Hitbox' : '',
            ].filter(Boolean).join('、');
            warn(`[PlayerCombat] ${this.node.name} 缺少 Inspector 引用：${missing}，攻击输入将被安全忽略。`);
            this.warnedMissingReferences = true;
        }
        return false;
    }

    private readonly resetAttack = (): void => {
        this.hitbox?.endAttack();
        this.activeTimeRemaining = 0;
        this.recoveryTimeRemaining = 0;
    };
}
