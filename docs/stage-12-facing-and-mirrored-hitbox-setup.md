# 阶段 3E：玩家朝向与攻击框左右翻转配置、验收

## 实现约定

- `PlayerMotor` 维护唯一的玩家朝向 `facing`：初始为 `1`（右），每帧复用已经合并键盘、虚拟方向按钮和虚拟摇杆的 `KeyboardInput.horizontal`；只有非零水平输入才写入 `1` 或 `-1`，松开后保留最后朝向。
- `PlayerMotor.visualRoot` 只绑定 `BodyVisual`。组件只改变该纯表现节点的本地 Scale.x，不改变 `Player` 根节点、`RigidBody2D`、移动速度或 `PlayerHurtbox`。
- 每一段攻击开始时，`PlayerCombat` 从 `PlayerMotor.facing` 取一次快照。Collider Offset.x 使用 `abs(Inspector 配置值) * 本段朝向`，Offset.y 和 Size 原样规范化；黄色 Sprite 使用同一个最终 Offset 和 Size。因此有效期内即使玩家转向，本段攻击框也不会换边，续段开始时才读取新朝向。
- 水平击退由 `Hitbox` 根据攻击节点与受击 `Hurtbox` 的世界 X 位置决定，不依赖节点负缩放；目标在左侧时为负，目标在右侧（或恰好同 X）时为正。配置的水平击退只作为幅值。

## Cocos Creator 3.8.8 配置

> 不要用 Player 根节点的负 Scale 翻转，也不要让 Collider 或 Hurtbox 留在会被负 Scale 继承的表现节点下。

1. 打开 `TestLevel`，保持 `Player` 的 Scale 为 `(1, 1, 1)`，并保持 `RigidBody2D`、玩家主体 `BoxCollider2D`、`PlayerHurtbox` 和 `GroundProbe` 不变。
2. 将 `PlayerHitbox` 从 `Player/BodyVisual` 移到 `Player` 下，保持其本地 Position 为 `(0, 0, 0)`、Scale 为 `(1, 1, 1)`。`PlayerHitbox/Sprite` 仍作为它的子节点。最终建议结构：

   ```text
   Player                         # 物理根，永不翻转
   ├─ BodyVisual                  # 只有角色 Sprite，允许 Scale.x ±1
   ├─ PlayerHitbox                # BoxCollider2D + Hitbox，永不继承负缩放
   │  └─ Sprite                   # 黄色调试 Sprite
   ├─ PlayerHurtbox               # 不翻转
   └─ GroundProbe
   ```

3. 在 `PlayerMotor` 中将 `Visual Root` 绑定为 `BodyVisual`。确认 `BodyVisual` 初始 Scale.x 的绝对值为期望美术缩放；运行时初始固定朝右。
4. 在 `PlayerCombat` 中将 `Player Motor` 绑定为同一 `Player` 上的 `PlayerMotor`，保留 `Keyboard Input`、`Hitbox` 与 `Hitbox Sprite` 原绑定。
5. 保持 Attack1/2/3 Offset 为 `(45,0)`、`(55,5)`、`(70,0)`，Size 为 `(60,50)`、`(80,55)`、`(110,65)`；伤害为 `10/12/18`，`Combo Input Window` 为 `0.22`。

代码没有修改 `TestLevel.scene` 或 `.meta`，上述节点重排和新增 Inspector 引用需要在编辑器中手工完成并由关卡维护者决定何时保存。

## 验收步骤

1. 启动时不输入，确认玩家朝右。按 A/左方向键后松开，确认 `BodyVisual` 朝左且保持；按 D/右方向键后同理恢复朝右。移动方向和刚体速度必须与按键一致。
2. 分别使用屏幕左右方向按钮与虚拟摇杆重复步骤 1；摇杆回中后保持最后一次非零方向。
3. 朝右完整打出三段，确认 Collider Offset/Size 依次为 `(45,0)/(60,50)`、`(55,5)/(80,55)`、`(70,0)/(110,65)`；黄色 Sprite 的位置和尺寸与物理调试轮廓重合。
4. 朝左重复三段，确认 Offset.x 依次为 `-45/-55/-70`，Offset.y 和 Size 不变，黄色 Sprite 同步到左侧。
5. 在 Attack1 有效期内立即反向移动：`BodyVisual` 应立刻转向，但 Attack1 Collider 和黄色 Sprite 在结束前不得瞬移；在合法窗口缓存 Attack2，确认 Attack2 开始时采用届时朝向。对 Attack2 → Attack3 重复验证。
6. 让左侧和右侧攻击分别命中敌人，确认水平击退分别向左、向右，垂直击退不变；三段伤害仍依次为 10、12、18。
7. 回归键盘 J、触控 AttackButton、同帧双来源输入、移动、跳跃、30/60 FPS 连击、平台下穿，以及 `Combo Input Window = 0.22`。
8. 在每段有效期与恢复期分别禁用/销毁 `PlayerCombat`、`Hitbox` 或 Player，切换场景并让游戏进入后台；确认 Collider 关闭、黄色 Sprite 隐藏、缓存清空，控制台无失效节点访问。
9. 临时把三个 Offset.x 配成负值，确认朝右仍使用其绝对值、朝左仍使用负绝对值。完成后恢复推荐值。
