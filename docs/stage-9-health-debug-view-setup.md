# 阶段 3C：可复用生命值文字显示配置

本阶段只添加调试用生命值文字，不修改 `TestLevel.scene`，也不实现正式美术血条、动画、受击闪白、击退移动、敌人 AI 或死亡表现。以下场景绑定需要在 Cocos Creator 3.8.8 编辑器中人工完成。

## 人工绑定

1. 打开 `TestLevel`，在 `EnemyDebug` 节点下创建子节点 `EnemyHealthLabel`。
2. 给 `EnemyHealthLabel` 添加 `Label` 组件，调整位置，使文字显示在敌人头顶。
3. 给 `EnemyHealthLabel` 添加 `DamageableHealthView` 组件。
4. 将 `EnemyDebug` 节点上的 `Damageable` 组件拖入 **Damageable** 属性。
5. 将 `EnemyHealthLabel` 自身的 `Label` 组件拖入 **Health Label** 属性。
6. 保持 **Prefix** 为默认值 `HP`。
7. 保存场景并运行预览。

组件启用时会立即读取当前生命值；它不依赖此前是否错过 `onLoad` 或 reset 通知，也不会在 `update()` 中轮询。

## 战斗与显示验证

1. 分别使用键盘 **J** 键和屏幕 **AttackButton** 攻击 `EnemyDebug`。
2. 确认生命值按 `30 → 20 → 10 → 0` 变化。
3. 确认死亡后显示 `HP 0 / 30 - DEAD`。
4. 调用 `EnemyDebug` 的 `Damageable.resetHealth()`，确认恢复显示 `HP 30 / 30`，并且可以再次受到攻击。
5. 长按攻击键或按钮，并在攻击恢复期连续按下，确认一次攻击窗口不会产生额外伤害。
6. 分别让玩家朝左、朝右，确认攻击范围随朝向正确翻转并只命中范围内目标。

## 回归检查

- 确认玩家移动和跳跃仍然正常。
- 确认平台下穿仍然正常。
- 在触屏设备或模拟环境中确认多点触控仍然正常，例如移动、跳跃与攻击组合输入互不干扰。

`DamageableHealthView` 缺少 `Damageable` 或 `Label` 引用时只会各警告一次并安全停止；补齐引用后重新启用组件即可恢复立即刷新和事件监听。
