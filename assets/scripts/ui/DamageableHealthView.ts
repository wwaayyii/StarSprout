import { _decorator, Component, Label } from 'cc';
import { Damageable, HealthChangedEvent } from '../combat/Damageable';

const { ccclass, property } = _decorator;

/** Displays a Damageable's current health as reusable debug text. */
@ccclass('DamageableHealthView')
export class DamageableHealthView extends Component {
    @property({ type: Damageable, tooltip: 'Health component to observe.' })
    public damageable: Damageable | null = null;

    @property({ type: Label, tooltip: 'Label used to display health.' })
    public healthLabel: Label | null = null;

    @property({ tooltip: 'Text displayed before the health values.' })
    public prefix = 'HP';

    private listeningTo: Damageable | null = null;
    private warnedMissingDamageable = false;
    private warnedMissingLabel = false;

    protected onEnable(): void {
        this.stopListening();

        if (!this.damageable) {
            this.warnMissingDamageableOnce();
            return;
        }

        if (!this.healthLabel) {
            this.warnMissingLabelOnce();
            return;
        }

        this.listeningTo = this.damageable;
        this.listeningTo.combatEvents.on(
            Damageable.EVENT_HEALTH_CHANGED,
            this.onHealthChanged,
            this,
        );
        this.refresh();
    }

    protected onDisable(): void {
        this.stopListening();
    }

    protected onDestroy(): void {
        this.stopListening();
    }

    private onHealthChanged(_event: HealthChangedEvent): void {
        this.refresh();
    }

    private refresh(): void {
        if (!this.damageable) {
            this.warnMissingDamageableOnce();
            return;
        }
        if (!this.healthLabel) {
            this.warnMissingLabelOnce();
            return;
        }

        const deadSuffix = this.damageable.isDead ? ' - DEAD' : '';
        this.healthLabel.string = `${this.prefix} ${this.damageable.currentHealth} / ${this.damageable.maxHealth}${deadSuffix}`;
    }

    private stopListening(): void {
        if (!this.listeningTo) {
            return;
        }
        this.listeningTo.combatEvents.off(
            Damageable.EVENT_HEALTH_CHANGED,
            this.onHealthChanged,
            this,
        );
        this.listeningTo = null;
    }

    private warnMissingDamageableOnce(): void {
        if (!this.warnedMissingDamageable) {
            this.warnedMissingDamageable = true;
            console.warn('[DamageableHealthView] Damageable is not assigned.', this.node);
        }
    }

    private warnMissingLabelOnce(): void {
        if (!this.warnedMissingLabel) {
            this.warnedMissingLabel = true;
            console.warn('[DamageableHealthView] Label is not assigned.', this.node);
        }
    }
}
