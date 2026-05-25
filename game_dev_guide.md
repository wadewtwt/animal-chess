# 斗兽棋（Animal Chess）前端开发与 Cocos Creator 搭建指南

本项目第一阶段（前端单机版）的核心逻辑和美术资源已全部就绪。本文件为您汇总了游戏的核心规则、技术代码结构、Cocos Creator（英文版）保姆级搭建步骤，以及在开发过程中遇到的常见避坑指南，供您本地查阅与后续开发参考。

---

## 一、 游戏核心规则与逻辑设定

### 1. 棋盘与特殊地形
* **棋盘大小**：7列 × 9行 的网格。
* **小河（River）**：中央两块 2×3 的水域（纵向第 4、5、6 行，横向第 2、3 列与第 5、6 列）。
* **兽穴（Den）**：双方底线正中间（红方 `x=3, y=0`，蓝方 `x=3, y=8`）。**己方棋子绝对不能进入己方兽穴**。
* **陷阱（Trap）**：环绕在各自兽穴周围的 3 个格子（红方 `(2,0), (4,0), (3,1)`；蓝方 `(2,8), (4,8), (3,7)`）。

### 2. 棋子战力与特殊克制
* 战力等级：**象(8) > 狮(7) > 虎(6) > 豹(5) > 狼(4) > 狗(3) > 猫(2) > 鼠(1)**。
* **象与鼠克制**：老鼠可以吃大象（仅限陆地上），大象在任何情况下都不能吃老鼠。
* **陷阱削弱**：敌方棋子走进己方陷阱时，其等级瞬间视作 **0**，己方任意棋子（包括猫、鼠）均可吃掉它。离开后恢复。

### 3. 特殊地形移动限制
* **老鼠下河**：只有“鼠”可以进入河道。
  * 岸上与河里不能互吃。
  * 河里的老鼠可以互吃。
* **狮虎跳河**：狮、虎可以横向或纵向跳过整条小河。
  * **阻挡规则**：如果跳河直线的河道格子里有任意一方的老鼠，则跳河被阻挡，无法跳跃。

### 4. 胜负与和棋判定
1. **直捣黄龙**：己方棋子走进对方兽穴，立即获胜。
2. **全军覆没**：吃光对方所有棋子，立即获胜。
3. **困毙（无路可走）**：轮到对方回合时，若对方所有剩余棋子均无法执行任何合法移动，则判定己方获胜。
4. **5次重复局面判和**：如果棋盘上连续出现 **5次完全相同的局面**（所有棋子的位置与轮到行棋的一方完全一致），系统自动判定为**和局**。

---

## 二、 工作区文件结构

在 `/Users/wt/work/ai/animal-chess/animal-chess-client` 中，已为您编写并放置了以下核心代码和贴图资源：

```
animal-chess-client/
├── assets/
│   ├── textures/
│   │   └── animals/           # 2D 扁平绘本风全身动物插图 (已通过 AI 生成)
│   │       ├── rat.png        # 鼠
│   │       ├── cat.png        # 猫
│   │       ├── dog.png        # 狗
│   │       ├── wolf.png       # 狼
│   │       ├── leopard.png    # 豹
│   │       ├── tiger.png      # 虎
│   │       ├── lion.png       # 狮
│   │       └── elephant.png   # 象
│   └── scripts/
│       ├── engine/
│       │   └── LocalEngine.ts # 核心规则引擎 (纯 TS 逻辑类，不依赖 Cocos)
│       └── ui/
│           ├── PieceView.ts   # 棋子视图组件 (控制棋子选中、平滑移动、被吃动画)
│           └── BoardView.ts   # 棋盘控制器 (控制网格生成、点击高亮、胜负弹窗)
```

---

## 三、 Cocos Creator (3.8.x 英文版) 搭建保姆级步骤

### 1. 初始化资源属性
1. 在左下角 **Assets** 面板中，进入 `assets -> textures -> animals`。
2. **按住 Shift 键全选** 8 张动物图片，在右侧 **Inspector** 面板中，将 **Type** 从 `Default` 改为 **`sprite-frame`**，并点击底部的 **`Apply`** 按钮。

### 2. 创建 Canvas 节点与切换 2D 视角
1. 在左上角 **Hierarchy** 面板中右键，选择 **Create -> UI -> Canvas**。
2. 在中间场景编辑器的左上角，点击 `3D` 按钮将其切换为 **`2D` 模式**，方便可视化排版。

### 3. 制作“棋子预制体” (Piece Prefab)
1. 在 Hierarchy 中右键点击 **`Canvas`**，选择 **Create -> 2D Object -> Sprite**，重命名为 **`Piece`**。
2. 右键点击 **`Piece`** 节点，选择 **Create -> 2D Object -> Sprite**，重命名为 **`Base`** (底座)。
3. 再次右键点击 **`Piece`**，选择 **Create -> 2D Object -> Sprite**，重命名为 **`Animal`** (全身图)。
4. 再次右键点击 **`Piece`**，选择 **Create -> 2D Object -> Label**，重命名为 **`NameLabel`**。
5. 选中 Hierarchy 中的 **`Piece`**，把左下角 Assets 里的 **`PieceView.ts`** 脚本拖入右侧 **Inspector** 挂载。
6. 在 Inspector 的 `PieceView` 组件上，依次将 Hierarchy 中的 `Animal` 节点拖入 `Animal Sprite`、`Base` 节点拖入 `Base Sprite`、`NameLabel` 节点拖入 `Name Label` 槽中。
7. 在 Inspector 中将 `Animal` 的 Content Size 改为 `80x80`；将 `NameLabel` 的文字大小（Font Size）设为 `20`，Y轴位置设为 `-55`。
8. **制作 Prefab**：将 Hierarchy 中的 `Piece` 节点**直接拖到**左下角 Assets 面板的 `assets` 文件夹中。此时文件变绿。
9. **清理场景**：在 Hierarchy 中右键点击绿色的 `Piece` 节点，选择 **Delete** 删除。

### 4. 制作“背景格子”和“高亮光圈”预制体
1. **GridCell (背景格子)**：
   * 右键 Canvas -> Create -> 2D Object -> Sprite，重命名为 **`GridCell`**。
   * 在 Inspector 的 UITransform 中将 Content Size 改为 **`96x96`**。
   * **避坑**：双击进入 `GridCell` 预制体，确保其 Sprite 组件的 **`Sprite Frame` 属性为 None**（或者搜索选择 Cocos 自带的 `default_sprite_splash` 纯白小方块），绝对不能填入动物图片。
   * 将其拖入 Assets 面板保存为绿色预制体，然后从 Hierarchy 中 **Delete**。
2. **CellHighlight (高亮光圈)**：
   * 右键 Canvas -> Create -> 2D Object -> Sprite，重命名为 **`CellHighlight`**。
   * 在 Inspector 中将 Content Size 改为 **`80x80`**，并将 Sprite 的 **Color** 改为半透明黄色（如透明度 Alpha 设为 150）。
   * 将其拖入 Assets 面板存为绿色预制体，从 Hierarchy 中 **Delete**。

### 5. 创建 Board 控制器并绑定所有属性
1. 右键 Canvas -> **Create -> Create Empty**，重命名为 **`Board`**（保留在场景中，不要删除）。
2. 将 **`BoardView.ts`** 脚本拖入右侧 Inspector 挂载到 `Board` 节点上。
3. 在 Inspector 中对 `BoardView` 的参数进行拖拽赋值：
   * **Cell Width / Height**: 填 `100`。
   * **Piece Prefab**: 拖入 Assets 里的绿色 `Piece`。
   * **Cell Highlight Prefab**: 拖入绿色 `CellHighlight`。
   * **Grid Cell Prefab**: 拖入绿色 `GridCell`。
   * **Animal Sprites**: 展开该数组，**设置 Size 为 8**。将 `animals` 文件夹中的 **SpriteFrame 子图**（点击图片左侧小三角展开后的小图），按照**“鼠(rat)、猫(cat)、狗(dog)、狼(wolf)、豹(leopard)、虎(tiger)、狮(lion)、象(elephant)”**的顺序拖入 Element 0 到 7 槽中。
   * **Board Container**: 将 Hierarchy 中的 **`Board`** 节点自身拖入此槽中。

### 6. 创建回合提示文本并预览
1. 右键 Canvas -> **Create -> 2D Object -> Label**，重命名为 **`TurnLabel`**，拖拽到屏幕上方。
2. 选中 `Board` 节点，将 `TurnLabel` 拖入 `BoardView` 的 `Turn Indicator` 槽中。
3. 按下 **`Ctrl + S` / `Cmd + S`** 保存主场景。
4. 点击编辑器正上方的 **Play (三角形预览按钮)**，在网页中即可测试对战！

---

## 四、 常见新手避坑与调试指南

### 1. 页面一片空白？
* **原因**：通常是脚本运行时出错崩溃。
* **解决**：在预览网页上按 **F12**，切换到 **`Console` (控制台)** 面板，查看红色的错误日志。

### 2. 满屏都是巨大的猫咪或其他动物？
* **原因**：在制作 `GridCell`（背景格子）预制体时，不小心把图片拖入了 `Sprite Frame` 属性中，且图片原始分辨率过大。
* **解决**：双击 Assets 里的 `GridCell` 预制体，在 Inspector 中将其 Sprite 组件下的 **`Sprite Frame` 清空**（或者设为 `default_sprite_splash`）。

### 3. Inspector（属性检查器）里显示代码而不是属性？
* **原因**：在左下角 Assets 窗口里误点了脚本文件，Cocos 切换到了代码预览模式。
* **解决**：在左上角 Hierarchy 窗口里**重新双击或单击选中的节点**（如 `Piece` 或 `Board`），Inspector 就会恢复显示节点的组件属性。

### 4. 2D 元素（如小河、背景格子、光圈）在浏览器中完全隐形看不见？
* **原因**：Cocos Creator 3.x 规定 2D UI 摄像机只渲染特定图层。如果 Prefab 的 **`Layer`** 属性设置为 `DEFAULT` (图层值 `1073741824`)，摄像机就会直接过滤并忽略它们。
* **解决**：在 Inspector 中将预制体的 **`Layer`** 属性修改为 **`UI_2D`** (图层值 `33554432`)。

### 5. 点击其他动物后，之前选中的动物没有停止呼吸抖动（看起来多选了）？
* **原因**：在 Cocos 3.x 中调用 `tween(this.node).stop()` 会对一个新建的 Tween 实例生效，这无法停止已经在节点上运行的循环动画。
* **解决**：在 TS 脚本中导入 `Tween` 类（大写 T），并改用静态方法 **`Tween.stopAllByTarget(this.node)`** 来强行杀死节点上的所有缓动动画。

### 6. 棋子底座或图片被自动拉伸得特别大，遮挡了整个屏幕？
* **原因**：Sprite 组件的 **`Size Mode`** 被设为了 `RAW` 或 `TRIMMED`。一旦塞入高清占位图片，节点尺寸会被强制改变。
* **解决**：将 Sprite 的 **`Size Mode` 改为 `CUSTOM`** (值为 0)，并在 `UITransform` 里手动锁定 Content Size（如 `90x90`）。

### 7. 修改了脚本代码后，浏览器预览网页里依然是旧效果、无新日志？
* **原因**：浏览器预览的 JavaScript 脚本缓存非常严重，直接刷新页面只会加载旧文件。
* **解决**：在预览网页上执行 **“硬刷新”**：Mac 按 **`Cmd + Shift + R`**，Windows 按 **`Ctrl + F5`**。

### 8. 水波动态效果不明显或被底色覆盖，看起来只是普通蓝色块？
* **原因**：若仅在河道格子上面叠加一个和格子面积相同大小（如 96x96）的半透明正方形覆盖块进行缩放和透明度循环，视觉上只会体现出整块区域亮度的微弱明暗交替，无法给人以水面波纹的“流线性”和“反光感”。
* **解决**：在河道格子上动态生成数个（如 4 个）**细长的小条状节点**（宽约 15~35 像素，高 2~4 像素，淡蓝白色），作为独立的水波反射波纹。通过 `UIOpacity` 控制其淡入淡出（闪烁），并给波纹节点添加横向拉伸（模拟水纹舒展）与随机左右漂移（模拟水流漂移）的 `tween` 动画，同时随机错开每个波纹的动画周期和启动延时，利用视觉离相创造极其自然的“波光粼粼”动态水面效果。

### 9. 棋盘部分行或列被裁剪，无法显示完全？
* **原因**：棋盘的物理占用像素（9行 * 100高度 + 上下留白 ≈ 1000像素）远超很多横屏设计分辨率（如 1280x720 视口高度仅有 720 像素），导致棋盘顶部和底部的格子直接溢出裁剪隐形。
* **解决**：在 `BoardView.ts` 中增加自适应窗口缩放。使用 `view.getVisibleSize()` 动态计算视口宽高，结合棋盘目标大小计算缩放比，在初始化和监听到 `'canvas-resize'` 重绘事件时对棋盘的父容器 `boardContainer` 调用 `node.setScale()` 缩放其大小（通常缩放到 `0.7` 到 `0.8` 即可），此时所有子节点（格子和棋子）都会自适应完美包含在屏幕正中且保留交互。


