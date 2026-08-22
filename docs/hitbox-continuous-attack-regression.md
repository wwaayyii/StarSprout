# Hitbox 连续攻击回归

## 原因与修复

`Collider2D` 在目标持续重叠时反复禁用、启用，不保证 Box2D 为每个攻击窗口重新发送
`BEGIN_CONTACT`。旧实现只在 `beginAttack()` 时安排一次 `EVENT_AFTER_PHYSICS` 查询；如果该次查询的
时序早于有效重叠数据，之后整个 Active 窗口便没有补偿路径。

现在 `Hitbox` 组件在 `onEnable` 注册一个持久的 `EVENT_AFTER_PHYSICS` 监听，并在 `onDisable` 与
`onDestroy` 取消监听。监听只在 `isAttacking` 为 true 时调用 `testAABB`，并要求组件、Collider
有效且 Collider 已启用。`BEGIN_CONTACT` 仍作为即时路径；物理步后的重叠查询则覆盖攻击开始时
已经重叠、Active 中途进入，以及持续重叠跨越多轮攻击的情况。

查询会捕获当前 `attackId`。遍历每个重叠 Collider 前都会重新确认该 ID 仍是当前攻击，以应对
受击回调结束攻击或开启新攻击。`Hitbox.hitTargets` 在派发前记录 Hurtbox，`Hurtbox.receivedAttackIds`
再做第二层去重，因此一次攻击对一个 Hurtbox 最多结算一次，而下一次 `beginAttack()` 的新 ID
仍可再次命中。零时长 Active 若在物理步前结束，监听发现 `isAttacking=false`，不会产生幽灵命中。

## 手工回归步骤

在 Cocos Creator 3.8.8 打开项目。不要修改 `TestLevel.scene`；使用现有关卡配置运行预览，并在
控制台同时观察 `[Hitbox] Hit target`、`attackId`（调试器）和 HP。

1. **攻击开始时已重叠**：让玩家停在敌人攻击框内，保持不动；确认敌人每轮新 `attackId` 都命中一次。
2. **连续十轮**：以 100 HP、每次 10 点伤害验证十轮连续攻击，HP 应依次为
   `90, 80, 70, 60, 50, 40, 30, 20, 10, 0`，每轮只有一条命中结算。
3. **Active 中途进入**：攻击橙色 Sprite 出现后再进入攻击框；确认当轮命中且只扣 10 HP。
4. **跨轮持续重叠**：至少跨越三轮保持与攻击框重叠；每个新 ID 各扣一次，单轮不重复扣血。
5. **离开后重入**：离开攻击框，等待一轮，再进入；确认进入时所处的新 Active 窗口可正常命中。
6. **玩家三段攻击**：让三段都覆盖同一敌人；确认每一段的新 ID 可命中，但同一段在多个物理帧内
   只结算一次。
7. **零时长窗口**：令一次攻击在下一个物理步前调用 `endAttack()`；确认无命中、无扣血。
8. **组件生命周期**：禁用再启用 Hitbox，确认禁用期间不查询、不命中，启用后没有重复监听导致的
   重复结算；销毁节点后控制台无回调异常。
9. 分别以 **30 FPS、60 FPS** 以及 DevTools CPU throttling 模拟的低帧率重复步骤 1–6，结果应一致。

## 自动检查

提交前运行 TypeScript 编译检查（项目需要可解析 Cocos Creator 的 `cc` 类型），并用 `git diff --check`
检查空白错误。由于物理接触时序依赖 Cocos/Box2D，连续十轮、帧率切换以及伤害数值仍须按上节在
编辑器或目标设备上手工验证。
