from __future__ import annotations

import argparse
import logging
import math
from pathlib import Path
from typing import List, Optional, Sequence

import numpy as np
from PIL import Image, ImageDraw


logger = logging.getLogger(__name__)


def extract_border_mask(anchor: Image.Image) -> Image.Image:
    """从 anchor 原图中提取金边和外部 Alpha 遮罩。"""
    anchor_rgba = anchor.convert("RGBA")
    w, h = anchor_rgba.size
    
    alpha = np.array(anchor_rgba.getchannel("A"))
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        raise ValueError("Anchor 图像不包含有效像素")
        
    center_x = (xs.min() + xs.max()) / 2.0
    center_y = (ys.min() + ys.max()) / 2.0
    radius = max((xs.max() - xs.min()) / 2.0, (ys.max() - ys.min()) / 2.0)
    
    inner_radius = radius * 0.76
    
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        fill=255
    )
    draw.ellipse(
        [center_x - inner_radius, center_y - inner_radius, center_x + inner_radius, center_y + inner_radius],
        fill=0
    )
    return mask


def lock_frame_border(frame: Image.Image, anchor: Image.Image) -> Image.Image:
    """强行将帧的最外侧金边和 Alpha 通道替换为 Anchor 的静态金边，消除外框抖动。"""
    frame_rgba = frame.convert("RGBA").resize(anchor.size, Image.Resampling.LANCZOS)
    anchor_rgba = anchor.convert("RGBA")
    
    border_mask = extract_border_mask(anchor_rgba)
    outer_alpha_mask = Image.eval(anchor_rgba.getchannel("A"), lambda a: 255 if a == 0 else 0)
    
    result = frame_rgba.copy()
    result.paste(anchor_rgba, (0, 0), mask=border_mask)
    result.paste((0, 0, 0, 0), (0, 0), mask=outer_alpha_mask)
    return result


def interpolate_frames(
    frames: List[Image.Image], target_count: int = 16
) -> List[Image.Image]:
    """对关键帧序列进行平滑缓动插值，生成指定数量的连续动画帧。"""
    if len(frames) < 2:
        raise ValueError("至少需要 2 个关键帧进行插值")
        
    num_keyframes = len(frames)
    interpolated: List[Image.Image] = []
    
    for i in range(target_count):
        progress = i / float(target_count)
        virtual_index = progress * num_keyframes
        idx1 = int(math.floor(virtual_index)) % num_keyframes
        idx2 = (idx1 + 1) % num_keyframes
        t = virtual_index - math.floor(virtual_index)
        
        t_eased = 0.5 - 0.5 * math.cos(t * math.pi)
        
        f1 = frames[idx1].convert("RGBA")
        f2 = frames[idx2].convert("RGBA")
        blended = Image.blend(f1, f2, alpha=t_eased)
        interpolated.append(blended)
        
    return interpolated


def render_sheet(frames: Sequence[Image.Image], columns: int = 4) -> Image.Image:
    """将帧序列渲染为平铺帧表。"""
    if not frames:
        raise ValueError("帧列表不能为空")
    w, h = frames[0].size
    rows = (len(frames) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * w, rows * h), (0, 0, 0, 0))
    for idx, frame in enumerate(frames):
        pos = ((idx % columns) * w, (idx // columns) * h)
        sheet.alpha_composite(frame.convert("RGBA"), pos)
    return sheet


def generate_video_smooth_vocal_sequence(
    grid_path: Path,
    anchor_path: Path,
    output_dir: Path,
    preview_sheet_path: Path,
    preview_gif_path: Path,
    frame_size: int = 384,
    frame_duration_ms: int = 60,
    target_frame_count: int = 16,
) -> List[Path]:
    """生成平滑视频级象鸣动画帧及预览文件。"""
    with Image.open(anchor_path) as a_file:
        anchor = a_file.convert("RGBA")
        
    with Image.open(grid_path) as g_file:
        grid = g_file.convert("RGBA")
        
    cell_w = grid.width // 5
    cell_h = grid.height // 2
    raw_keyframes = []
    for r in range(2):
        for c in range(5):
            cell = grid.crop((c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h))
            raw_keyframes.append(cell)
            
    raw_keyframes[0] = anchor.copy()
    
    locked_keyframes = [lock_frame_border(kf, anchor) for kf in raw_keyframes]
    
    smooth_frames = interpolate_frames(locked_keyframes, target_count=target_frame_count)
    
    final_frames = [
        lock_frame_border(f, anchor).resize((frame_size, frame_size), Image.Resampling.LANCZOS)
        for f in smooth_frames
    ]
    
    output_dir = Path(output_dir)
    preview_sheet_path = Path(preview_sheet_path)
    preview_gif_path = Path(preview_gif_path)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    preview_sheet_path.parent.mkdir(parents=True, exist_ok=True)
    preview_gif_path.parent.mkdir(parents=True, exist_ok=True)
    
    frame_paths = []
    for idx, f in enumerate(final_frames):
        p = output_dir / f"vocal_{idx:02d}.png"
        f.save(p, format="PNG", optimize=True)
        frame_paths.append(p)
        
    render_sheet(final_frames, columns=4).save(
        preview_sheet_path, format="PNG", optimize=True
    )
    
    gif_frames = []
    for frame in final_frames:
        alpha = frame.split()[3]
        p_frame = frame.convert("RGB").convert("P", palette=Image.ADAPTIVE, colors=255)
        mask = Image.eval(alpha, lambda a: 255 if a < 128 else 0)
        p_frame.paste(255, mask=mask)
        p_frame.info["transparency"] = 255
        gif_frames.append(p_frame)

    gif_frames[0].save(
        preview_gif_path,
        format="GIF",
        save_all=True,
        append_images=gif_frames[1:],
        duration=frame_duration_ms,
        loop=0,
        disposal=2,
    )
    return frame_paths


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="生成平滑视频级象鸣动画帧序列")
    parser.add_argument("--grid", required=True, type=Path, help="网格 PNG")
    parser.add_argument("--anchor", required=True, type=Path, help="Anchor 原画 PNG")
    parser.add_argument("--out-dir", required=True, type=Path, help="输出帧目录")
    parser.add_argument("--preview-sheet", required=True, type=Path, help="预览 Sheet PNG")
    parser.add_argument("--preview-gif", required=True, type=Path, help="预览 GIF")
    parser.add_argument("--frame-size", type=int, default=384, help="帧分辨率")
    parser.add_argument("--frame-duration-ms", type=int, default=60, help="GIF 单帧毫秒")
    parser.add_argument("--target-frame-count", type=int, default=16, help="总帧数")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv)
    generate_video_smooth_vocal_sequence(
        args.grid,
        args.anchor,
        args.out_dir,
        args.preview_sheet,
        args.preview_gif,
        frame_size=args.frame_size,
        frame_duration_ms=args.frame_duration_ms,
        target_frame_count=args.target_frame_count,
    )


if __name__ == "__main__":
    main()
