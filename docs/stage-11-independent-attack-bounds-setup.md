# 阶段 3D：三段普通攻击独立范围配置与验收

本阶段只扩展三段普通攻击的范围配置，不改动连击状态机、伤害、输入缓存或移动逻辑。不要直接修改 `TestLevel.scene`；以下节点调整由开发者在 Cocos Creator 3.8.8 编辑器中完成。

## PlayerHitbox 节点准备

1. 选择 `Player/BodyVisual/PlayerHitbox`，将节点 Position 重置为 `(0, 0, 0)`。旧场景用节点 X = 45 表示 Attack1 的偏移；现在偏移统一由 `PlayerCombat` 写入 `BoxCollider2D.offset`，不重置会重复偏移。
2. 保留节点上的 `BoxCollider2D` 与 `Hitbox`；Collider 继续使用 Sensor 和既有 Group/Mask。
3. 保留 `PlayerHitbox/Sprite` 子节点，将其 `Sprite` 拖到 `PlayerCombat.hitboxSprite`。调试 Sprite 必须是 PlayerHitbox 的子节点，才能用本地位置准确显示 Collider Offset；其 `UITransform` 尺寸会随当前攻击框更新。
4. 无需手工维护 Collider 的 Offset/Size：每段开始时，`PlayerCombat` 会先安全结束旧窗口，写入本段范围，再调用 `beginAttack()`。

## Inspector 新增参数与推荐值

| 参数 | 推荐值 | 用途 |
| --- | ---: | --- |
| `attack1Offset` | `(45, 0)` | Attack1 BoxCollider2D Offset |
| `attack1Size` | `(60, 50)` | Attack1 BoxCollider2D Size |
| `attack2Offset` | `(55, 5)` | Attack2 BoxCollider2D Offset |
| `attack2Size` | `(80, 55)` | Attack2 BoxCollider2D Size |
| `attack3Offset` | `(70, 0)` | Attack3 BoxCollider2D Offset |
| `attack3Size` | `(110, 65)` | Attack3 BoxCollider2D Size |

Offset 的有限负数是有效配置；Offset 中的 `NaN`/`Infinity` 会按 0 处理。Size 的每个分量会独立规范化：负数、`NaN`、正负 `Infinity` 均按 0 处理，因此 Collider 不会收到负尺寸。零宽或零高允许用于安全边界测试，攻击时序仍会正常结束。

若 `Hitbox` 节点没有 `BoxCollider2D`、引用缺失、组件无效或运行时被禁用，本次攻击会安全取消。攻击结束，以及 `PlayerCombat`/`Hitbox` 被禁用或销毁、切换场景、游戏隐藏时，都会关闭 Collider、清空攻击状态并隐藏调试 Sprite。延迟到物理帧后的重叠查询仍通过 `attackId` 和组件有效性校验，旧攻击不会复活。

## Cocos Creator 验收步骤

1. 按“PlayerHitbox 节点准备”完成编辑器配置，运行 `TestLevel`；Inspector 确认六个新字段为推荐值。
2. 依次打出 Attack1、Attack2、Attack3。有效期内观察黄色 Sprite 与 Collider 调试轮廓分别为 `(45,0)/(60,50)`、`(55,5)/(80,55)`、`(70,0)/(110,65)`，结束后两者立即关闭/隐藏。
3. 让同一敌人分别只位于三段新增覆盖区域，确认各段范围独立；再确认伤害仍依次为 10、12、18，缓存窗口、移动、跳跃、触控和下穿平台行为不变。
4. 将各 Offset 分量依次测试负数、`NaN`、`Infinity`，将各 Size 分量依次测试负数、`NaN`、`Infinity` 和 0；确认控制台无异常、Size 不为负且零尺寸不误伤或残留。
5. 临时移除 `BoxCollider2D` 或清空 `hitbox`/`hitboxSprite` 引用，确认攻击被安全忽略或仅不显示调试图，不出现空引用错误；测试后恢复组件。
6. 分别在三段有效期、恢复期和缓存续段后禁用 `PlayerCombat`、禁用 `Hitbox`、销毁 PlayerHitbox/Player，并切换场景或让游戏进入后台，确认 Collider 关闭、Sprite 隐藏且返回后没有旧攻击。
7. 在 60 FPS、30 FPS 和低帧率模拟下完整打出三段，并把有效/恢复时间设为 0 做一次边界测试；确认大 `dt` 可跨越阶段但不死循环、不产生 Attack4、不残留攻击框。
8. 恢复所有推荐值，再完整回归键盘与触控三连击、伤害、受击反馈和移动功能。
