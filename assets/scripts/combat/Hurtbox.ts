import { _decorator, Collider2D, Component, Enum } from 'cc';
import { Damageable } from './Damageable';
import type { Hitbox } from './Hitbox';
import { canDamageTeam, Team } from './Team';

const { ccclass, property, requireComponent } = _decorator;
const MAX_REMEMBERED_ATTACK_IDS = 128;

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
            console.log('[Hurtbox] Hit rejected: duplicate attack');
            return false;
        }
        if (!canDamageTeam(hitbox.team, this.team)) {
            console.log('[Hurtbox] Hit rejected: same team');
            return false;
        }

        const target = this.damageable;
        if (!target?.isValid) {
            console.log('[Hurtbox] Hit rejected: missing Damageable');
            return false;
        }

        // Keep a bounded insertion-ordered history: an unbounded Set would retain one entry
        // for every attack seen during a long session. Hitbox also guards its active attack,
        // so retaining the most recent IDs here provides cross-callback deduplication safely.
        this.rememberAttackId(attackId);
        return target.takeDamage(hitbox.damage, hitbox.getKnockback(this.node));
    }

    protected onDisable(): void {
        this.receivedAttackIds.clear();
    }

    protected onDestroy(): void {
        this.receivedAttackIds.clear();
        this.damageable = null;
    }

    private rememberAttackId(attackId: number): void {
        this.receivedAttackIds.add(attackId);
        if (this.receivedAttackIds.size <= MAX_REMEMBERED_ATTACK_IDS) {
            return;
        }

        const oldestAttackId = this.receivedAttackIds.values().next();
        if (!oldestAttackId.done) {
            this.receivedAttackIds.delete(oldestAttackId.value);
        }
    }
}
