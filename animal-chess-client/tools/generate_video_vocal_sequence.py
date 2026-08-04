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


def generate_mesh_deformation_sequence(
    anchor: Image.Image, target_count: int = 24
) -> List[Image.Image]:
    """使用单张原图像素进行零重影、零跳变物理网格形变动画生成。"""
    anchor_rgba = anchor.convert("RGBA")
    w, h = anchor_rgba.size
    img_np = np.array(anchor_rgba, dtype=np.float32)

    alpha = img_np[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        raise ValueError("Anchor 图像不包含有效像素")

    cx, cy = (xs.min() + xs.max()) / 2.0, (ys.min() + ys.max()) / 2.0
    radius = max((xs.max() - xs.min()) / 2.0, (ys.max() - ys.min()) / 2.0)
    inner_r = radius * 0.76

    y_coords, x_coords = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = x_coords - cx
    dy = y_coords - cy
    dist = np.sqrt(dx * dx + dy * dy)

    inner_mask = (dist < inner_r).astype(np.float32)

    frames: List[Image.Image] = []

    for i in range(target_count):
        phase = 2.0 * math.pi * (i / float(target_count))
        s = (1.0 - math.cos(phase)) / 2.0  # 闭环 0.0 -> 1.0 -> 0.0

        # 象鼻位移 (扬起与卷曲)
        trunk_weight = np.clip((dx + 0.1 * radius) / radius, 0, 1) ** 1.5 * inner_mask
        disp_x = -14.0 * s * trunk_weight * (1.0 + dy / radius)
        disp_y = -22.0 * s * trunk_weight * (1.0 + dx / radius)

        # 双耳随呼吸抖动
        ear_left_weight = np.clip((-dx - 0.2 * radius) / radius, 0, 1) ** 2 * inner_mask
        ear_right_weight = np.clip((dx - 0.3 * radius) / radius, 0, 1) ** 2 * inner_mask
        disp_x += (-4.0 * s * ear_left_weight) + (4.0 * s * ear_right_weight)
        disp_y += -3.0 * s * (ear_left_weight + ear_right_weight)

        src_x = np.clip(x_coords - disp_x, 0, w - 1)
        src_y = np.clip(y_coords - disp_y, 0, h - 1)

        x0 = np.floor(src_x).astype(np.int32)
        x1 = np.minimum(x0 + 1, w - 1)
        y0 = np.floor(src_y).astype(np.int32)
        y1 = np.minimum(y0 + 1, h - 1)

        wx = (src_x - x0)[:, :, np.newaxis]
        wy = (src_y - y0)[:, :, np.newaxis]

        ia = img_np[y0, x0]
        ib = img_np[y0, x1]
        ic = img_np[y1, x0]
        id_pix = img_np[y1, x1]

        top_blend = ia * (1.0 - wx) + ib * wx
        bot_blend = ic * (1.0 - wx) + id_pix * wx
        warped_np = top_blend * (1.0 - wy) + bot_blend * wy

        warped_img = Image.fromarray(np.uint8(np.clip(warped_np, 0, 255)), mode="RGBA")
        locked_frame = lock_frame_border(warped_img, anchor_rgba)
        frames.append(locked_frame)

    return frames


def render_sheet(frames: Sequence[Image.Image], columns: int = 6) -> Image.Image:
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
    frame_duration_ms: int = 50,
    target_frame_count: int = 24,
) -> List[Path]:
    """生成零割裂极滑象鸣动画帧及预览文件。"""
    with Image.open(anchor_path) as a_file:
        anchor = a_file.convert("RGBA")

    # 基于纯源图 Mesh 变形生成 100% 同颜色的 24 帧动画
    smooth_frames = generate_mesh_deformation_sequence(anchor, target_count=target_frame_count)
    final_frames = [f.resize((frame_size, frame_size), Image.Resampling.LANCZOS) for f in smooth_frames]

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

    render_sheet(final_frames, columns=6).save(
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
        optimize=False,
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
    parser.add_argument("--frame-duration-ms", type=int, default=50, help="GIF 单帧毫秒")
    parser.add_argument("--target-frame-count", type=int, default=24, help="总帧数")
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
