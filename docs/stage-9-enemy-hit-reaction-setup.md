# Stage 9: Enemy hit reaction setup

This stage adds damage flash, velocity-based knockback, and a short death reaction without changing `Damageable`, `Hitbox`, or `Hurtbox` responsibilities.

## EnemyDebug Inspector setup

Do not edit `TestLevel.scene` as part of the script import. Open it in Cocos Creator 3.8.8 and configure the existing `EnemyDebug` node in the Inspector:

1. Add the **EnemyHitReaction** component to `EnemyDebug`.
2. Drag the enemy's **Damageable** into **Damageable**.
3. Drag its **RigidBody2D** into **Rigid Body** and use the current recommended physics settings: **Type = Dynamic**, **Gravity Scale = 2**, **Linear Damping = 8**, and **Fixed Rotation = enabled**.
4. Drag the **Sprite** used as the visible enemy artwork into **Enemy Sprite**. If that Sprite is on a child node, assigning it is required because automatic lookup only checks `EnemyDebug` itself.
5. Keep **Flash Duration = 0.1**, **Death Delay = 0.25**, and the default pale-red **Flash Color**, or tune them as needed.
6. Confirm the enemy's damage-receiving Collider2D has a **Hurtbox** component. Hurtboxes below `EnemyDebug` are collected by component type, never by node name.
7. On the enemy's solid **BoxCollider2D**, keep **Sensor = disabled** and set **Friction = 0.8**.
8. On the player's **Hitbox**, use **Horizontal Knockback = 2** and **Vertical Knockback = 1**.

The three primary references may be left empty only when their components are on the same node as `EnemyHitReaction`. Missing references produce one safe warning per reference.

## Editor/runtime test steps

1. Run `TestLevel` and use the existing player attack against `EnemyDebug`.
2. Confirm every accepted hit flashes the enemy pale red and restores its original Sprite color after about 0.1 seconds.
3. Land several hits less than 0.1 seconds apart. Confirm the latest hit restarts the flash timer and an older timer does not restore the color early.
4. Confirm knockback launches at the recommended Hitbox-authored velocity (horizontal `2`, vertical `1`) and does not rotate the fixed-rotation enemy.
5. Reduce HP to zero. Confirm the Hurtbox and its Collider2D stop receiving hits immediately, the final flash remains briefly visible, and `EnemyDebug` becomes inactive after about 0.25 seconds.
6. Confirm further knockback notifications do not move a dead enemy and repeated death notifications do not schedule additional cleanup.
7. To test reuse, reactivate `EnemyDebug` first if its death delay has elapsed, then call `Damageable.resetHealth()`. Confirm pending callbacks are cancelled, the original Sprite color returns, velocity is cleared, and the Rigidbody2D, Hurtbox, and Collider2D return to their initial enabled states.
8. Disable and re-enable `EnemyHitReaction` during a flash or before delayed deactivation. Confirm no stale scheduled callback runs and combat event listeners are not duplicated.

> Runtime physics, Inspector serialization, and scene lifecycle behavior must be verified in Cocos Creator because this repository does not include a headless Cocos Editor runtime.
