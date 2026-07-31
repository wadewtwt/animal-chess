# 蓝方大象鸣叫样片（Antigravity 执行）Implementation Plan

> **For agentic workers:** 按本文 checkbox（`- [ ]`）逐项执行。当前任务只制作开发预览样片，不接入正式资源和运行时代码。

**Goal:** 基于现有蓝方大象棋子原画，一次性生成 5 列 × 2 行共 10 帧的自然象鸣动作网格，并输出切帧、帧表和 GIF 供用户确认。

**Architecture:** Antigravity 或其他图片生成工具只负责完整重绘一张 10 帧动作网格；项目现有 Python 工具负责切帧、统一缩放、首帧锁定和预览输出。禁止逐帧独立生成，避免角色外观、外框尺寸和锚点漂移。

**Tech Stack:** Antigravity（或等价图片生成工具）、PNG/RGBA、Python 3.9、Pillow、`unittest`

---

## 0. 当前状态和执行边界

已存在：

- 角色源图：`animal-chess-client/assets/resources/animal_pieces/elephant-blue.png`
- 归一化工具：`animal-chess-client/tools/normalize_generated_vocal_grid.py`
- 工具测试：`animal-chess-client/tests/normalize_generated_vocal_grid_test.py`

本轮只允许创建：

- `animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-grid.png`
- `animal-chess-client/dev/animal-vocal-preview/elephant-blue/frames/vocal_00.png` 至 `vocal_09.png`
- `animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-sheet.png`
- `animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-preview.gif`

本轮禁止：

- 不生成红方大象。
- 不生成鼠、猫、狗、狼、豹、虎、狮等其他动物。
- 不修改 `animal-chess-client/assets/resources/animal_pieces/elephant-blue.png`。
- 不写入 `animal-chess-client/assets/resources/animal_actions/`。
- 不修改 TypeScript、Cocos 场景、预制体或棋子点击逻辑。
- 不使用拉伸、扭曲、液化、局部贴嘴、简单缩放或旋转来伪造动作。
- 未经用户视觉确认，不提交生成资源。

## 1. 检查输入角色

- [ ] 打开以下源图，确认它是本次唯一角色参考：

```text
animal-chess-client/assets/resources/animal_pieces/elephant-blue.png
```

- [ ] 记录必须保持不变的角色特征：

```text
蓝色卡通大象；三分之四侧脸；蓝色珐琅内盘；金色雕花圆形外框；
象牙、眼睛、耳朵、鼻子和额头比例保持一致；光照方向和材质风格保持一致。
```

## 2. 一次生成完整 10 帧动作网格

- [ ] 将源图作为角色和风格参考图输入 Antigravity。

- [ ] 使用下面的完整提示词，一次生成一张网格，不要拆成 10 次生成：

```text
Use case: stylized-concept
Asset type: production-ready 2D game animation sheet
Input image: use the supplied blue elephant chess-piece portrait as the only
character, identity, palette, material, lighting, and composition reference.

Create exactly 10 equal square animation frames arranged as 5 columns by 2 rows,
read left-to-right and then top-to-bottom. Output the complete sheet at exactly
2500 x 1000 pixels, so every slot is exactly 500 x 500 pixels.

Keep the exact same cute premium 3D-cartoon blue elephant, three-quarter facing
direction, blue enamel inner disc, ornate gold circular border, palette, lighting
direction, proportions, and facial identity in every frame. Keep every medallion
perfectly circular, centered, and the same size. Keep the character scale and
center stable in all ten slots.

The action is a natural elephant trumpet, not a generic open-mouth roar:
01 exact calm idle pose;
02 small inhale with the head lowering slightly;
03 head begins to rise and the trunk curls upward;
04 ears open and the trunk lifts as the trumpet starts;
05 peak trumpet with raised trunk, focused eyes, and naturally opened ears;
06 sustained trumpet with subtle head follow-through;
07 release with the trunk beginning to lower;
08 ears and head settling naturally;
09 near-idle recovery;
10 calm idle ready to return smoothly to frame 01.

Redraw the complete elephant pose for every frame. The movement must come from
newly generated poses, not from warping or transforming the supplied pixels.
Preserve anatomical continuity and natural secondary motion in the trunk, ears,
head, eyelids, and cheeks. The gold circular border must not move, deform, pulse,
rotate, or change color.

Use a truly transparent RGBA background outside each circular medallion. Every
background pixel outside the medallions must have alpha 0. Remove low-alpha haze
and edge noise outside the medallions.

No scenery, labels, numbers, captions, slot borders, grid lines, watermark,
poster composition, extra characters, duplicated body parts, extra trunks,
extra tusks, deformed anatomy, motion blur, smear, stretch, squash, liquid warp,
mouth sticker, or color shift. Do not output 1536 x 1024 or any other size.
```

- [ ] 若工具无法直接输出透明背景，先生成纯色键背景，再由图像工具移除背景：

```text
使用纯 #ff00ff 背景，因为角色主体是蓝色，不能使用蓝色键背景。
背景必须完全平坦，无阴影、渐变、纹理、反光和地面。
抠图后必须将棋子外部像素设为 alpha=0，并清理低透明度噪点。
```

- [ ] 将最终网格保存到以下固定路径：

```text
animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-grid.png
```

## 3. 生成结果初检

- [ ] 检查文件格式和画布：

```text
格式：PNG（RGBA）
尺寸：2500 × 1000
布局：5 列 × 2 行
每格：500 × 500
顺序：从左到右，再从上到下
透明区域：棋子圆形外框之外存在 alpha=0 像素
```

- [ ] 检查角色一致性：

```text
10 帧必须是同一只蓝方大象；脸型、象牙、眼睛、材质和配色不漂移；
金色外框始终是同样大小的正圆，不能抖动、变形或换色；
每帧棋子中心和整体比例稳定；不能出现多余鼻子、象牙、耳朵或眼睛。
```

- [ ] 检查动作是否是自然象鸣：

```text
动作必须能读出“吸气蓄力 -> 抬头卷鼻 -> 张耳鸣叫 -> 自然收势”；
第 5 帧是动作峰值；第 10 帧能自然回到第 1 帧；
不是狮虎式张嘴咆哮，也不是静态图的扭曲、放大或旋转。
```

- [ ] 任一条件不满足时，只重新生成这张完整网格。不要单独替换某一帧。

## 4. 运行归一化工具

- [ ] 先验证现有工具测试：

```powershell
python -m unittest animal-chess-client/tests/normalize_generated_vocal_grid_test.py
```

预期：

```text
Ran 1 test
OK
```

- [ ] 生成 10 张独立帧、静态帧表和 GIF：

```powershell
python animal-chess-client/tools/normalize_generated_vocal_grid.py `
  --input animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-grid.png `
  --anchor animal-chess-client/assets/resources/animal_pieces/elephant-blue.png `
  --out-dir animal-chess-client/dev/animal-vocal-preview/elephant-blue/frames `
  --preview-sheet animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-sheet.png `
  --preview-gif animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-preview.gif `
  --frame-size 384 `
  --frame-duration-ms 70
```

说明：工具会把 `vocal_00.png` 锁定为现有源图，因此动画首帧保持与游戏当前棋子一致。

## 5. 自动检查输出资源

- [ ] 在项目根目录运行以下检查：

```powershell
@'
from pathlib import Path
from PIL import Image

root = Path("animal-chess-client/dev/animal-vocal-preview/elephant-blue")
frames = sorted((root / "frames").glob("vocal_*.png"))
assert len(frames) == 10, f"Expected 10 frames, got {len(frames)}"
assert [p.name for p in frames] == [f"vocal_{i:02d}.png" for i in range(10)]

for path in frames:
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        assert rgba.size == (384, 384), f"Invalid size: {path.name} {rgba.size}"
        assert rgba.getchannel("A").getextrema()[0] == 0, f"No transparency: {path.name}"

with Image.open(root / "elephant-blue-sheet.png") as sheet:
    assert sheet.size == (1920, 768), f"Invalid sheet size: {sheet.size}"

with Image.open(root / "elephant-blue-preview.gif") as preview:
    assert preview.n_frames == 10, f"Invalid GIF frame count: {preview.n_frames}"
    assert preview.info.get("loop") == 0, f"Invalid GIF loop: {preview.info.get('loop')}"
    for index in range(preview.n_frames):
        preview.seek(index)
        assert preview.info.get("duration") == 70, (
            f"Invalid GIF duration at frame {index}: {preview.info.get('duration')}"
        )

print("Elephant vocal sample assets: OK")
'@ | python -
```

预期：

```text
Elephant vocal sample assets: OK
```

## 6. 人工视觉验收

- [ ] 打开并检查静态帧表：

```text
animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-sheet.png
```

- [ ] 循环播放 GIF，并同时以两种尺寸检查：

```text
92 × 92：接近游戏内棋子实际显示尺寸
276 × 276：用于观察脸部、象鼻、耳朵和外框细节
```

- [ ] 只评审以下四项：

```text
1. 角色是否变脸或材质漂移。
2. 抬头、卷鼻、张耳和收势是否自然。
3. 金色圆形外框是否抖动、变形或换色。
4. 象鸣节奏是否清楚，并能平滑循环回到首帧。
```

- [ ] 若视觉不合格，保留失败样片供对比，使用带版本号的新文件重新生成，例如：

```text
elephant-blue-grid-v2.png
```

确认新版后，再将确认版本复制为固定文件名 `elephant-blue-grid.png` 并重新执行切帧流程。不要覆盖失败版本后失去对比依据。

## 7. 完成时的汇报格式

- [ ] 执行完成后按以下格式汇报，不继续处理其他动物：

```text
蓝方大象 10 帧象鸣样片已生成。

生成网格：<绝对路径>
静态帧表：<绝对路径>
动态预览：<绝对路径>
独立帧目录：<绝对路径>
自动检查：通过 / 未通过（附具体原因）
视觉自检：通过 / 未通过（附具体问题）

未修改：红方大象、其他动物、正式资源目录、Cocos/TypeScript 运行时代码、棋子点击逻辑。
等待用户确认后再决定是否接入游戏。
```

## 已知工具约束

现有归一化工具要求输入尺寸能被 5 列和 2 行整除，并按全部非零 alpha 像素计算内容边界。因此本任务固定要求 `2500×1000` RGBA 网格、每格 `500×500`，且棋子外部必须是干净的 `alpha=0`，不能残留低透明度噪点。不要直接使用常见的 `1536×1024` 生成结果进入切帧。
