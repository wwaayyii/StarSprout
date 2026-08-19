# 阶段 2：灰盒玩家移动与跳跃配置

本阶段只提供脚本，场景节点需要在 Cocos Creator 3.8.8 编辑器中手动创建。以下操作均在 `TestLevel` 场景完成，不会改变现有 Boot → Start → TestLevel 流程或返回按钮。

## 1. 准备 2D 物理

1. 打开 `TestLevel.scene`，确认场景仍使用 1280 × 720 的横屏 Canvas。
2. 在 **项目设置 → 功能裁剪** 中确认 2D Physics 没有被裁剪。
3. 使用项目已有的 2D 物理重力；推荐先采用 `(0, -320)`。若项目设置中的重力不同，可相应调整 PlayerMotor 的 `Gravity Scale` 与 `Jump Speed`。

> 本功能不要求添加摄像机跟随、动画或正式美术资源。

## 2. 创建 Player 节点和灰盒外观

1. 在场景根节点下创建空节点，命名为 `Player`，位置可先设为 `(0, -150, 0)`。
2. 保持 Player 的缩放为 `(1, 1, 1)`。`PlayerMotor` 会通过翻转 X 缩放表现朝向。
3. 在 Player 下创建 `Sprite` 子节点，命名为 `BodyVisual`。
4. 给 BodyVisual 添加 `Sprite` 与 `UITransform`：
   - `Content Size` 推荐 `48 × 80`；
   - 使用编辑器内置白色 SpriteFrame（或项目中已有的纯色白图）；
   - 将 Sprite 的 `Color` 设为灰色，例如 `#8A94A6`；
   - Anchor 保持 `(0.5, 0.5)`，位置保持 `(0, 0, 0)`。

这只是灰盒显示。不要为本步骤导入正式角色素材。

## 3. 配置 Player 的刚体和主体碰撞器

在 `Player` 节点添加以下组件：

### RigidBody2D

- `Type`: **Dynamic**
- `Allow Sleep`: 可保持开启
- `Gravity Scale`: `2`（运行时以 PlayerMotor Inspector 的值为准）
- `Linear Damping`: `0`
- `Angular Damping`: `0`
- `Fixed Rotation`: **开启**，避免角色碰撞后翻倒
- `Enabled Contact Listener`: **开启**，确保脚底 Sensor 能收到接触事件
- `Bullet`: 关闭即可

### BoxCollider2D

- `Size`: 推荐 `48 × 80`，与灰盒身体一致
- `Offset`: `(0, 0)`
- `Sensor`: **关闭**
- `Friction`: 推荐 `0`，避免墙面摩擦干扰下落
- `Restitution`: `0`
- `Density`: 可使用默认值
- `Group`/`Mask`: 必须允许与地面所在分组碰撞

主体 BoxCollider2D 用于实际阻挡；不要把它设为 Sensor。

## 4. 创建脚底 GroundSensor

1. 在 `Player` 下创建空子节点，命名为 `GroundSensor`。
2. 将其位置设在脚底略下方，例如 `(0, -42, 0)`。
3. 给该节点添加 `BoxCollider2D`：
   - `Size`: 推荐 `36 × 8`，宽度略窄于主体；
   - `Offset`: `(0, 0)`；
   - `Sensor`: **开启**；
   - `Group`/`Mask`: 必须允许检测 Ground 的碰撞分组。
4. 给同一节点添加 `GroundSensor` 脚本组件。

Sensor 与玩家主体属于同一个父级 RigidBody2D，不要在 GroundSensor 子节点上再添加 RigidBody2D。脚本用集合记录接触到的地面碰撞器，因此跨越两块地面时，即使先离开其中一块，也会在离开全部地面后才变为空中。

## 5. 创建 Ground

1. 在场景根节点下创建空节点，命名为 `Ground`，例如放在 `(0, -300, 0)`。
2. 可在 Ground 下创建带 `Sprite` 的子节点作为灰色色块：
   - `UITransform Content Size`: 推荐 `1000 × 60`；
   - 使用内置白色 SpriteFrame，并设置深灰色；
   - 不需要导入任何新图片。
3. 在 `Ground` 节点添加 `BoxCollider2D`：
   - `Size`: 与显示色块一致，例如 `1000 × 60`；
   - `Offset`: `(0, 0)`；
   - `Sensor`: **关闭**；
   - `Friction`: 推荐 `0`；
   - `Restitution`: `0`；
   - `Group`/`Mask`: 与 Player 主体及 GroundSensor 相互匹配。
4. Ground 可以只使用 BoxCollider2D（会作为静态碰撞体），也可添加 `RigidBody2D` 并明确设置 `Type = Static`。不要设置成 Dynamic。

需要多个平台时，可以复制 Ground；GroundSensor 会正确处理同时接触多个平台的情况。

## 6. 挂载和关联三个脚本

| 脚本 | 挂载节点 | 配置 |
| --- | --- | --- |
| `KeyboardInput.ts` | `Player` | 无需额外引用 |
| `PlayerMotor.ts` | `Player` | 关联 KeyboardInput 与脚底 GroundSensor |
| `GroundSensor.ts` | `Player/GroundSensor` | 与 Sensor BoxCollider2D 放在同一节点 |

具体操作：

1. 在 Player 上添加 `KeyboardInput` 组件。
2. 在 Player 上添加 `PlayerMotor` 组件。
3. 将 Player 自身的 KeyboardInput 组件拖到 PlayerMotor 的 `Keyboard Input` 属性。
4. 将 `Player/GroundSensor` 节点上的 GroundSensor 组件拖到 PlayerMotor 的 `Ground Sensor` 属性。
5. 推荐的 PlayerMotor 初始参数：
   - `Max Move Speed`: `260`
   - `Ground Acceleration`: `1800`
   - `Air Acceleration`: `900`
   - `Deceleration`: `2200`
   - `Jump Speed`: `620`
   - `Gravity Scale`: `2`

所有移动速度、加速/减速、跳跃速度和重力倍率都可在 Inspector 中调节。若未关联 Keyboard Input 或 Ground Sensor，PlayerMotor 会安全地停止驱动刚体。

## 7. 运行测试

1. 保存 TestLevel 场景并从 Boot 或 Start 正常进入 TestLevel，以确认既有场景流程不受影响。
2. 点击游戏预览区域使其获得键盘焦点。
3. 按住 `A` 或左方向键：玩家向左加速并朝左。
4. 按住 `D` 或右方向键：玩家向右加速并朝右。
5. 同时按住左右键：水平输入互相抵消，玩家减速。
6. 松开移动键：玩家按 `Deceleration` 平滑减速。
7. 玩家着地时按一次 `Space`：玩家跳跃；在空中反复按 Space 不应再次起跳。
8. 长按 Space：只触发一次跳跃；松开再按后，必须等玩家重新着地才能再次跳跃。
9. 让脚底同时跨在两块 Ground 上，再离开其中一块：玩家仍应保持着地，离开全部地面后才为空中。
10. 按返回按钮：应仍能回到 Start 场景。
11. 在按住移动键时切换浏览器标签页或让预览失焦，再返回：输入应已清空，不应出现“粘键”。

如果角色穿地，优先检查 Collider 的 Group/Mask、Ground 是否为静态碰撞体，以及 Player 的 RigidBody2D 是否为 Dynamic。如果不能跳跃，检查脚底 BoxCollider2D 是否开启 Sensor、`Enabled Contact Listener` 是否开启，以及 PlayerMotor 的 Ground Sensor 引用是否正确。
