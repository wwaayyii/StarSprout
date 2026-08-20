# 第 6 阶段：虚拟摇杆配置

虚拟摇杆替代左、右、下三个按钮，同时保留独立的跳跃按钮，以支持双指移动和跳跃。

## 节点结构

```text
Camera/HUD/TouchControls
├─ JoystickBase
│  └─ JoystickHandle
└─ JumpButton
   └─ Label
```

## 组件配置

1. 为 `JoystickBase` 和 `JoystickHandle` 添加 `UITransform` 与可见的 `Sprite`，把 Handle 放在 Base 中心。
2. 在 `JoystickBase` 上添加 `VirtualJoystick` 组件。
3. 将 Player 上的 `KeyboardInput` 拖入 **Keyboard Input**，将 `JoystickHandle` 节点拖入 **Joystick Handle**。
4. 默认 **Radius** 为 `70`、**Dead Zone** 为 `0.15`、**Down Threshold** 为 `-0.5`；Radius 应与 Base 的可拖动半径相符。
5. `TouchControls` 组件只绑定 **Keyboard Input** 和 **Jump Button**。**Left Button**、**Right Button**、**Down Button** 均保持为空。

摇杆在 `TOUCH_START` 时锁定第一根手指，后续移动只响应同一触点；另一根手指仍可同时按 `JumpButton`。手指松开、触摸取消、组件禁用、场景销毁或小游戏进入后台时，Handle 都会归中并清除摇杆的水平和向下输入。

## 验收测试

- 向左或向右拖动时，角色速度随摇杆水平位移变化，Handle 不超出 Base 半径。
- 在中心死区内移动不会驱动角色；向下超过阈值后配合 Jump 可下穿单向平台。
- 操作摇杆时用第二根手指点击 Jump，角色可以正常跳跃，第二根手指不会抢占摇杆。
- 松开、取消触摸、切到后台或禁用节点后，Handle 归中且角色不再移动或保持向下输入。
- 键盘输入优先于摇杆，原有 A/←、D/→、S/↓、Space 操作仍正常。
