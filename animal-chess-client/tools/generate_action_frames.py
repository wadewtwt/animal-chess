from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Final
from uuid import uuid4

from PIL import Image, ImageEnhance


@dataclass(frozen=True)
class MotionFrame:
    x: int
    y: int
    scale_x: float
    scale_y: float
    angle: float
    brightness: float = 1.0


ROOT: Final[Path] = Path(__file__).resolve().parents[1]
SOURCE_DIR: Final[Path] = ROOT / "assets" / "textures" / "animals"
OUTPUT_DIR: Final[Path] = ROOT / "assets" / "resources" / "animal_actions"
CANVAS_SIZE: Final[int] = 384

MOTIONS: Final[dict[str, list[MotionFrame]]] = {
    "rat": [
        MotionFrame(0, 0, 1.00, 1.00, 0),
        MotionFrame(-18, 2, 1.08, 0.92, -8, 1.04),
        MotionFrame(20, 6, 1.12, 0.88, 8, 1.08),
        MotionFrame(-14, 3, 0.98, 1.06, -6),
        MotionFrame(16, 8, 1.14, 0.86, 7, 1.08),
        MotionFrame(-7, 4, 1.00, 1.04, -4),
        MotionFrame(4, 1, 1.03, 0.98, 2),
        MotionFrame(0, 0, 1.00, 1.00, 0),
    ],
    "cat": [
        MotionFrame(0, 0, 1.00, 1.00, 0),
        MotionFrame(0, 6, 0.94, 1.12, -4),
        MotionFrame(0, 15, 0.90, 1.20, 4, 1.05),
        MotionFrame(8, 13, 1.08, 0.95, 7),
        MotionFrame(-8, 9, 1.10, 0.92, -7),
        MotionFrame(0, 7, 0.98, 1.06, 0),
        MotionFrame(0, 3, 1.03, 0.98, 2),
        MotionFrame(0, 0, 1.00, 1.00, 0),
    ],
    "dog": [
        MotionFrame(0, 0, 1.00, 1.00, 0),
        MotionFrame(0, 7, 1.12, 0.86, 0),
        MotionFrame(0, 34, 0.90, 1.16, -8, 1.05),
        MotionFrame(0, 48, 0.95, 1.10, 7, 1.08),
        MotionFrame(0, 26, 1.02, 0.98, -4),
        MotionFrame(0, 0, 1.20, 0.82, 0),
        MotionFrame(0, 6, 0.96, 1.08, 0),
        MotionFrame(0, 0, 1.00, 1.00, 0),
    ],
    "wolf": [
        MotionFrame(0, 0, 1.00, 1.00, 0),
        MotionFrame(0, 6, 0.98, 1.06, -5),
        MotionFrame(0, 14, 0.96, 1.12, -12),
        MotionFrame(0, 16, 0.96, 1.14, -16, 1.06),
        MotionFrame(2, 12, 1.04, 1.04, -12),
        MotionFrame(-2, 8, 1.07, 0.96, -6),
        MotionFrame(0, 4, 1.02, 1.00, -2),
        MotionFrame(0, 0, 1.00, 1.00, 0),
    ],
    "leopard": [
        MotionFrame(0, 0, 1.00, 1.00, 0),
        MotionFrame(-10, 0, 0.94, 1.06, -4),
        MotionFrame(-20, -3, 0.90, 1.10, -7),
        MotionFrame(34, 13, 1.20, 0.84, 9, 1.08),
        MotionFrame(18, 8, 1.12, 0.90, 5),
        MotionFrame(0, 1, 1.16, 0.86, 0),
        MotionFrame(0, 6, 0.98, 1.05, -2),
        MotionFrame(0, 0, 1.00, 1.00, 0),
    ],
    "tiger": [
        MotionFrame(0, 0, 1.00, 1.00, 0),
        MotionFrame(-9, 0, 0.94, 1.06, -4),
        MotionFrame(-18, -2, 0.90, 1.10, -7),
        MotionFrame(30, 12, 1.20, 0.84, 9, 1.08),
        MotionFrame(16, 8, 1.12, 0.90, 5),
        MotionFrame(0, 1, 1.16, 0.86, 0),
        MotionFrame(0, 5, 0.98, 1.05, -2),
        MotionFrame(0, 0, 1.00, 1.00, 0),
    ],
    "lion": [
        MotionFrame(0, 0, 1.00, 1.00, 0),
        MotionFrame(0, 8, 0.98, 1.08, -3),
        MotionFrame(0, 20, 1.08, 1.08, 4, 1.06),
        MotionFrame(-5, 22, 1.16, 1.00, -5, 1.10),
        MotionFrame(5, 20, 1.18, 0.98, 5, 1.10),
        MotionFrame(-3, 12, 1.12, 0.96, -3),
        MotionFrame(0, 5, 1.04, 1.00, 0),
        MotionFrame(0, 0, 1.00, 1.00, 0),
    ],
    "elephant": [
        MotionFrame(0, 0, 1.00, 1.00, 0),
        MotionFrame(0, 6, 0.96, 1.08, 3),
        MotionFrame(0, 18, 0.94, 1.16, 7, 1.04),
        MotionFrame(6, 24, 0.98, 1.20, 10, 1.06),
        MotionFrame(-6, 20, 1.08, 1.02, -9, 1.04),
        MotionFrame(0, 10, 1.14, 0.92, 0),
        MotionFrame(0, 4, 1.05, 0.98, 2),
        MotionFrame(0, 0, 1.00, 1.00, 0),
    ],
}


def contain_image(image: Image.Image, max_size: int) -> Image.Image:
    width, height = image.size
    scale = min(max_size / width, max_size / height)
    target_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return image.resize(target_size, Image.Resampling.LANCZOS)


def transform_frame(source: Image.Image, frame: MotionFrame) -> Image.Image:
    width = max(1, round(source.width * frame.scale_x))
    height = max(1, round(source.height * frame.scale_y))
    transformed = source.resize((width, height), Image.Resampling.BICUBIC)
    transformed = transformed.rotate(frame.angle, expand=True, resample=Image.Resampling.BICUBIC)

    if frame.brightness != 1.0:
        transformed = ImageEnhance.Brightness(transformed).enhance(frame.brightness)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    x = (CANVAS_SIZE - transformed.width) // 2 + frame.x
    y = (CANVAS_SIZE - transformed.height) // 2 - frame.y
    canvas.alpha_composite(transformed, (x, y))
    return canvas


def write_json_if_missing(path: Path, payload: dict) -> None:
    if path.exists():
        return
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def ensure_directory_meta(directory: Path) -> None:
    write_json_if_missing(
        directory.with_suffix(directory.suffix + ".meta"),
        {
            "ver": "1.2.0",
            "importer": "directory",
            "imported": True,
            "uuid": str(uuid4()),
            "files": [],
            "subMetas": {},
            "userData": {},
        },
    )


def ensure_image_meta(image_path: Path, display_name: str) -> None:
    image_uuid = str(uuid4())
    write_json_if_missing(
        image_path.with_suffix(image_path.suffix + ".meta"),
        {
            "ver": "1.0.27",
            "importer": "image",
            "imported": True,
            "uuid": image_uuid,
            "files": [".json", ".png"],
            "subMetas": {
                "6c48a": {
                    "importer": "texture",
                    "uuid": f"{image_uuid}@6c48a",
                    "displayName": display_name,
                    "id": "6c48a",
                    "name": "texture",
                    "userData": {
                        "wrapModeS": "clamp-to-edge",
                        "wrapModeT": "clamp-to-edge",
                        "minfilter": "linear",
                        "magfilter": "linear",
                        "mipfilter": "none",
                        "anisotropy": 0,
                        "isUuid": True,
                        "imageUuidOrDatabaseUri": image_uuid,
                        "visible": False,
                    },
                    "ver": "1.0.22",
                    "imported": True,
                    "files": [".json"],
                    "subMetas": {},
                },
                "f9941": {
                    "importer": "sprite-frame",
                    "uuid": f"{image_uuid}@f9941",
                    "displayName": display_name,
                    "id": "f9941",
                    "name": "spriteFrame",
                    "userData": {
                        "trimThreshold": 1,
                        "rotated": False,
                        "offsetX": 0,
                        "offsetY": 0,
                        "trimX": 0,
                        "trimY": 0,
                        "width": CANVAS_SIZE,
                        "height": CANVAS_SIZE,
                        "rawWidth": CANVAS_SIZE,
                        "rawHeight": CANVAS_SIZE,
                        "borderTop": 0,
                        "borderBottom": 0,
                        "borderLeft": 0,
                        "borderRight": 0,
                        "packable": True,
                        "pixelsToUnit": 100,
                        "pivotX": 0.5,
                        "pivotY": 0.5,
                        "meshType": 0,
                        "vertices": {
                            "rawPosition": [
                                -192,
                                -192,
                                0,
                                192,
                                -192,
                                0,
                                -192,
                                192,
                                0,
                                192,
                                192,
                                0,
                            ],
                            "indexes": [0, 1, 2, 2, 1, 3],
                            "uv": [0, 384, 384, 384, 0, 0, 384, 0],
                            "nuv": [0, 0, 1, 0, 0, 1, 1, 1],
                            "minPos": [-192, -192, 0],
                            "maxPos": [192, 192, 0],
                        },
                        "isUuid": True,
                        "imageUuidOrDatabaseUri": f"{image_uuid}@6c48a",
                        "atlasUuid": "",
                        "trimType": "auto",
                    },
                    "ver": "1.0.12",
                    "imported": True,
                    "files": [".json"],
                    "subMetas": {},
                },
            },
            "userData": {
                "type": "sprite-frame",
                "hasAlpha": True,
                "fixAlphaTransparencyArtifacts": False,
                "redirect": f"{image_uuid}@6c48a",
            },
        },
    )


def main() -> None:
    ensure_directory_meta(OUTPUT_DIR)
    for animal_name, frames in MOTIONS.items():
        source_path = SOURCE_DIR / f"{animal_name}.png"
        if not source_path.exists():
            raise FileNotFoundError(f"缺少源图: {source_path}")

        source = Image.open(source_path).convert("RGBA")
        source = contain_image(source, 300)

        target_dir = OUTPUT_DIR / animal_name
        target_dir.mkdir(parents=True, exist_ok=True)
        ensure_directory_meta(target_dir)

        for index, motion_frame in enumerate(frames):
            output_path = target_dir / f"show_{index:02d}.png"
            transform_frame(source, motion_frame).save(output_path)
            ensure_image_meta(output_path, output_path.stem)
            print(output_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
