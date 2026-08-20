# 第 4 阶段：配置横版单向平台

本阶段使用 `OneWayPlatform` 的 `PRE_SOLVE` 接触回调，让玩家向上跳时穿过平台，并在从平台上方向下落时恢复实体碰撞。该规则只作用于 `PlayerMotor` 节点层级内、使用 Dynamic `RigidBody2D` 的碰撞体；其他物体仍把平台视为普通实体。

## 玩家刚体配置

配置平台组件前，先在层级管理器中选择 `World/Player`，然后在 Player 的 `RigidBody2D` 组件中勾选 **Enabled Contact Listener**。

这是 Box2D 为该刚体生成 `PRE_SOLVE` 接触回调的必要条件。如果没有启用接触监听，`OneWayPlatform` 不会收到回调，也就无法在玩家向上穿越平台时禁用当帧接触。

## 给测试平台添加组件

在 Cocos Creator 3.8.8 中打开 `TestLevel`，依次对 `Platform01`、`Platform02`、`Platform03` 执行以下操作：

1. 选中平台节点，确认节点上已有 `BoxCollider2D`。
2. 在 `BoxCollider2D` 中关闭 **Sensor**。单向平台必须是实体碰撞体。
3. 添加 `RigidBody2D`，将 **Type** 设为 **Static**，并勾选 **Enabled Contact Listener**。
4. 点击 **添加组件**，搜索并添加 `OneWayPlatform`。
5. 保留初始参数开始测试：
   - **Upward Velocity Tolerance = 0.1**：只有明显向上运动时才忽略当帧接触，可过滤接近零的速度误差。
   - **Surface Tolerance = 2**：玩家脚底在平台顶面以下超过 2 像素时忽略接触，避免玩家从内部或底部被挡住；若边缘处出现轻微抖动，可小幅调整该值。

每个单向平台都必须同时具有非 Sensor 的 `BoxCollider2D`、Type 为 Static 且勾选 **Enabled Contact Listener** 的 `RigidBody2D`，以及 `OneWayPlatform`。不要为了单向效果把平台改成 Dynamic 刚体。

## 验收测试

运行 `TestLevel`，对三个平台分别检查：

1. **从下方穿越**：站在平台正下方向上跳。玩家应穿过平台底面，不应在底部卡住或被弹开。
2. **从上方落地**：跳到平台顶面以上后下落。玩家脚底到达顶面时应恢复碰撞并停在平台上。
3. **站立稳定**：在平台中央静止数秒，确认没有下沉、弹跳或反复穿透。
4. **边缘稳定性**：缓慢走到平台左右边缘、停留并走回，再从边缘附近跳起和落下；确认没有明显抖动或被侧边卡住。若只在临界位置出现物理误差，逐步微调 **Surface Tolerance**，每次调整后重新测试全部三项行为。
5. **普通实体**：用不属于 `PlayerMotor` 层级的动态物体碰撞平台，确认它仍与完整的 `BoxCollider2D` 正常碰撞。

## 故障排查

如果玩家仍然撞到平台底部，请依次检查：

1. 首先选择 `World/Player`，确认其 `RigidBody2D` 已勾选 **Enabled Contact Listener**。
2. 确认项目当前使用的 2D 物理系统为 **Box2D**。
3. 确认平台 `BoxCollider2D` 的 **Sensor** 已关闭。
4. 确认平台有 Type 为 Static 的 `RigidBody2D`，并已勾选 **Enabled Contact Listener**。
5. 确认 `OneWayPlatform` 与平台的 `BoxCollider2D` 位于同一个节点上。

## 当前范围

第 4 阶段只覆盖单向平台的基础碰撞配置；主动下穿操作参见第 5 阶段文档。
