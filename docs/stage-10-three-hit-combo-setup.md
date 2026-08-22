# 阶段 3C：三段普通攻击连击配置与验收

## Inspector 参数

在玩家节点的 `PlayerCombat` 组件中继续绑定 `KeyboardInput`、`Hitbox`，并可选绑定用于显示攻击有效期的 `hitboxSprite`。原有字段仍用于 Attack1。

| 参数 | 推荐值 | 用途 |
| --- | ---: | --- |
| `attackActiveDuration` | 0.15 秒 | Attack1 有效时间 |
| `attackRecoveryDuration` | 0.25 秒 | Attack1 恢复时间 |
| `attack1Damage` | 10 | Attack1 伤害 |
| `attack2Damage` | 12 | Attack2 伤害 |
| `attack3Damage` | 18 | Attack3 伤害 |
| `attack2ActiveDuration` | 0.14 秒 | Attack2 有效时间 |
| `attack2RecoveryDuration` | 0.20 秒 | Attack2 恢复时间 |
| `attack3ActiveDuration` | 0.18 秒 | Attack3 有效时间 |
| `attack3RecoveryDuration` | 0.35 秒 | Attack3 恢复时间 |
| `comboInputWindow` | 0.16 秒 | 当前段结束前允许缓存下一段的时间 |

运行时会把异常、负数和非有限时间安全地按 0 处理。

## 时序与输入窗口

每段依次经历“有效时间 → 恢复时间”。Attack1 或 Attack2 距离整段结束（剩余有效时间加剩余恢复时间）不超过 `comboInputWindow` 时，再按一次攻击可缓存下一段。边界值包含在合法窗口内。恢复结束时，有缓存就立即进入下一段，否则回到空闲；Attack3 结束后始终回到空闲。

每段开始都会设置对应伤害并重新调用 `Hitbox.beginAttack()`，因此 Attack1、Attack2、Attack3 各自获得新的 `attackId`。一段内同一 Hurtbox 最多结算一次，但三段可分别命中同一敌人。每段有效时间结束都会调用 `Hitbox.endAttack()`。

窗口外输入、重复缓存输入和 Attack3 期间输入会当场丢弃，不会留给下一段或下一轮连击。攻击不锁定 `PlayerMotor`，因此攻击过程中仍可移动。

## 操作测试

1. 在空闲时点按 **J**，确认只开始 Attack1。
2. 在 Attack1 最后 0.16 秒内再次点按 **J**，确认日志依次显示 `Attack2 buffered`、`Attack2 started`。
3. 在 Attack2 的相同窗口内第三次点按，确认进入 Attack3，并在结束后显示 `Combo ended`。
4. 用屏幕 **AttackButton** 重复以上步骤；同一帧同时按 J 与 AttackButton 应只产生一次意图。
5. 持续按住 J 或 AttackButton，确认不会自动续出三段；每一段都必须有一次新的按下边缘。
6. 提前在合法窗口外按下一次，确认该输入不能续段，也不能延迟启动下一轮 Attack1。
7. 在 Attack3 期间继续按攻击，确认不会出现 Attack4；新一轮始终从 Attack1 开始。

## 伤害与生命周期验收

- 让三段都命中 `EnemyDebug`，通过 `DamageableHealthView` 确认生命依次减少 10、12、18，并确认受击闪烁、击退与生命归零后的死亡流程正常。
- 观察或调试每段 `Hitbox.attackId`，确认三次 ID 均非零且互不相同；确认单段持续重叠不会重复扣血。
- 分别以 30 FPS 和 60 FPS 运行上述连击测试，确认输入窗口、续段结果和伤害一致；另外用低帧率确认不会残留输入或卡死。
- 连击各阶段分别测试移动、跳跃、虚拟摇杆、JumpButton 与平台下穿，确认攻击没有锁定移动功能。
- 在攻击有效期、恢复期和已缓存状态分别切换场景、隐藏游戏或禁用/销毁相关节点，确认 Hitbox 关闭、调试 Sprite 隐藏、连击清空且控制台无销毁对象访问错误。

## 零时长边界测试

- 将 Attack1 的有效时间设为 0、恢复时间保持正数：按下攻击后应在同一帧关闭 Hitbox 并进入恢复状态，不能让攻击框残留一帧。
- 将 Attack1 的有效和恢复时间都设为 0：按下攻击后应在同一帧安全结束连击并回到空闲。
- 将三段的全部有效和恢复时间设为 0，并在可进入后续段的测试状态下检查每一段：状态推进必须受每帧转换上限保护，不递归、不死循环、不残留 Hitbox；Attack3 后仍必须结束，不能产生 Attack4。
- 恢复推荐的非零默认值后重新执行 30 FPS 与 60 FPS 测试，确认新开始攻击的首帧不会扣除正常 `dt`，默认攻击时序保持不变。

本阶段不包含动画、技能、无敌帧、玩家受伤、敌人 AI、音效、粒子、正式美术或 HUD 连击数字。
