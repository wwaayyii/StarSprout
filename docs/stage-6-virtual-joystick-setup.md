# 第 6 阶段：虚拟摇杆配置

虚拟摇杆负责左侧移动和向下输入，右侧独立的 JumpButton 继续由 `TouchControls` 处理。两者监听不同节点，因此可以用两个手指同时操作。

## 节点结构

```text
Camera
└─ HUD
   └─ TouchControls
      ├─ JoystickBase
      │  └─ JoystickHandle
      └─ JumpButton
         └─ Label
```

## 配置步骤

1. 将 `JoystickBase` 放在屏幕左下角，建议尺寸为 160×160，并添加可见的 `Sprite` 和 `UITransform`。
2. 在其下创建 `JoystickHandle`，建议尺寸为 70×70，同样添加可见的 `Sprite` 和 `UITransform`。
3. 将 `JumpButton` 放在屏幕右下角，建议尺寸为 120×120。
4. 给 `JoystickBase` 添加 `VirtualJoystick` 组件。
5. 将 Player 上的 `KeyboardInput` 拖入 **Keyboard Input**，将 `JoystickHandle` 节点拖入 **Joystick Handle**。
6. 默认参数建议为 **Radius = 70**、**Dead Zone = 0.15**、**Down Threshold = -0.5**，可根据真机手感调整。
7. `TouchControls` 组件只需绑定 **Keyboard Input** 和 **Jump Button**；其 **Left Button**、**Right Button**、**Down Button** 可以保持为空。

## 验收测试

- 左右拖动摇杆时，角色向对应方向移动且朝向正确。
- 超过死区后，小幅拖动产生较慢移动，拖到边缘达到最大速度。
- 松开摇杆后 Handle 自动归中，角色停止移动。
- 摇杆向下并用另一只手按 Jump，角色主动下穿单向平台。
- 按住摇杆时，另一个手指可以正常操作 JumpButton。
- 第二根手指触碰摇杆区域时不会抢占第一根手指的控制。
- 收到 `TOUCH_CANCEL` 或小游戏切到后台后，Handle 和输入均复位，不残留移动或向下状态。
- 原有键盘操作仍正常：A/←、D/→、Space 以及 S/↓ + Space。
