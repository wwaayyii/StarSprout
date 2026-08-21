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

/** Data emitted whenever the current health value actually changes. */
export interface HealthChangedEvent {
    readonly previousHealth: number;
    readonly currentHealth: number;
    readonly maxHealth: number;
    readonly delta: number;
    readonly isDead: boolean;
}

/** Shared health and combat notifications for players and enemies. */
@ccclass('Damageable')
export class Damageable extends Component {
    public static readonly EVENT_DAMAGED = 'damaged';
    public static readonly EVENT_DIED = 'died';
    public static readonly EVENT_KNOCKBACK = 'knockback';
    public static readonly EVENT_RESET = 'reset';
    public static readonly EVENT_HEALTH_CHANGED = 'health-changed';

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
            this.emitHealthChanged(previousHealth);
            this.combatEvents.emit(Damageable.EVENT_DIED, this);
        } else {
            this.emitHealthChanged(previousHealth);
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
        const restoredHealth = this.health - previousHealth;
        if (restoredHealth > 0) {
            this.emitHealthChanged(previousHealth);
        }
        return restoredHealth;
    }

    /** Revives this component and restores it to its configured maximum health. */
    public resetHealth(): void {
        const previousHealth = this.health;
        this.maxHealth = this.getValidMaxHealth();
        this.health = this.maxHealth;
        this.dead = false;
        if (this.health !== previousHealth) {
            this.emitHealthChanged(previousHealth);
        }
        this.combatEvents.emit(Damageable.EVENT_RESET, this);
    }

    protected onDestroy(): void {
        this.combatEvents.removeAll();
    }

    private getValidMaxHealth(): number {
        return Number.isFinite(this.maxHealth) ? Math.max(1, this.maxHealth) : 1;
    }

    private emitHealthChanged(previousHealth: number): void {
        const event: HealthChangedEvent = {
            previousHealth,
            currentHealth: this.health,
            maxHealth: this.getValidMaxHealth(),
            delta: this.health - previousHealth,
            isDead: this.dead,
        };
        this.combatEvents.emit(Damageable.EVENT_HEALTH_CHANGED, event);
    }
}
