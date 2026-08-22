# 阶段 4A：基础敌人追逐 AI 配置与验收

本阶段新增 `EnemyChaser`，只负责地面水平追逐、停距、边缘与障碍检测；不包含攻击、跳跃、跨平台寻路或巡逻。Cocos Creator 3.8.8 的普通 `Component` 不会调度 `fixedUpdate`，所以脚本使用受支持的 `update(dt)` 驱动 AI，并通过 `RigidBody2D.linearVelocity` 移动；不会直接改位置，也不会覆盖垂直速度。加减速量按 `rate * dt` 计算，使 30/60 FPS 下的表现尽量一致。

> 按任务约束，本提交不修改 `TestLevel.scene` 或任何 `.meta`。首次用 Creator 打开项目后由编辑器导入脚本，再按下文手工挂载并保存到你自己的后续场景配置提交。

## EnemyDebug 节点配置

1. 在 `EnemyDebug` 下新建 `Visual` 子节点，把 `Sprite`（以及仅需跟随朝向的美术）移到该节点。根节点保留 `RigidBody2D`、实体 `BoxCollider2D`、`Damageable`、`Hurtbox`、`EnemyHitReaction` 和 `EnemyChaser`。不要对根节点、Collider 或 Hurtbox 使用负缩放。
2. 添加 `EnemyChaser`，设置：
   - **Target**：`Player`
   - **Detection Range**：`500`
   - **Stop Distance**：`75`
   - **Max Move Speed**：`2.5`
   - **Acceleration**：`15`
   - **Deceleration**：`20`
   - **Edge Check Distance**：`45`
   - **Edge Check Depth**：`80`
   - **Obstacle Check Distance**：`35`
   - **Stop Hysteresis**：`15`
   - **Hit Stun Duration**：`0.18`
   - **Visual Root**：上一步的 `Visual` 子节点（不能指定 `EnemyDebug` 根节点）
   - **Rigid Body / Damageable**：指定根节点现有组件；留空时脚本也会在同节点安全查找
3. `EnemyHitReaction.enemySprite` 重新指定到移动后的 `Visual/Sprite`，确保原有闪白、击退和死亡表现不变。

## RigidBody2D 与碰撞配置

- `EnemyDebug/RigidBody2D`：**Dynamic**、**Fixed Rotation 开启**、Gravity Scale `2`（当前场景敌人值；可按玩家手感调整），启用碰撞监听。实体 Collider 必须保持 `Sensor` 关闭。
- 当前 `Ground`、三个 `OneWayPlatform`、`Player` 与 `EnemyDebug` 的 Collider/Body 都使用 Group `1`；项目默认碰撞矩阵必须保持 Group `1` 与自身碰撞。这样动态敌人才能与地面、平台和玩家产生实体碰撞。
- `Ground` 没有刚体，平台为 Static RigidBody2D。下探射线只把“无刚体或 Static 刚体”的非 Sensor Collider 视为地面，因此玩家、敌人自身和 Hurtbox/Hitbox Sensor 不会被误判为落脚地面。
- 前探射线从敌人实体 Collider 边缘外开始，并显式排除自身节点树和全部 Sensor；实体墙、玩家及其他实体会让敌人停止。若项目以后拆分物理 Group/Mask，请确保地形仍可被射线查询，且敌人实体与地形/玩家的碰撞矩阵互通。
- **零值开关语义**：`Obstacle Check Distance <= 0` 表示完全关闭障碍检测，逻辑直接判定“无障碍”且不会发出零长度射线；`Edge Check Depth <= 0` 表示完全关闭边缘检测，逻辑直接判定“地面安全”。`Edge Check Distance = 0` 不是关闭开关，仍会在前脚附近下探。这些规则同样适用于运行时脚本传入的负值或非有限值（统一安全规整为 `0`）。
- 地面检测不再从 Collider 脚底接触边界起射：射线起点抬高 4 像素并穿过脚底表面，同时使用“前脚内侧”和“前方”两个下探点。成功命中后保留 `0.1s` ground grace，以吸收 Box2D 单帧漏检，但持续无地面仍会可靠停在边缘。
- `OneWayPlatform` 当前逻辑只对带 `PlayerMotor` 的动态刚体执行单向穿透规则；敌人不带 `PlayerMotor`，所以对敌人表现为实体平台，不会从下方穿越。阶段 4A 不实现敌人跨平台。

## 状态与击退

- **Idle**：目标水平距离超过 Detection Range，水平减速至零。
- **Chase**：目标在范围内且超过停止区，前方有静态地面、无实体障碍时追逐。
- **Stopping**：进入 Stop Distance，或边缘/障碍阻止前进时减速。离开该状态需要超过 `Stop Distance + Stop Hysteresis`，避免玩家跨越左右或停距边界时高频抖动。
- **DisabledDead**：死亡、引用失效、组件禁用或游戏隐藏时停止水平速度并停止追踪。
- `Damageable.EVENT_KNOCKBACK` 到达时进入默认 `0.18s` movement lock。锁定期间 AI 完全不写 `linearVelocity`，因此 `EnemyHitReaction` 写入的水平和垂直击退不会在下一物理帧被覆盖。死亡事件立即停止 AI；原有 `EnemyHitReaction` 仍负责 Hurtbox、闪烁、刚体禁用和延迟隐藏。
- 可在运行时只读查看 `EnemyChaser.state`。状态或停止原因发生变化时才输出诊断，原因明确区分 `TooFar`、`WithinStopDistance`、`NoGroundAhead`、`ObstacleAhead`、`InvalidReferences`、`Dead` 与 `HitStun`；状态和原因都不变时不会逐帧刷屏。进入 Chase 以及准备写入非零水平速度时都会调用 `RigidBody2D.wakeUp()`，因此 `Allow Sleep` 的开关不影响启动。
- 应用隐藏时会暂时进入 **DisabledDead**；收到 `Game.EVENT_SHOW` 后，引用有效、仍存活且刚体仍为 Dynamic 的敌人恢复到 **Idle**，下一次 `update(dt)` 可按距离进入 Chase。真正死亡的敌人不会因此复活。

## 手工验收步骤

1. 在 Creator 3.8.8 完成上述挂载，运行 `TestLevel`；确认控制台无缺失引用警告。
2. 玩家保持在 500 像素外：敌人为 Idle 且水平停止；进入范围后切换 Chase，30 FPS 与 60 FPS 下达到相同最大速度且无明显差异。
3. 从左右两侧接近并多次跨过 75 像素边界：敌人面向玩家，在 75 像素内停止，只有超过 90 像素才恢复追逐，不在边界高频左右翻转/抖动。
4. 将敌人放在 Ground 和每个可站立平台上，把玩家引向平台外：下探射线找不到前方静态地面时，敌人在边缘前停止，不主动走下去。
5. 在前方放置实体墙，再让玩家站在墙后：敌人停止且不持续顶墙抖动。确认 Hurtbox/Hitbox Sensor 不会让它误停。
6. 观察跳起、下落与落地全过程：AI 只改水平速度，垂直速度与重力正常；敌人不穿过 Ground、平台或 Player。
7. 用三段攻击从左右方向命中敌人：每次击退后的 0.18 秒内水平击退得到保留，血量、闪烁和生命文本照常更新。
8. 打空生命：敌人立即停止追逐，Hurtbox/刚体按既有死亡流程关闭并延迟隐藏。重新激活/重置、切场景、禁用组件后，无失效引用访问或残留水平移动。
9. 在敌人存活且可追逐时让应用失去焦点/进入后台，再恢复运行：隐藏时状态为 DisabledDead 且水平停止；恢复后状态先回到 Idle，并能再次进入 Chase。确认控制台仅在状态或停止原因改变时出现诊断，静止或持续追逐时不刷屏。

## 偶发不启动回归验收

原代码的具体阻断路径是：`update(dt)` 在目标满足距离条件后调用 `hasGroundAhead()`；该函数从 `worldAABB.yMin + 2` 向下、且只在 Collider 外侧的单一点发射射线。物理世界刚初始化、刚体睡眠或接触边界时，Box2D 偶发未返回地面命中，随后分支立即进入 `Stopping` 并持续写入零水平速度。与此同时 `Obstacle Check Distance = 0` 仍执行零长度 raycast，其结果依后端而不稳定；代码也从未主动唤醒刚体。三者叠加后，敌人可能在每帧探测/睡眠循环中一直停住，直到 F12、焦点或画布尺寸变化扰动物理时序。

修复后按以下矩阵验收（不需要修改 `TestLevel.scene`）：

1. 使用同一场景连续停止并重新运行 **至少 10 次**；每一次日志都必须稳定出现 `State=Chase Reason=None`，且敌人产生非零水平速度。
2. 分别在浏览器从未打开 F12、启动前已打开 F12、运行中开关 F12 三种情况下重复，结果必须一致。
3. `RigidBody2D.Allow Sleep` 分别开启和关闭，各执行上述重复运行测试；两者都必须可靠启动。
4. 以 30 FPS 和 60 FPS 各执行上述测试；两种帧率都必须进入 Chase，加速度继续按 `rate * dt` 计算。
5. 另测 `Obstacle Check Distance = 0`（无障碍射线）和 `Edge Check Depth = 0`（无边缘射线）的明确关闭语义；再恢复正值，确认墙和持续的平台缺口仍分别报告 `ObstacleAhead`、`NoGroundAhead`。
