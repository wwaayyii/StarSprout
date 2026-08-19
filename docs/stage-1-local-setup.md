# 阶段 1 本地接入与验证说明

本文说明如何在 Cocos Creator 3.8.8 编辑器中接入阶段 1 脚本。仓库没有修改任何场景文件；以下节点、组件、按钮和构建场景列表均需在本地编辑器中配置，再由 Cocos Creator 自动生成相应 `.meta` 文件。

## 1. 脚本挂载位置

等待 Cocos Creator 完成 `assets` 导入并确认控制台没有脚本编译错误，然后按下表挂载组件：

| 场景 | 建议节点 | 挂载组件 | 作用 |
| --- | --- | --- | --- |
| `Boot.scene` | `Canvas` | `BootLoader` | Boot 场景启动后自动加载 `Start` |
| `Start.scene` | `Canvas` | `StartView` | 暴露开始游戏按钮所需的 `startGame()` |
| `TestLevel.scene` | `Canvas` | `TestLevelView` | 暴露返回按钮所需的 `returnToStart()` |

具体操作：选中对应场景的 `Canvas` 节点，在属性检查器底部单击 **添加组件**，搜索组件类名并添加。`SceneService.ts` 是静态服务，不挂载到任何节点。

## 2. 在 Start 场景创建“开始游戏”按钮

1. 打开 `assets/scenes/Start.scene`。
2. 在层级管理器中右键 `Canvas`，选择 **创建 → UI 组件 → Button**。
3. 将按钮节点改名为 `StartButton`，调整位置和尺寸。
4. 修改按钮子节点中的 Label 文本为“开始游戏”。
5. 确认 `Canvas` 已挂载 `StartView`。
6. 选中 `StartButton`，在 Button 组件的 **Click Events** 区域单击 `+`。
7. 将层级管理器中的 `Canvas` 节点拖到 Click Event 的目标节点槽。
8. 组件下拉框选择 `StartView`，处理函数选择 `startGame`。
9. 保存场景。

运行时点击按钮会请求加载构建场景列表中名为 `TestLevel` 的场景。连续快速点击只会接受第一次请求，直到加载回调结束。

## 3. 在 TestLevel 场景创建“返回”按钮

1. 打开 `assets/scenes/TestLevel.scene`。
2. 在 `Canvas` 下创建一个 Button，将节点改名为 `BackButton`。
3. 将按钮 Label 改为“返回”。
4. 确认 `Canvas` 已挂载 `TestLevelView`。
5. 在 `BackButton` 的 Button 组件中新增一项 **Click Events**。
6. 将 `Canvas` 拖入目标节点槽。
7. 组件选择 `TestLevelView`，处理函数选择 `returnToStart`。
8. 保存场景。

## 4. 配置构建场景和启动场景

1. 在 Cocos Creator 顶部菜单打开 **项目 → 构建发布**。
2. 选择或新建微信小游戏构建任务。
3. 在 **构建场景** 区域依次加入：
   - `assets/scenes/Boot.scene`
   - `assets/scenes/Start.scene`
   - `assets/scenes/TestLevel.scene`
4. 将 `Boot.scene` 移到列表第一项。Cocos Creator 使用构建场景列表的第一项作为游戏启动场景。
5. 确认三个场景都已勾选，并且场景资产名严格为 `Boot`、`Start`、`TestLevel`。
6. 保存构建任务；需要微信包时再执行构建。

预览前也可以先在资源管理器中双击打开 `Boot.scene`，确保当前场景为 Boot 后再单击编辑器顶部的预览按钮。

## 5. 编辑器验证流程

1. 打开项目后等待资源导入完成，检查控制台无 TypeScript 编译错误和组件丢失提示。
2. 检查三个脚本组件都挂在上文指定的 `Canvas` 节点，两个按钮的 Click Events 目标、组件和方法正确。
3. 从 `Boot.scene` 启动预览，确认画面自动进入 Start 场景。
4. 点击“开始游戏”，确认只进入一次 TestLevel；快速连点不应产生重复加载报错。
5. 点击“返回”，确认回到 Start 场景。
6. 再重复步骤 4–5 至少三次，确认场景切换稳定且控制台无错误。
7. 在构建发布窗口选择微信小游戏并构建，使用微信开发者工具打开构建产物，重复完整流程。

如果点击没有响应，优先检查构建场景是否包含目标场景、场景名大小写、Click Events 的目标节点，以及目标节点上是否确实挂载了对应组件。
