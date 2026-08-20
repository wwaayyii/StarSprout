import { _decorator, Component, EventTarget, Vec2 } from 'cc';

const { ccclass, property } = _decorator;

/** Data emitted after health is reduced. */
export interface DamageTakenEvent {
    readonly amount: number;
    readonly currentHealth: number;
    readonly maxHealth: number;
}

/** Data emitted when a hit requests knockback. */
export interface KnockbackEvent {
    readonly force: Readonly<Vec2>;
}

/** Shared health and combat notifications for players and enemies. */
@ccclass('Damageable')
export class Damageable extends Component {
    public static readonly EVENT_DAMAGED = 'damaged';
    public static readonly EVENT_DIED = 'died';
    public static readonly EVENT_KNOCKBACK = 'knockback';
    public static readonly EVENT_RESET = 'reset';

    @property({ min: 1, tooltip: 'Maximum and initial health.' })
    public maxHealth = 100;

    /** Subscribe here for state-machine, animation, audio, and knockback reactions. */
    public readonly combatEvents = new EventTarget();

    private health = 100;
    private dead = false;

    public get currentHealth(): number {
        return this.health;
    }

    public get isDead(): boolean {
        return this.dead;
    }

    protected onLoad(): void {
        this.resetHealth();
    }

    /** Applies ordinary damage. Returns false when no health was changed. */
    public takeDamage(amount: number, knockback: Readonly<Vec2> = Vec2.ZERO): boolean {
        if (this.dead || !Number.isFinite(amount) || amount <= 0) {
            return false;
        }

        const previousHealth = this.health;
        this.health = Math.max(0, Math.min(this.getValidMaxHealth(), this.health - amount));
        const appliedDamage = previousHealth - this.health;
        if (appliedDamage <= 0) {
            return false;
        }

        const damageEvent: DamageTakenEvent = {
            amount: appliedDamage,
            currentHealth: this.health,
            maxHealth: this.getValidMaxHealth(),
        };
        this.combatEvents.emit(Damageable.EVENT_DAMAGED, damageEvent);

        if (knockback.x !== 0 || knockback.y !== 0) {
            const knockbackEvent: KnockbackEvent = { force: knockback.clone() };
            this.combatEvents.emit(Damageable.EVENT_KNOCKBACK, knockbackEvent);
        }

        if (this.health === 0 && !this.dead) {
            this.dead = true;
            this.combatEvents.emit(Damageable.EVENT_DIED, this);
        }
        return true;
    }

    /** Restores health without reviving a dead target. Returns the restored amount. */
    public heal(amount: number): number {
        if (this.dead || !Number.isFinite(amount) || amount <= 0) {
            return 0;
        }

        const previousHealth = this.health;
        this.health = Math.min(this.getValidMaxHealth(), this.health + amount);
        return this.health - previousHealth;
    }

    /** Revives this component and restores it to its configured maximum health. */
    public resetHealth(): void {
        this.maxHealth = this.getValidMaxHealth();
        this.health = this.maxHealth;
        this.dead = false;
        this.combatEvents.emit(Damageable.EVENT_RESET, this);
    }

    protected onDestroy(): void {
        this.combatEvents.removeAll();
    }

    private getValidMaxHealth(): number {
        return Number.isFinite(this.maxHealth) ? Math.max(1, this.maxHealth) : 1;
    }
}
