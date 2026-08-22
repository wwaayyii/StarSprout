# 阶段 4B：敌人近距离攻击配置与验收

本阶段只增加单次近战循环，不包含无敌帧、敌人连招、远程攻击、正式动画与音效。不要修改物理根或 `Visual` 的既有缩放关系。

## 阶段 4A 基线复核

- `EnemyDebug` 实体 `BoxCollider2D` 的 **Friction = 0**。
- `EnemyDebug` 的 `RigidBody2D` **Linear Damping = 0**。
- `EnemyChaser` 的 **Edge Check Distance = 20**。
- Player 与 Enemy 实体 Collider 接触时保持实体碰撞；攻击范围 `90` 大于追逐停止距离 `75`，配合已有迟滞避免边界高频切换。

## EnemyDebug / EnemyHitbox 节点

1. 在 **EnemyDebug 物理根节点**下新建 `EnemyHitbox`。它必须与 `Visual` 同级，绝不能放进会使用负 X 缩放的 `Visual`。
2. 为 `EnemyHitbox` 添加 `BoxCollider2D`：勾选 **Sensor**，初始禁用；尺寸与偏移可先任意，运行时由 `EnemyCombat` 原子更新。
3. 添加 `Hitbox`：**Team = Enemy**，Damage `10`，Horizontal Knockback `4`，Vertical Knockback `3`。Collider 监听由脚本管理。
4. 可在 `EnemyHitbox` 上添加黄色/橙色半透明 `Sprite` 与 `UITransform`，初始隐藏。将 Sprite 拖给 `EnemyCombat/Hitbox Sprite`；脚本仅在 Active 显示，并同步偏移与尺寸。
5. 确认 `PlayerHurtbox/Hurtbox` 的 **Team = Player**，且 Damageable 指向 Player 的 `Damageable`。

`Hitbox.beginAttack()` 每次生成新的 `attackId`；Hitbox 与 Hurtbox 两层去重保证同一 Active 窗口对 `PlayerHurtbox` 最多结算一次。

## EnemyCombat Inspector

在 `EnemyDebug` 根节点添加 `EnemyCombat`，配置：

| 属性 | 值 |
| --- | --- |
| Target | `Player` |
| Enemy Chaser | `EnemyDebug` 上的 `EnemyChaser` |
| Hitbox | `EnemyHitbox` 上的 `Hitbox` |
| Hitbox Sprite | 可选调试 Sprite |
| Attack Range / Vertical Tolerance | `90` / `70` |
| Windup / Active / Recovery Duration | `0.25` / `0.15` / `0.60` |
| Damage | `10` |
| Hitbox Offset / Size | `(55, 0)` / `(70, 55)` |
| Horizontal / Vertical Knockback | `4` / `3` |

所有时间、距离、伤害、偏移、尺寸与击退在运行时都会规整：NaN/Infinity 变为 `0`，需要非负的值取不小于 `0`。零时长阶段在同一 update 内关闭，不残留 Collider；全零循环最多每帧尝试一次。

## 状态机与移动协调

状态为 `Idle → Windup → Active → Recovery`；引用失效或死亡进入 `DisabledDead`。Windup 入口只读取一次 `EnemyChaser.facing`，因此玩家在攻击中绕后不会令本次 Hitbox 换边，下次 Windup 才采用新朝向。

Windup 获取 `EnemyChaser.acquireMovementLock()` 返回的独立、幂等释放令牌。多个系统的令牌分别存放，释放攻击令牌不会释放 hit-stun 或其他所有者；Windup、Active、Recovery 中追逐逻辑不写水平速度。受击、死亡、隐藏、禁用、销毁或引用失效会关闭 Hitbox、隐藏 Sprite，并重复安全地释放令牌。

## PlayerHealthLabel（复用现有组件）

1. 在 Canvas 或合适 UI 根下新建 `PlayerHealthLabel`，添加 `Label`。
2. 在同节点添加现有 `DamageableHealthView`，不要复制血条脚本。
3. **Damageable** 拖入 `Player` 的 `Damageable`，**Health Label** 拖入本节点 Label，Prefix 可填 `Player HP`。
4. 运行后应显示 `Player HP 100 / 100`，每次敌人命中减少 10，死亡后带 `DEAD`。

## Cocos Creator 3.8.8 手工验收

1. 打开 `TestLevel`，按上述步骤配置但不要改变 Player 移动、跳跃、下穿与 `PlayerCombat` 引用；运行并确认敌人在 90/70 范围外追逐、范围内停住并循环攻击。
2. 慢速观察：Windup 0.25 秒不可命中；Active 0.15 秒显示 Sprite 并只扣 10 HP；结束瞬间 Collider 与 Sprite 关闭；Recovery 0.60 秒后才可再攻击。
3. Windup 后让 Player 绕到另一侧：本次黄色框不换边；下一次攻击才换边。
4. Active 内持续重叠 PlayerHurtbox，确认本次只扣一次；下一轮 attackId 更新并可再次扣血、产生 `(±4, 3)` 击退。
5. 分别在 Windup、Active、Recovery 用玩家攻击命中敌人：敌方攻击立即取消，击退/hit-stun 期间不会因攻击锁释放而恢复追逐，锁定结束后正常追逐。
6. 分别禁用 `EnemyCombat`、禁用/销毁 EnemyDebug、切场景、隐藏游戏窗口、击杀敌人，确认 Hitbox 与 Sprite 立即关闭且恢复后无遗留移动锁。
7. 将三段时长逐个设为 0 及全部设为 0，再以低帧率/大 dt 测试；不得出现一帧残留命中、死循环或跨阶段悬挂。最后恢复默认值。
8. 在 30 FPS 与 60 FPS 各测试实体贴身、范围边界、平台边缘和玩家反复左右穿越，确认无日志刷屏、无高频抖动，且玩家三段连击、跳跃和平台下穿不受破坏。
