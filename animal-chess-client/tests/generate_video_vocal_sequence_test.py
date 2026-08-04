from pathlib import Path
import sys
import tempfile
import unittest

from PIL import Image, ImageDraw

TOOLS_DIR = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS_DIR))

from generate_video_vocal_sequence import generate_video_smooth_vocal_sequence


class GenerateVideoVocalSequenceTest(unittest.TestCase):
    """验证平滑象鸣序列生成与金边锁定工具的契约。"""

    def test_generate_video_smooth_vocal_sequence(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            grid_path = root / "grid.png"
            anchor_path = root / "anchor.png"
            out_dir = root / "frames"
            sheet_path = root / "sheet.png"
            gif_path = root / "preview.gif"

            grid = Image.new("RGBA", (500, 200), (0, 0, 0, 0))
            grid.save(grid_path)

            anchor = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
            ImageDraw.Draw(anchor).ellipse([10, 10, 90, 90], fill=(0, 75, 180, 255))
            # Add subtle inner gradient so frames differ
            ImageDraw.Draw(anchor).ellipse([40, 40, 60, 60], fill=(200, 100, 50, 255))
            anchor.save(anchor_path)

            frame_paths = generate_video_smooth_vocal_sequence(
                grid_path,
                anchor_path,
                out_dir,
                sheet_path,
                gif_path,
                frame_size=384,
                frame_duration_ms=50,
                target_frame_count=24,
            )

            self.assertEqual(24, len(frame_paths))
            self.assertTrue(sheet_path.is_file())
            self.assertTrue(gif_path.is_file())

            with Image.open(gif_path) as preview:
                self.assertEqual(24, preview.n_frames)


if __name__ == "__main__":
    unittest.main()
