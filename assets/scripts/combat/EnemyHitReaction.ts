import {
    _decorator,
    Collider2D,
    Color,
    Component,
    ERigidBody2DType,
    RigidBody2D,
    Sprite,
    Vec2,
} from 'cc';
import { Damageable, KnockbackEvent } from './Damageable';
import { Hurtbox } from './Hurtbox';

const { ccclass, property } = _decorator;

interface HurtboxState {
    readonly hurtbox: Hurtbox;
    readonly hurtboxEnabled: boolean;
    readonly collider: Collider2D | null;
    readonly colliderEnabled: boolean;
}

/** Provides the visual, physics, and lifecycle reactions for a damageable enemy. */
@ccclass('EnemyHitReaction')
export class EnemyHitReaction extends Component {
    @property({ type: Damageable, tooltip: 'Enemy health component to observe.' })
    public damageable: Damageable | null = null;

    @property({ type: RigidBody2D, tooltip: 'Dynamic body that receives knockback.' })
    public rigidBody: RigidBody2D | null = null;

    @property({ type: Sprite, tooltip: 'Enemy artwork that flashes when damaged.' })
    public enemySprite: Sprite | null = null;

    @property({ min: 0, tooltip: 'Duration of the damage flash, in seconds.' })
    public flashDuration = 0.1;

    @property({ min: 0, tooltip: 'Delay before the dead enemy node becomes inactive.' })
    public deathDelay = 0.25;

    @property({ tooltip: 'Sprite color used during the damage flash.' })
    public flashColor = new Color(255, 210, 210, 255);

    private originalSpriteColor: Color | null = null;
    private hurtboxStates: HurtboxState[] = [];
    private listeningTo: Damageable | null = null;
    private wasRigidBodyEnabled = true;
    private rigidBodyStateCaptured = false;
    private deathHandled = false;
    private warnedMissingDamageable = false;
    private warnedMissingRigidBody = false;
    private warnedMissingSprite = false;
    private warnedNonDynamicBody = false;

    protected onLoad(): void {
        this.resolveReferences();
        this.captureInitialState();
    }

    protected onEnable(): void {
        this.cancelPendingReactions();
        this.resolveReferences();
        this.captureInitialState();
        this.startListening();
    }

    protected onDisable(): void {
        this.stopListening();
        this.cancelPendingReactions();
        this.restoreSpriteColor();
    }

    protected onDestroy(): void {
        this.stopListening();
        this.cancelPendingReactions();
    }

    private resolveReferences(): void {
        this.damageable ??= this.getComponent(Damageable);
        this.rigidBody ??= this.getComponent(RigidBody2D);
        this.enemySprite ??= this.getComponent(Sprite);

        if (!this.damageable && !this.warnedMissingDamageable) {
            this.warnedMissingDamageable = true;
            console.warn('[EnemyHitReaction] Damageable is not assigned or on this node.', this.node);
        }
        if (!this.rigidBody && !this.warnedMissingRigidBody) {
            this.warnedMissingRigidBody = true;
            console.warn('[EnemyHitReaction] RigidBody2D is not assigned or on this node.', this.node);
        }
        if (!this.enemySprite && !this.warnedMissingSprite) {
            this.warnedMissingSprite = true;
            console.warn('[EnemyHitReaction] Sprite is not assigned or on this node.', this.node);
        }
    }

    private captureInitialState(): void {
        if (!this.originalSpriteColor && this.enemySprite?.isValid) {
            this.originalSpriteColor = this.enemySprite.color.clone();
        }
        if (this.hurtboxStates.length === 0) {
            this.hurtboxStates = this.node.getComponentsInChildren(Hurtbox).map((hurtbox) => {
                const collider = hurtbox.getComponent(Collider2D);
                return {
                    hurtbox,
                    hurtboxEnabled: hurtbox.enabled,
                    collider,
                    colliderEnabled: collider?.enabled ?? false,
                };
            });
        }
        if (!this.rigidBodyStateCaptured && this.rigidBody?.isValid) {
            this.wasRigidBodyEnabled = this.rigidBody.enabled;
            this.rigidBodyStateCaptured = true;
        }
    }

    private startListening(): void {
        this.stopListening();
        if (!this.damageable?.isValid) {
            return;
        }

        this.listeningTo = this.damageable;
        const events = this.listeningTo.combatEvents;
        events.on(Damageable.EVENT_DAMAGED, this.onDamaged, this);
        events.on(Damageable.EVENT_KNOCKBACK, this.onKnockback, this);
        events.on(Damageable.EVENT_DIED, this.onDied, this);
        events.on(Damageable.EVENT_RESET, this.onReset, this);
    }

    private stopListening(): void {
        if (!this.listeningTo) {
            return;
        }
        const events = this.listeningTo.combatEvents;
        events.off(Damageable.EVENT_DAMAGED, this.onDamaged, this);
        events.off(Damageable.EVENT_KNOCKBACK, this.onKnockback, this);
        events.off(Damageable.EVENT_DIED, this.onDied, this);
        events.off(Damageable.EVENT_RESET, this.onReset, this);
        this.listeningTo = null;
    }

    private onDamaged(): void {
        if (this.deathHandled || !this.enemySprite?.isValid) {
            return;
        }

        this.unschedule(this.finishFlash);
        this.enemySprite.color = this.flashColor;
        this.scheduleOnce(this.finishFlash, Math.max(0, this.flashDuration));
    }

    private readonly finishFlash = (): void => {
        this.restoreSpriteColor();
    };

    private onKnockback(event: KnockbackEvent): void {
        if (this.deathHandled || !this.rigidBody?.isValid || !this.rigidBody.enabledInHierarchy) {
            return;
        }
        if (this.rigidBody.type !== ERigidBody2DType.Dynamic) {
            if (!this.warnedNonDynamicBody) {
                this.warnedNonDynamicBody = true;
                console.warn('[EnemyHitReaction] Knockback requires a Dynamic RigidBody2D.', this.node);
            }
            return;
        }

        // Hitbox's 5/3 values are authored as launch speeds. Assigning velocity keeps the
        // reaction independent of body mass and avoids treating those small values as impulses.
        this.rigidBody.linearVelocity = new Vec2(event.force.x, event.force.y);
    }

    private onDied(): void {
        if (this.deathHandled) {
            return;
        }
        this.deathHandled = true;
        this.disableDamageReception();

        if (this.rigidBody?.isValid) {
            this.rigidBody.linearVelocity = Vec2.ZERO;
            this.rigidBody.angularVelocity = 0;
            this.rigidBody.enabled = false;
        }

        this.unschedule(this.deactivateEnemy);
        this.scheduleOnce(this.deactivateEnemy, Math.max(0, this.deathDelay));
    }

    private readonly deactivateEnemy = (): void => {
        this.node.active = false;
    };

    private onReset(): void {
        this.cancelPendingReactions();
        this.deathHandled = false;
        this.node.active = true;
        this.restoreSpriteColor();
        this.restoreDamageReception();

        if (this.rigidBody?.isValid) {
            this.rigidBody.enabled = this.wasRigidBodyEnabled;
            this.rigidBody.linearVelocity = Vec2.ZERO;
            this.rigidBody.angularVelocity = 0;
            this.rigidBody.wakeUp();
        }
    }

    private disableDamageReception(): void {
        for (const state of this.hurtboxStates) {
            if (state.hurtbox.isValid) {
                state.hurtbox.enabled = false;
            }
            if (state.collider?.isValid) {
                state.collider.enabled = false;
            }
        }
    }

    private restoreDamageReception(): void {
        for (const state of this.hurtboxStates) {
            if (state.hurtbox.isValid) {
                state.hurtbox.enabled = state.hurtboxEnabled;
            }
            if (state.collider?.isValid) {
                state.collider.enabled = state.colliderEnabled;
            }
        }
    }

    private cancelPendingReactions(): void {
        this.unschedule(this.finishFlash);
        this.unschedule(this.deactivateEnemy);
    }

    private restoreSpriteColor(): void {
        if (this.enemySprite?.isValid && this.originalSpriteColor) {
            this.enemySprite.color = this.originalSpriteColor;
        }
    }
}
