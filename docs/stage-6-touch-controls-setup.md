# 第 6 阶段：微信小游戏触屏控制配置

本阶段为 1280×720 横屏的微信小游戏增加屏幕虚拟按键。按钮暂时使用简单色块和文字即可，正式像素 UI 后续替换。

## 节点与组件

1. 在 `Camera/HUD` 下创建空节点 `TouchControls`。HUD 位于 Camera 下，因此控件会保持屏幕固定。
2. 在 `TouchControls` 下创建 `LeftButton`、`RightButton`、`DownButton`、`JumpButton` 四个节点。
3. 给每个按钮添加 `UITransform` 和可见的 `Sprite`，并用文字标明功能。建议每个触摸区域约为 100×100，实际可按真机手感调整。
4. 推荐将左、右、下按钮放在屏幕左下区域，将 `JumpButton` 放在屏幕右下区域。按钮之间不要重叠。
5. 给 `TouchControls` 节点添加 `TouchControls` 组件。
6. 将 Player 节点上的 `KeyboardInput` 组件拖入 **Keyboard Input** 属性。
7. 将四个按钮节点分别拖入 **Left Button**、**Right Button**、**Down Button** 和 **Jump Button** 属性。

组件直接监听节点的 `TOUCH_START`、`TOUCH_END` 和 `TOUCH_CANCEL`。不要只依赖 Button 的 Click Events：Click 不能正确表达持续按住，也不适合“按住移动的同时按跳跃”等多点触控操作。

如果某个引用暂时未绑定，对应按钮会被安全跳过；建议发布前确认五个 Inspector 引用均已设置。

## 验收测试

在微信开发者工具和至少一台真机上验证：

- 按住左或右按钮时角色持续移动。
- 松开移动按钮后角色立即停止。
- 按住右移的同时按下 Jump，角色能向右跳跃；持续按住 Jump 不会连续触发跳跃，松开再按可以再次触发。
- 同时按住 Down 和 Jump 能主动下穿单向平台。
- 手指滑出按钮或系统产生 `TOUCH_CANCEL` 后，角色不会继续移动。
- 按下虚拟 Jump 后立即禁用 TouchControls 或离开场景，恢复后角色不会自动跳跃。
- 将小游戏切到后台再返回后，不保留移动、下蹲或跳跃输入。
- 返回 Start，再次进入 TestLevel 后没有残留输入或重复触摸响应。
- 原有键盘操作仍正常：A/← 左移、D/→ 右移、Space 跳跃、S/↓ + Space 主动下穿。
