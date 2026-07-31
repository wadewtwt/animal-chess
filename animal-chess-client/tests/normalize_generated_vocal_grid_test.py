from pathlib import Path
import sys
import tempfile
import unittest

from PIL import Image, ImageDraw


TOOLS_DIR = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS_DIR))

from normalize_generated_vocal_grid import normalize_vocal_grid


class NormalizeGeneratedVocalGridTest(unittest.TestCase):
    """验证生成式鸣叫帧归一化工具的输出契约。"""

    def test_normalize_vocal_grid_outputs_frames_and_previews(self) -> None:
        """归一化网格后应生成十帧、帧表和循环预览。"""
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            input_path = root / "generated_grid.png"
            anchor_path = root / "anchor.png"
            output_dir = root / "frames"
            preview_sheet_path = root / "vocal_sheet.png"
            preview_gif_path = root / "vocal_preview.gif"

            grid = Image.new("RGBA", (500, 200), (0, 0, 0, 0))
            draw = ImageDraw.Draw(grid)
            colors = [
                (220, 30, 30, 255),
                (30, 160, 70, 255),
                (30, 90, 220, 255),
                (230, 180, 20, 255),
                (170, 50, 200, 255),
                (20, 180, 180, 255),
                (230, 100, 20, 255),
                (120, 80, 220, 255),
                (80, 150, 30, 255),
                (210, 50, 130, 255),
            ]
            for index, color in enumerate(colors):
                column = index % 5
                row = index // 5
                left = column * 100 + 20 + index
                top = row * 100 + 15 + index
                draw.ellipse((left, top, left + 48, top + 58), fill=color)
            grid.save(input_path)

            anchor_color = (0, 75, 180, 255)
            anchor = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
            ImageDraw.Draw(anchor).rectangle((30, 20, 70, 80), fill=anchor_color)
            anchor.save(anchor_path)

            normalize_vocal_grid(
                input_path,
                anchor_path,
                output_dir,
                preview_sheet_path,
                preview_gif_path,
                columns=5,
                rows=2,
                frame_size=384,
                frame_duration_ms=70,
            )

            frame_paths = sorted(output_dir.glob("vocal_*.png"))
            self.assertEqual(10, len(frame_paths))
            self.assertEqual(
                [f"vocal_{index:02d}.png" for index in range(10)],
                [path.name for path in frame_paths],
            )
            for frame_path in frame_paths:
                with Image.open(frame_path) as frame:
                    self.assertEqual((384, 384), frame.size)
                    self.assertEqual(0, frame.getpixel((0, 0))[3])

            with Image.open(frame_paths[0]) as first_frame:
                self.assertEqual(anchor_color[:3], first_frame.getpixel((192, 192))[:3])
            self.assertTrue(preview_sheet_path.is_file())
            self.assertTrue(preview_gif_path.is_file())


if __name__ == "__main__":
    unittest.main()
