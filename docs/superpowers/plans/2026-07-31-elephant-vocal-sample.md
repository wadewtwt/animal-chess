# 蓝方大象鸣叫样片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于现有蓝方大象棋子原画，生成一组不依赖图像扭曲的 10 帧抬头甩鼻鸣叫样片，并提供实际棋子尺寸的动态预览供用户确认。

**Architecture:** 图片生成一次输出 5 列 × 2 行的完整动作网格，避免逐帧生成导致角色漂移；独立 Python 工具负责按网格切分、统一缩放和中心锚点、锁定首帧，并输出帧表和 GIF。当前阶段只写入开发预览目录，不修改 Cocos 运行时代码和正式资源索引。

**Tech Stack:** OpenAI ImageGen、Python 3.9、Pillow、`unittest`、Codex 浏览器视觉预览。

---

### Task 1: 建立可测试的生成帧归一化工具

**Files:**
- Create: `animal-chess-client/tools/normalize_generated_vocal_grid.py`
- Create: `animal-chess-client/tests/normalize_generated_vocal_grid_test.py`

- [ ] **Step 1: 写失败测试**

创建 `animal-chess-client/tests/normalize_generated_vocal_grid_test.py`，用 5 × 2 的合成透明网格验证帧顺序、统一尺寸、透明背景、首帧锁定和预览输出：

```python
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

CLIENT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CLIENT_ROOT / "tools"))

from normalize_generated_vocal_grid import normalize_vocal_grid


class NormalizeGeneratedVocalGridTest(unittest.TestCase):
    def test_normalizes_ten_frames_and_locks_first_frame(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            grid_path = root / "grid.png"
            anchor_path = root / "anchor.png"
            output_dir = root / "frames"
            sheet_path = root / "preview.png"
            gif_path = root / "preview.gif"

            grid = Image.new("RGBA", (500, 200), (0, 0, 0, 0))
            for index in range(10):
                left = (index % 5) * 100
                top = (index // 5) * 100
                draw = ImageDraw.Draw(grid)
                draw.ellipse(
                    (left + 20, top + 15, left + 80, top + 85),
                    fill=(20 * index, 120, 220 - 10 * index, 255),
                )
            grid.save(grid_path)

            anchor = Image.new("RGBA", (80, 80), (0, 0, 0, 0))
            ImageDraw.Draw(anchor).rectangle((12, 12, 68, 68), fill=(0, 75, 180, 255))
            anchor.save(anchor_path)

            frames = normalize_vocal_grid(
                input_path=grid_path,
                anchor_path=anchor_path,
                output_dir=output_dir,
                preview_sheet_path=sheet_path,
                preview_gif_path=gif_path,
                columns=5,
                rows=2,
                frame_size=384,
                frame_duration_ms=70,
            )

            self.assertEqual(len(frames), 10)
            self.assertEqual([path.name for path in frames], [f"vocal_{i:02d}.png" for i in range(10)])
            self.assertTrue(sheet_path.exists())
            self.assertTrue(gif_path.exists())

            first = Image.open(frames[0]).convert("RGBA")
            self.assertEqual(first.size, (384, 384))
            self.assertIsNotNone(first.getchannel("A").getbbox())
            self.assertEqual(first.getpixel((0, 0))[3], 0)
            self.assertEqual(first.getpixel((192, 192))[:3], (0, 75, 180))

            for path in frames:
                frame = Image.open(path).convert("RGBA")
                self.assertEqual(frame.size, (384, 384))
                self.assertEqual(frame.getpixel((0, 0))[3], 0)

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
python -m unittest animal-chess-client/tests/normalize_generated_vocal_grid_test.py
```

Expected: FAIL，错误包含 `No module named 'normalize_generated_vocal_grid'`。

- [ ] **Step 3: 实现最小归一化工具**

创建 `animal-chess-client/tools/normalize_generated_vocal_grid.py`，接口和行为固定如下：

```python
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw


def split_grid(image: Image.Image, columns: int, rows: int) -> list[Image.Image]:
    if columns < 1 or rows < 1:
        raise ValueError("columns and rows must be positive")
    frames: list[Image.Image] = []
    for row in range(rows):
        top = round(row * image.height / rows)
        bottom = round((row + 1) * image.height / rows)
        for column in range(columns):
            left = round(column * image.width / columns)
            right = round((column + 1) * image.width / columns)
            frames.append(image.crop((left, top, right, bottom)))
    return frames


def crop_content(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A").point(lambda value: 255 if value > 8 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("generated frame contains no visible pixels")
    return image.crop(bounds)


def compose_centered(content: Image.Image, frame_size: int, scale: float) -> Image.Image:
    width = max(1, round(content.width * scale))
    height = max(1, round(content.height * scale))
    resized = content.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((frame_size - width) // 2, (frame_size - height) // 2))
    return canvas


def render_sheet(frames: list[Image.Image], output_path: Path, columns: int = 5) -> None:
    gap = 8
    rows = math.ceil(len(frames) / columns)
    size = frames[0].width
    sheet = Image.new(
        "RGBA",
        (columns * size + (columns - 1) * gap, rows * size + (rows - 1) * gap),
        (238, 241, 245, 255),
    )
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        left = (index % columns) * (size + gap)
        top = (index // columns) * (size + gap)
        draw.rectangle((left, top, left + size, top + size), fill=(225, 230, 235, 255))
        sheet.alpha_composite(frame, (left, top))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)


def normalize_vocal_grid(
    input_path: Path,
    anchor_path: Path,
    output_dir: Path,
    preview_sheet_path: Path,
    preview_gif_path: Path,
    columns: int = 5,
    rows: int = 2,
    frame_size: int = 384,
    frame_duration_ms: int = 70,
) -> list[Path]:
    source = Image.open(input_path).convert("RGBA")
    slots = split_grid(source, columns, rows)
    if len(slots) != 10:
        raise ValueError(f"expected 10 frames, got {len(slots)}")
    if source.getchannel("A").getextrema()[0] != 0:
        raise ValueError("generated grid must contain transparent pixels")

    anchor = Image.open(anchor_path).convert("RGBA")
    contents = [crop_content(slot) for slot in slots]
    anchor_content = crop_content(anchor)
    max_width = max([anchor_content.width, *(item.width for item in contents)])
    max_height = max([anchor_content.height, *(item.height for item in contents)])
    scale = min(frame_size / max_width, frame_size / max_height)

    normalized = [compose_centered(content, frame_size, scale) for content in contents]
    normalized[0] = compose_centered(anchor_content, frame_size, scale)

    output_dir.mkdir(parents=True, exist_ok=True)
    output_paths: list[Path] = []
    for index, frame in enumerate(normalized):
        output_path = output_dir / f"vocal_{index:02d}.png"
        frame.save(output_path, optimize=True)
        output_paths.append(output_path)

    render_sheet(normalized, preview_sheet_path)
    normalized[0].save(
        preview_gif_path,
        save_all=True,
        append_images=normalized[1:],
        duration=frame_duration_ms,
        loop=0,
        disposal=2,
    )
    return output_paths


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize a generated 5x2 vocal animation grid.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--anchor", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--preview-sheet", type=Path, required=True)
    parser.add_argument("--preview-gif", type=Path, required=True)
    parser.add_argument("--frame-size", type=int, default=384)
    parser.add_argument("--frame-duration-ms", type=int, default=70)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    normalize_vocal_grid(
        input_path=args.input,
        anchor_path=args.anchor,
        output_dir=args.out_dir,
        preview_sheet_path=args.preview_sheet,
        preview_gif_path=args.preview_gif,
        frame_size=args.frame_size,
        frame_duration_ms=args.frame_duration_ms,
    )


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 运行测试并确认通过**

Run:

```powershell
python -m unittest animal-chess-client/tests/normalize_generated_vocal_grid_test.py
```

Expected: `Ran 1 test` 和 `OK`。

- [ ] **Step 5: 提交工具和测试**

```powershell
git add -- animal-chess-client/tools/normalize_generated_vocal_grid.py animal-chess-client/tests/normalize_generated_vocal_grid_test.py
git commit -m "test: 添加生成式鸣叫帧归一化工具"
```

### Task 2: 生成蓝方大象完整动作网格

**Files:**
- Source: `animal-chess-client/assets/resources/animal_pieces/elephant-blue.png`
- Create: `animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-grid.png`

- [ ] **Step 1: 读取图片生成技能并以原画执行编辑生成**

调用 `imagegen` 技能，以 `elephant-blue.png` 为唯一角色种子，在一次编辑请求中生成完整 10 帧网格。使用以下提示词，不逐帧单独生成：

```text
Edit the supplied blue elephant chess-piece portrait into one production-ready
2D animation sheet. Create exactly 10 equal square frames arranged as 5 columns
by 2 rows, read left-to-right and then top-to-bottom. Keep the exact same cute
premium 3D-cartoon elephant, three-quarter facing direction, blue enamel inner
disc, ornate gold circular border, palette, lighting direction, proportions,
and facial identity in every frame.

The action is a natural elephant trumpet, not a generic open-mouth roar:
01 exact calm idle pose; 02 small inhale with head lowering; 03 head begins to
rise and trunk curls upward; 04 ears open and trunk lifts as the trumpet starts;
05 peak trumpet with raised trunk, focused eyes, and naturally opened ears;
06 sustained trumpet with subtle head follow-through; 07 release with trunk
beginning to lower; 08 ears and head settling; 09 near-idle recovery; 10 calm
idle ready to return to frame 01.

Redraw the complete pose for every frame. Do not warp, stretch, squash, smear,
or paste a mouth onto the source image. Keep the medallion perfectly circular,
the border size fixed, and the character scale and center stable. Transparent
background outside each medallion. No scenery, labels, numbers, grid lines,
captions, extra characters, duplicated body parts, or poster composition.
```

将原始生成结果保存为：

`animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-grid.png`

- [ ] **Step 2: 检查网格基本条件**

使用图像查看工具确认：网格确实为 5 × 2、共有 10 个槽位、透明背景存在、每帧都是同一个蓝方大象棋子。若任一条件不满足，只重新生成这一张网格，不进入切帧。

### Task 3: 切帧并生成静态与动态预览

**Files:**
- Create: `animal-chess-client/dev/animal-vocal-preview/elephant-blue/frames/vocal_00.png` 至 `vocal_09.png`
- Create: `animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-sheet.png`
- Create: `animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-preview.gif`

- [ ] **Step 1: 归一化生成结果**

Run:

```powershell
python animal-chess-client/tools/normalize_generated_vocal_grid.py --input animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-grid.png --anchor animal-chess-client/assets/resources/animal_pieces/elephant-blue.png --out-dir animal-chess-client/dev/animal-vocal-preview/elephant-blue/frames --preview-sheet animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-sheet.png --preview-gif animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-preview.gif --frame-size 384 --frame-duration-ms 70
```

Expected: `frames` 目录包含连续的 `vocal_00.png` 至 `vocal_09.png`，同时生成 PNG 帧表和 GIF。

- [ ] **Step 2: 做自动资源检查**

Run:

```powershell
$frames = Get-ChildItem -LiteralPath 'animal-chess-client/dev/animal-vocal-preview/elephant-blue/frames' -Filter 'vocal_*.png'
if ($frames.Count -ne 10) { throw "Expected 10 frames, got $($frames.Count)" }
Add-Type -AssemblyName System.Drawing
$frames | ForEach-Object {
    $image = [System.Drawing.Image]::FromFile($_.FullName)
    try {
        if ($image.Width -ne 384 -or $image.Height -ne 384) {
            throw "Invalid frame size: $($_.Name) $($image.Width)x$($image.Height)"
        }
    } finally {
        $image.Dispose()
    }
}
```

Expected: 命令正常结束，无异常输出。

- [ ] **Step 3: 在视觉伴随页展示动态效果**

将帧表和 GIF 放入当前视觉伴随会话的 `content` 目录，页面同时以 `92 × 92` 游戏尺寸和 `276 × 276` 放大尺寸循环播放，并标注本轮只评审以下四项：角色是否变脸、象鼻动作是否自然、外框是否抖动、鸣叫节奏是否清楚。

- [ ] **Step 4: 等待用户视觉确认**

打开视觉伴随页并向用户提供本地 URL。未得到用户明确确认前，不生成红方大象、不生成其他动物、不写入 `assets/resources/animal_actions`，也不修改 TypeScript 运行时代码。

### Task 4: 固化用户确认的蓝方大象样片

**Files:**
- Verify: `animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-grid.png`
- Verify: `animal-chess-client/dev/animal-vocal-preview/elephant-blue/frames/vocal_00.png` 至 `vocal_09.png`
- Verify: `animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-sheet.png`
- Verify: `animal-chess-client/dev/animal-vocal-preview/elephant-blue/elephant-blue-preview.gif`

- [ ] **Step 1: 重新运行工具测试**

Run:

```powershell
python -m unittest animal-chess-client/tests/normalize_generated_vocal_grid_test.py
```

Expected: `Ran 1 test` 和 `OK`。

- [ ] **Step 2: 视觉验收通过后提交样片**

```powershell
git add -- animal-chess-client/dev/animal-vocal-preview/elephant-blue
git commit -m "art: 添加蓝方大象鸣叫样片"
```

- [ ] **Step 3: 报告当前边界**

最终汇报明确说明：本轮只完成蓝方大象样片；红方大象、其他动物、正式 Cocos 资源和点击播放逻辑均未改动，后续必须经过新的用户确认才能继续。
