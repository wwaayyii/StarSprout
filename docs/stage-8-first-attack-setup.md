# 阶段 3B（Stage 8）：第一段普通攻击配置

本阶段只加入一次按键对应一次的单段普通攻击。攻击不锁定移动，不包含连击、输入缓存、攻击动画、技能、敌人 AI、无敌帧、死亡表现或 HUD 血条。请勿修改或保存 `TestLevel.scene`；场景引用由人工在 Cocos Creator 3.8.8 编辑器中完成。

## 1. PlayerCombat 配置

1. 打开测试场景并选中 `Player`，添加 `PlayerCombat` 组件。
2. 将 Player 上已有的 `KeyboardInput` 拖入 **Keyboard Input**。
3. 将 `Player/BodyVisual/PlayerHitbox` 节点上的 `Hitbox` 拖入 **Hitbox**。
4. 保持默认时序：
   - **Attack Active Duration = 0.15 秒**：按下攻击后立即调用 `Hitbox.beginAttack()`，时间结束时调用 `Hitbox.endAttack()`。
   - **Attack Recovery Duration = 0.25 秒**：有效期结束后进入恢复期，恢复期结束前的新输入会被消费并拒绝，不会缓存到下一次攻击。
5. `PlayerHitbox` 保持 `damage = 10`。本阶段无需绑定 Animator，也无需修改 PlayerMotor；攻击期间仍可移动、跳跃和下穿平台。

若未绑定 Keyboard Input 或 Hitbox，`PlayerCombat` 会安全停止攻击，并在控制台只输出一次指出缺失引用的警告。禁用组件、销毁节点或游戏切到后台时，当前攻击框会立即关闭且时序状态会被清空。

## 2. 手机 AttackButton 配置

1. 在 `HUD/TouchControls` 下新建 `AttackButton`，按照 JumpButton 的 UI 尺寸与触摸区域设置，但放在不会遮挡 JumpButton 的位置。
2. 选中带有 `TouchControls` 组件的节点，把新节点拖入 **Attack Button**。该引用是可选的，未绑定不会报错。
3. AttackButton 只在 `TOUCH_START` 产生一次攻击边缘；`TOUCH_END` 和 `TOUCH_CANCEL` 只结束这次触摸，不会补发攻击。
4. 摇杆、JumpButton 和 AttackButton 使用各自节点的触摸事件，因此可用一根手指持续控制摇杆，同时用另一根手指攻击或跳跃。切后台、禁用或销毁 TouchControls 时会移除监听并清空虚拟输入。

## 3. 键盘与触屏验收

### 键盘 J

1. 在 PlayerHitbox 没有接触敌人时按一下 J，观察其 Collider 只启用约 0.15 秒，然后关闭。
2. 持续按住 J 超过一秒，确认只开始一次攻击；松开 J 后再次按下，确认可以产生下一次攻击。
3. 在第一次攻击有效期或随后约 0.25 秒恢复期内快速再次按 J，确认不开始第二次攻击；恢复结束后必须重新按下才会攻击，之前的输入不会缓存。

### 手机 AttackButton 与多点触控

1. 每次点按 AttackButton，确认触摸按下时仅攻击一次，松开或滑出按钮时不产生第二次攻击。
2. 长按 AttackButton，确认不会连续攻击；松开后再次点按才能产生新攻击。
3. 一根手指持续拖动虚拟摇杆，另一根手指点按 AttackButton，确认移动方向不归零且攻击正常。
4. 分别在持续摇杆输入时点按 JumpButton 和 AttackButton，确认跳跃、攻击和移动互不错误清除。
5. 攻击有效时切到后台再返回，确认攻击框已经关闭；重新触摸后输入正常且没有残留攻击。

## 4. 三次独立攻击伤害验收

1. 使用已配置的 `EnemyDebug`，设置 `maxHealth = 30`；确认敌方 Hurtbox 阵营为 Enemy，碰撞 Mask 可接收 PlayerHitbox。
2. 设置 `PlayerHitbox.damage = 10`，让敌人进入攻击范围。
3. 分别完整按下并松开 J 三次（或独立点按 AttackButton 三次），每次等待恢复期结束。
4. 确认三次生命变化依次为 `30 → 20 → 10 → 0`，第三次独立攻击后 EnemyDebug 死亡；每个有效窗口对同一 Hurtbox 仍只伤害一次。
5. 再用长按 J、长按 AttackButton 和恢复期内快速连按复测，确认都不能额外扣血。

## 5. 回归清单

- A/D 与左右方向键移动仍正常，键盘输入不会被手机攻击错误清除。
- Space 与 JumpButton 仍为边缘触发，长按不会重复跳跃。
- S/下方向键配合跳跃仍能从单向平台下穿。
- 虚拟摇杆的模拟量、左右按钮和 DownButton 行为不变。
- 攻击期间移动和跳跃不被锁定，且场景中没有新增攻击动画。
- 禁用/启用输入与战斗组件、切换场景及切后台后，没有残留监听、卡住的按键或仍启用的 Hitbox。

验收后关闭场景并放弃场景改动，避免提交 `TestLevel.scene` 或编辑器自动生成的 `.meta` 文件。
