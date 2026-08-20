# 阶段 3A（Stage 7）：通用战斗伤害底层配置

本阶段只配置可复用的阵营、攻击框、受击框和生命值，不包含攻击输入、动画、连击、无敌帧或角色状态机。请勿直接修改 `TestLevel.scene`；以下步骤由人工在 Cocos Creator 3.8.8 编辑器中完成。

## 1. 组件职责

- `Team`：统一定义 `Player`、`Enemy` 和 `Neutral`。默认只有不同阵营之间可以造成伤害，同阵营攻击会被忽略。
- `Damageable`：保存生命值并发出 `damaged`、`knockback`、`died`、`reset` 通知。死亡后拒绝普通伤害，调用 `resetHealth()` 可复用。
- `Hurtbox`：接收命中、按 `attackId` 去重、检查阵营，再把有效伤害转交给 `Damageable`。
- `Hitbox`：监听 `Collider2D` 的 `BEGIN_CONTACT`。只有 `beginAttack()` 到 `endAttack()` 之间有效，每次 `beginAttack()` 都创建新的唯一 `attackId`。

## 2. Player 受击配置

1. 打开测试场景，选中 `World/Player` 根节点。
2. 添加 `Damageable`，将 **Max Health** 暂设为 `100`。
3. 建议在 Player 下新建 `Hurtbox` 子节点，使受击范围可以独立于移动碰撞体调整。
4. 给子节点添加 `BoxCollider2D`（也可按角色轮廓选 `CapsuleCollider2D`），勾选 **Sensor**，调整尺寸覆盖身体。
5. 给子节点添加 `Hurtbox`：
   - **Team**：`Player`
   - **Damageable**：拖入 Player 根节点上的 `Damageable`
6. 若没有显式拖入引用，脚本只会尝试当前节点及直属父节点；正式场景应显式赋值，避免层级调整后失效。

## 3. 临时攻击节点配置

1. 在 Player 下新建 `DebugAttack` 子节点，将它放在角色前方。
2. 添加 `BoxCollider2D`，勾选 **Sensor**，尺寸设为容易观察接触的临时攻击范围。
3. 添加 `Hitbox`：
   - **Team**：`Player`
   - **Damage**：例如 `10`
   - **Horizontal Knockback**：例如 `5`
   - **Vertical Knockback**：例如 `3`
4. 攻击方向取攻击节点的世界缩放 X 符号；角色朝左时应让该节点随表现根节点翻转，或将攻击节点世界缩放 X 变为负数。
5. 临时测试脚本或编辑器按钮必须显式调用 `beginAttack()` 开启有效期，并调用 `endAttack()` 关闭。脚本会随攻击窗口启用/禁用 Collider；仅启用节点或组件不会自动造成伤害。
6. 每次重新调用 `beginAttack()` 都会先结束旧窗口、创建新 ID 并重新启用 Collider，因此目标已经位于范围内时也会建立新接触。

## 4. Collider2D、Group、Mask 与 Sensor 建议

在 **项目设置 → 物理 → 2D → 碰撞矩阵** 中先建立或确认以下分组（名称可按项目规范调整）：

| 用途 | Group | Mask（只勾选） | Sensor |
| --- | --- | --- | --- |
| 玩家移动实体 | `PLAYER` | 地形、单向平台 | 否 |
| 敌人移动实体 | `ENEMY` | 地形、单向平台 | 否 |
| 玩家受击框 | `PLAYER_HURTBOX` | `ENEMY_HITBOX` | 是 |
| 敌人受击框 | `ENEMY_HURTBOX` | `PLAYER_HITBOX` | 是 |
| 玩家攻击框 | `PLAYER_HITBOX` | `ENEMY_HURTBOX` | 是 |
| 敌人攻击框 | `ENEMY_HITBOX` | `PLAYER_HURTBOX` | 是 |

注意：

- 碰撞矩阵用于减少无关的物理回调，`Team` 检查是逻辑层的第二道保护；两者都应正确配置。
- Hitbox 和 Hurtbox 的 Collider2D 都推荐为 Sensor，避免攻击判定改变角色移动或挤开目标。
- 接触双方至少一侧所在节点层级必须具备可参与 2D 物理接触的 `RigidBody2D`。Player 已有动态刚体；单独测试静态敌人时，可在敌人根节点添加合适类型的 `RigidBody2D`。
- 不要让移动实体 Collider 的 Mask 勾选攻击框/受击框，否则会产生不必要的实体碰撞。
- `Neutral` 仍可与 Player/Enemy 互相造成伤害；若某类中立物体应完全免疫，请通过碰撞 Mask 排除，或后续扩展统一阵营策略，不要在单个角色脚本中硬编码。

## 5. 完整编辑器验收步骤

建议复制场景或在未保存的场景修改中验收，测试完成后不要提交场景和自动生成的 `.meta` 文件。

1. **准备目标**：按第 2 节配置 Player；复制一个简单节点作为 Enemy，添加 `RigidBody2D`、Sensor Collider、`Damageable(maxHealth = 30)` 和 `Hurtbox(team = Enemy)`。
2. **准备攻击**：按第 3 节给 Player 配置攻击节点，设置 `team = Player`、`damage = 10`。
3. **无有效期安全性**：不调用 `beginAttack()`，让攻击框接触 Enemy；确认 Enemy 生命仍为 `30`，控制台无异常。
4. **单次命中**：分离双方，调用 `beginAttack()` 后再接触；确认生命从 `30` 变为 `20`，只收到一次 `damaged` 和一次 `knockback` 通知。
5. **同攻击去重**：保持当前攻击有效，反复离开并再次进入同一个 Hurtbox；确认生命仍为 `20`。
6. **新攻击可再次命中**：调用 `endAttack()`，分离双方，再调用 `beginAttack()` 并接触；确认生命变为 `10`，且新的 `attackId` 与上一次不同。
7. **死亡只触发一次**：再开启一次新攻击命中，确认生命为 `0`、`isDead = true`，且 `died` 只通知一次；继续用新攻击命中，确认生命不再变化，也不重复死亡通知。
8. **重置复用**：调用 Enemy 的 `resetHealth()`，确认生命回到 `30`、`isDead = false`，随后新攻击能再次造成伤害。
9. **治疗与边界**：在未死亡时调用 `heal(999)`，确认不超过 `maxHealth`；调用负数/非有限伤害或治疗值，确认安全拒绝；伤害量大于当前生命时确认生命不低于 `0`。
10. **同阵营过滤**：临时把 Enemy Hurtbox 的 Team 改为 `Player`，以新攻击接触，确认生命不变；恢复为 `Enemy` 后可再次受伤。
11. **缺失引用**：清空 Hurtbox 的 Damageable 引用，并把 Hurtbox 放到没有 Damageable 的父节点下；命中时确认输出包含节点名和 attackId 的清晰警告，且游戏不崩溃。
12. **击退方向通知**：监听 `Damageable.combatEvents` 的 `knockback`，确认朝右时 X 为正；将攻击节点世界缩放 X 翻为负后，确认 X 为负而 Y 保持配置值。本阶段只验证通知，不要求实际移动刚体。
13. **禁用清理**：攻击有效时禁用再启用 Hitbox 组件，确认旧攻击失效且必须重新调用 `beginAttack()`；禁用再启用 Hurtbox 后确认不会保留旧场景/旧生命周期的去重记录。
14. **场景切换**：攻击有效时切换场景再返回，确认没有残留接触回调、重复伤害或控制台异常。
15. **回归**：完整检查键盘与虚拟摇杆移动、跳跃、单向平台落地和“下 + 跳”下穿，确认 Sensor 战斗框不改变既有移动碰撞。
16. **真机/预览**：分别在浏览器预览和目标微信小游戏真机重复步骤 3–8，特别观察快速接触时是否保持一次命中。

验收后关闭场景且不保存测试改动。本阶段代码只提供战斗底层；后续由攻击状态/动画事件控制攻击窗口，由角色状态机订阅伤害、死亡和击退通知。
