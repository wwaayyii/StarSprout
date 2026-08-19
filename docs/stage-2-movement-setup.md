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
- `Enabled Contact Listener`: 本实现不依赖接触回调，可保持关闭
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

## 4. 创建脚底 GroundProbe

1. 在 `Player` 下创建空子节点，命名为 `GroundProbe`。
2. 将其放在主体碰撞器脚底附近，例如 `(0, -41, 0)`。探测射线从该节点的世界坐标开始向下发射。
3. **不要**给 GroundProbe 添加 `BoxCollider2D`、`RigidBody2D` 或任何 Sensor；它只是射线起点。
4. 只给 GroundProbe 添加 `GroundSensor` 脚本组件，并设置：
   - `Ground Mask`: 只勾选地面/平台使用的碰撞分组；默认 `0xffffffff` 会检测所有分组，搭建完成后推荐收窄；
   - `Ray Distance`: 推荐 `10` 像素，足以越过脚底与地面的微小间隙，但不应长到隔空着地；
   - `Probe Half Width`: 推荐 `16` 像素，应略小于主体碰撞器半宽。

GroundSensor 会从 GroundProbe 的左、中、右三个位置向下发射短射线。它会忽略 Sensor 类型碰撞器，并排除 Player 根节点及其全部子节点上的碰撞器，所以不依赖接触回调、`Enabled Contact Listener` 或同时接触计数。

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
   - `Group`/`Mask`: 与 Player 主体相互匹配，并包含在 GroundSensor 的 `Ground Mask` 中。
4. Ground 可以只使用 BoxCollider2D（会作为静态碰撞体），也可添加 `RigidBody2D` 并明确设置 `Type = Static`。不要设置成 Dynamic。

需要多个平台时，可以复制 Ground；三条射线可提高 Player 站在平台边缘时的着地稳定性。

## 6. 挂载和关联三个脚本

| 脚本 | 挂载节点 | 配置 |
| --- | --- | --- |
| `KeyboardInput.ts` | `Player` | 无需额外引用 |
| `PlayerMotor.ts` | `Player` | 关联 KeyboardInput、GroundSensor 与显示节点 |
| `GroundSensor.ts` | `Player/GroundProbe` | 只作为射线探测脚本，不需要物理组件 |

具体操作：

1. 在 Player 上添加 `KeyboardInput` 组件。
2. 在 Player 上添加 `PlayerMotor` 组件。
3. 将 Player 自身的 KeyboardInput 组件拖到 PlayerMotor 的 `Keyboard Input` 属性。
4. 将 `Player/GroundProbe` 节点上的 GroundSensor 组件拖到 PlayerMotor 的 `Ground Sensor` 属性。
5. 将 `Player/BodyVisual` 节点拖到 PlayerMotor 的 `Visual Root` 属性。PlayerMotor 只会翻转该显示节点，不会缩放带 RigidBody2D 的 Player 根节点；若留空，则不会执行朝向翻转。
6. 推荐的 PlayerMotor 初始参数：
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
9. 让 Player 逐渐移动到平台边缘：左、中、右射线中只要一条仍击中地面，玩家就应保持着地；全部射线离开平台后进入空中。
10. 在编辑器的 **项目 → 项目设置 → 物理 → 2D 物理** 中临时开启 Physics2D 的 **Debug Draw/调试绘制**，运行预览并确认 Player 与 Ground 的碰撞器边界和 GroundProbe 位置正确。调试绘制用于核对碰撞器，射线本身不会自动显示；验证完成后可关闭该选项，且本次提交不会改动 settings 文件。
11. 按返回按钮：应仍能回到 Start 场景。
12. 在按住移动键时切换浏览器标签页或让预览失焦，再返回：输入应已清空，不应出现“粘键”。

如果角色穿地，优先检查 Collider 的 Group/Mask、Ground 是否为静态碰撞体，以及 Player 的 RigidBody2D 是否为 Dynamic。如果不能跳跃，检查 GroundProbe 是否位于脚底、`Ground Mask` 是否包含地面分组、`Ray Distance` 是否足够，以及 PlayerMotor 的 Ground Sensor 引用是否正确。
