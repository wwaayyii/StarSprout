# 第 3 阶段：横版摄像机本地配置

本阶段在 `TestLevel` 中扩展可行走区域，并让主摄像机平滑地横向跟随 `Player`。以下操作都在 Cocos Creator 3.8.8 编辑器内完成；提交代码时不需要手工创建或修改场景、Meta、项目设置或依赖文件。

## 1. 延长地面

1. 打开 `assets/scenes/TestLevel.scene`。
2. 在层级管理器中选择现有的 `Ground`。
3. 调大地面节点或其显示子节点的 X 方向宽度，使关卡宽度超过 1280 像素的单屏范围。
4. 同步调整地面的 `BoxCollider2D`：其 `Size` 应覆盖可见地面的完整宽度，`Offset` 应与地面中心对齐。
5. 保持地面刚体为静态类型，并确认碰撞分组仍能被 `Player` 的落地探针检测。

> 如果通过缩放延长地面，请检查碰撞体的实际边界。为了便于精确控制，通常更推荐直接修改精灵/UITransform 与碰撞体的宽度。

## 2. 创建多个平台

1. 复制已有 `Ground`，或新建若干平台节点。
2. 为每个平台配置可见图形、`RigidBody2D`（Static）和 `BoxCollider2D`。
3. 将平台放置在地面上方或水平方向更远的位置，并留出 Player 能够跳过的合理间距。
4. 确保平台碰撞体与画面中的平台表面贴合，并沿用 Ground 的碰撞分组。
5. 运行场景，逐个平台验证移动、起跳和落地检测。

## 3. 挂载并绑定 CameraFollow

1. 在资源管理器中找到 `assets/scripts/camera/CameraFollow.ts`，等待 Creator 完成脚本编译。
2. 在 `TestLevel` 层级管理器中选择负责游戏画面的 `Camera` 节点。
3. 在属性检查器中点击 **添加组件**，搜索并添加 `CameraFollow`。
4. 将层级管理器中的 `Player` 节点拖到组件的 **Target** 属性。
5. 保持 Camera 的 Y 坐标处于所需取景高度；组件启用时会记录该世界坐标 Y，运行期间只改变 X。
6. 根据构图设置 **Horizontal Offset**。正值让摄像机中心位于 Player 右侧，负值位于左侧。
7. 将 **Smooth Time** 先设为 `0.2` 秒，再根据实际手感微调。值越小跟随越紧，设为 `0` 时立即跟随。
8. **Snap On Start** 默认勾选。它会在进入场景时立即将 Camera 对准 Player 的目标 X，避免摄像机从编辑器保存的旧位置平滑追赶玩家；角色传送、复活或切换检查点后，也可以主动调用 `CameraFollow.snapToTarget()` 立即重新对准。

## 4. 设置摄像机边界

`Min X` 和 `Max X` 是摄像机节点的**世界坐标**边界，不是 Player 的移动边界。组件会把平滑计算后的摄像机 X 限制在该范围内。

对于 1280×720、正交摄像机的常见关卡，可按以下方式确定边界：

1. 先确定关卡可见内容的最左端 `levelLeft` 和最右端 `levelRight`。
2. 根据摄像机当前正交尺寸与视口比例确认水平半视野 `halfViewWidth`。
3. 设置 `Min X = levelLeft + halfViewWidth`。
4. 设置 `Max X = levelRight - halfViewWidth`。

这样摄像机到达两端时不会拍到关卡外区域。若关卡宽度小于一个完整视口，可将 `Min X` 与 `Max X` 设为同一个关卡中心值。即使误把 `Min X` 配得大于 `Max X`，组件也会安全地按较小值和较大值计算有效范围，但仍建议在 Inspector 中保持语义正确。

## 5. 固定屏幕 UI

`CameraFollow` 会移动 `Camera` 节点。如果 `Label` 和 `BackButton` 仍然直接放在 `Canvas` 下，它们不会跟随 Camera 移动，因而会在关卡摄像机滚动时偏离原有的屏幕相对位置。第一阶段的灰盒验证暂时采用以下节点结构：

```text
Canvas
├─ Camera
│  └─ HUD
│     ├─ Label
│     └─ BackButton
└─ World
   ├─ Ground
   └─ Player
```

1. 在 `Camera` 节点下创建名为 `HUD` 的空节点。
2. 将 `Label` 和 `BackButton` 移到 `HUD` 下。它们会随 Camera 一起移动，从而保持屏幕相对位置固定。
3. 更换父节点可能改变节点的本地坐标效果；移动后必须在编辑器中重新检查并调整 `Label` 和 `BackButton` 的本地位置。
4. `World`、`Ground` 和 `Player` 属于关卡世界，不得放入 `Camera` 或 `HUD` 下。
5. 后续正式 UI 系统可以改为独立的 UI Camera 和专用图层；当前灰盒阶段不增加第二台 Camera。

## 6. 运行验证

1. 从现有的 Boot → Start → TestLevel 流程进入测试关卡。
2. 保持 **Snap On Start** 勾选，确认进入 TestLevel 时 Camera 立即对准 Player，不会从旧位置平滑追赶；随后左右移动 Player，确认摄像机只在 X 轴平滑跟随，Y 高度不随跳跃改变。
3. 在多个平台间跳跃，确认画面没有因物理更新顺序产生明显抖动。
4. 分别走到关卡左右两端，确认 Camera X 不会越过 `Min X` 或 `Max X`。
5. 左右移动 Player 时，确认 `Label` 和 `BackButton` 始终固定在屏幕中的原有位置，不随关卡画面滚动。
6. 临时清空 `Target` 后运行，确认组件安全等待绑定且控制台不报错；验证后重新绑定 Player。
