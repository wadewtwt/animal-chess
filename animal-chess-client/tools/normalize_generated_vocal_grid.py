from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import List, Optional, Sequence

from PIL import Image


logger = logging.getLogger(__name__)


def split_grid(image: Image.Image, columns: int, rows: int) -> List[Image.Image]:
    """按从左到右、从上到下的顺序切分十帧网格。"""
    if columns <= 0 or rows <= 0:
        logger.error(
            "normalize_generated_vocal_grid.split_grid error 网格行列数必须为正数，columns=%s, rows=%s",
            columns,
            rows,
        )
        raise ValueError("网格行列数必须为正数")
    if columns * rows != 10:
        logger.error(
            "normalize_generated_vocal_grid.split_grid error 网格必须正好包含10帧，columns=%s, rows=%s",
            columns,
            rows,
        )
        raise ValueError("网格必须正好包含10帧")
    if image.width % columns != 0 or image.height % rows != 0:
        logger.error(
            "normalize_generated_vocal_grid.split_grid error 源图尺寸无法整除网格，size=%sx%s, columns=%s, rows=%s",
            image.width,
            image.height,
            columns,
            rows,
        )
        raise ValueError("源图尺寸必须能被网格行列数整除")

    cell_width = image.width // columns
    cell_height = image.height // rows
    return [
        image.crop(
            (
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            )
        )
        for row in range(rows)
        for column in range(columns)
    ]


def crop_content(image: Image.Image) -> Image.Image:
    """按透明通道裁剪图像的可见内容。"""
    rgba_image = image.convert("RGBA")
    content_box = rgba_image.getchannel("A").getbbox()
    if content_box is None:
        logger.error(
            "normalize_generated_vocal_grid.crop_content error 图像不包含可见内容"
        )
        raise ValueError("图像不包含可见内容")
    return rgba_image.crop(content_box)


def compose_centered(
    content: Image.Image, frame_size: int, scale: float
) -> Image.Image:
    """使用共享缩放将可见内容居中合成到透明方形画布。"""
    if frame_size <= 0 or scale <= 0:
        logger.error(
            "normalize_generated_vocal_grid.compose_centered error 帧尺寸和缩放必须为正数，frame_size=%s, scale=%s",
            frame_size,
            scale,
        )
        raise ValueError("帧尺寸和缩放必须为正数")

    resized_width = max(1, round(content.width * scale))
    resized_height = max(1, round(content.height * scale))
    if resized_width > frame_size or resized_height > frame_size:
        logger.error(
            "normalize_generated_vocal_grid.compose_centered error 缩放后内容超出画布，content=%sx%s, frame_size=%s",
            resized_width,
            resized_height,
            frame_size,
        )
        raise ValueError("缩放后内容超出画布")

    resized = content.resize(
        (resized_width, resized_height), Image.Resampling.LANCZOS
    )
    frame = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
    position = (
        (frame_size - resized_width) // 2,
        (frame_size - resized_height) // 2,
    )
    frame.alpha_composite(resized, position)
    return frame


def render_sheet(frames: Sequence[Image.Image], columns: int = 5) -> Image.Image:
    """将归一化帧按指定列数渲染为透明预览帧表。"""
    if not frames or columns <= 0:
        logger.error(
            "normalize_generated_vocal_grid.render_sheet error 帧列表不能为空且列数必须为正数，frame_count=%s, columns=%s",
            len(frames),
            columns,
        )
        raise ValueError("帧列表不能为空且列数必须为正数")

    frame_width, frame_height = frames[0].size
    rows = (len(frames) + columns - 1) // columns
    sheet = Image.new(
        "RGBA", (columns * frame_width, rows * frame_height), (0, 0, 0, 0)
    )
    for index, frame in enumerate(frames):
        position = ((index % columns) * frame_width, (index // columns) * frame_height)
        sheet.alpha_composite(frame.convert("RGBA"), position)
    return sheet


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
) -> List[Path]:
    """归一化生成式鸣叫网格并输出帧、帧表及循环预览。"""
    if frame_size <= 2:
        logger.error(
            "normalize_generated_vocal_grid.normalize_vocal_grid error 帧尺寸必须大于2，frame_size=%s",
            frame_size,
        )
        raise ValueError("帧尺寸必须大于2")
    if frame_duration_ms <= 0:
        logger.error(
            "normalize_generated_vocal_grid.normalize_vocal_grid error 帧时长必须为正数，frame_duration_ms=%s",
            frame_duration_ms,
        )
        raise ValueError("帧时长必须为正数")

    with Image.open(input_path) as source_file:
        source = source_file.convert("RGBA")
    if source.getchannel("A").getextrema()[0] == 255:
        logger.error(
            "normalize_generated_vocal_grid.normalize_vocal_grid error 源图必须包含透明像素"
        )
        raise ValueError("源图必须包含透明像素")

    with Image.open(anchor_path) as anchor_file:
        anchor = anchor_file.convert("RGBA")

    generated_frames = split_grid(source, columns, rows)
    generated_content = [crop_content(frame) for frame in generated_frames]
    anchor_content = crop_content(anchor)
    all_content = [anchor_content, *generated_content]
    max_width = max(content.width for content in all_content)
    max_height = max(content.height for content in all_content)
    shared_scale = min(
        (frame_size - 2) / max_width,
        (frame_size - 2) / max_height,
    )

    output_content = [anchor_content, *generated_content[1:]]
    normalized_frames = [
        compose_centered(content, frame_size, shared_scale)
        for content in output_content
    ]

    output_dir = Path(output_dir)
    preview_sheet_path = Path(preview_sheet_path)
    preview_gif_path = Path(preview_gif_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    preview_sheet_path.parent.mkdir(parents=True, exist_ok=True)
    preview_gif_path.parent.mkdir(parents=True, exist_ok=True)

    frame_paths = []
    for index, frame in enumerate(normalized_frames):
        frame_path = output_dir / f"vocal_{index:02d}.png"
        frame.save(frame_path, format="PNG", optimize=True)
        frame_paths.append(frame_path)

    render_sheet(normalized_frames, columns=5).save(
        preview_sheet_path, format="PNG", optimize=True
    )
    normalized_frames[0].save(
        preview_gif_path,
        format="GIF",
        save_all=True,
        append_images=normalized_frames[1:],
        duration=frame_duration_ms,
        loop=0,
        disposal=2,
    )
    return frame_paths


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    """解析生成式鸣叫帧归一化工具的命令行参数。"""
    parser = argparse.ArgumentParser(description="归一化生成式鸣叫帧网格")
    parser.add_argument("--input", required=True, type=Path, help="输入透明网格 PNG")
    parser.add_argument("--anchor", required=True, type=Path, help="首帧 anchor PNG")
    parser.add_argument("--out-dir", required=True, type=Path, help="输出帧目录")
    parser.add_argument(
        "--preview-sheet", required=True, type=Path, help="输出预览帧表 PNG"
    )
    parser.add_argument(
        "--preview-gif", required=True, type=Path, help="输出循环预览 GIF"
    )
    parser.add_argument("--frame-size", type=int, default=384, help="方形帧边长")
    parser.add_argument(
        "--frame-duration-ms", type=int, default=70, help="GIF 单帧时长（毫秒）"
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    """执行生成式鸣叫帧归一化命令。"""
    args = parse_args(argv)
    normalize_vocal_grid(
        args.input,
        args.anchor,
        args.out_dir,
        args.preview_sheet,
        args.preview_gif,
        frame_size=args.frame_size,
        frame_duration_ms=args.frame_duration_ms,
    )


if __name__ == "__main__":
    main()
