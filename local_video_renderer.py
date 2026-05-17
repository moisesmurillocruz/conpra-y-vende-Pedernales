#!/usr/bin/env python3
"""Local batch video renderer powered by FFmpeg."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


IMAGE_SUFFIXES = {".apng", ".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"}
DEFAULT_FONT_PATHS = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
)


@dataclass(frozen=True)
class RenderJob:
    job_id: str
    title: str
    subtitle: str
    duration: float
    width: int
    height: int
    fps: int
    background: str
    source: str | None
    audio: str | None
    output_name: str
    font_color: str
    subtitle_color: str
    font_size: int
    subtitle_size: int
    font_file: str | None
    crf: int
    preset: str
    video_bitrate: str | None


@dataclass(frozen=True)
class RenderResult:
    job_id: str
    output_path: str
    command: list[str]
    return_code: int
    stderr: str


def load_plan(config_path: Path) -> list[RenderJob]:
    data = json.loads(config_path.read_text(encoding="utf-8"))
    defaults = data.get("defaults", {})
    raw_jobs: list[dict[str, Any]] = []

    if "count" in data:
        count = int(data["count"])
        if count < 1:
            raise ValueError("count must be greater than zero")
        template = data.get("job_template", {})
        raw_jobs.extend(_expand_template(template, index) for index in range(1, count + 1))

    raw_jobs.extend(data.get("jobs", []))
    if not raw_jobs:
        raise ValueError("configuration must define jobs or count/job_template")

    jobs: list[RenderJob] = []
    for position, raw_job in enumerate(raw_jobs, start=1):
        merged = {**defaults, **raw_job}
        job_id = str(merged.get("id") or f"video-{position:03d}")
        output_name = str(merged.get("output_name") or f"{_slugify(job_id)}.mp4")
        if not output_name.lower().endswith(".mp4"):
            output_name = f"{output_name}.mp4"

        jobs.append(
            RenderJob(
                job_id=job_id,
                title=str(merged.get("title") or job_id),
                subtitle=str(merged.get("subtitle") or ""),
                duration=_positive_float(merged.get("duration", 8), "duration"),
                width=_positive_int(merged.get("width", 1280), "width"),
                height=_positive_int(merged.get("height", 720), "height"),
                fps=_positive_int(merged.get("fps", 30), "fps"),
                background=normalize_color(str(merged.get("background", "#101827"))),
                source=_optional_path(merged.get("source") or merged.get("background_source"), config_path),
                audio=_optional_path(merged.get("audio"), config_path),
                output_name=output_name,
                font_color=normalize_color(str(merged.get("font_color", "white"))),
                subtitle_color=normalize_color(str(merged.get("subtitle_color", "white"))),
                font_size=_positive_int(merged.get("font_size", 64), "font_size"),
                subtitle_size=_positive_int(merged.get("subtitle_size", 34), "subtitle_size"),
                font_file=_optional_path(merged.get("font_file"), config_path),
                crf=_positive_int(merged.get("crf", 20), "crf"),
                preset=str(merged.get("preset", "medium")),
                video_bitrate=merged.get("video_bitrate"),
            )
        )

    return jobs


def build_ffmpeg_command(
    job: RenderJob,
    output_dir: Path,
    encoder: str,
    text_dir: Path,
    overwrite: bool = True,
) -> tuple[list[str], Path]:
    output_path = output_dir / _safe_output_name(job.output_name)
    selected_encoder = choose_encoder(encoder)
    title_file = _write_text_file(text_dir, f"{job.job_id}-title.txt", _wrap_text(job.title, 28))
    subtitle_file = _write_text_file(text_dir, f"{job.job_id}-subtitle.txt", _wrap_text(job.subtitle, 42))

    command = ["ffmpeg", "-y" if overwrite else "-n", "-hide_banner", "-loglevel", "error"]
    command.extend(_input_args(job))
    command.extend(["-vf", _video_filter(job, title_file, subtitle_file)])

    if job.audio:
        command.extend(["-map", "0:v:0", "-map", "1:a:0", "-shortest", "-t", _duration(job.duration)])
        command.extend(["-c:a", "aac", "-b:a", "192k"])
    else:
        command.append("-an")

    command.extend(_encoder_args(selected_encoder, job))
    command.extend(["-movflags", "+faststart", str(output_path)])
    return command, output_path


def render_job(job: RenderJob, output_dir: Path, encoder: str, overwrite: bool = True) -> RenderResult:
    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="local-video-renderer-") as temp_root:
        command, output_path = build_ffmpeg_command(job, output_dir, encoder, Path(temp_root), overwrite)
        completed = subprocess.run(command, text=True, capture_output=True, check=False)
        return RenderResult(job.job_id, str(output_path), command, completed.returncode, completed.stderr)


def render_all(
    jobs: list[RenderJob],
    output_dir: Path,
    encoder: str,
    workers: int | str,
    dry_run: bool,
    overwrite: bool,
) -> int:
    worker_count = determine_workers(workers, len(jobs))
    print(f"Rendering {len(jobs)} video(s) locally with {worker_count} worker(s).")
    print(f"Encoder: {choose_encoder(encoder)}")

    if dry_run:
        with tempfile.TemporaryDirectory(prefix="local-video-renderer-dry-run-") as temp_root:
            for job in jobs:
                command, output_path = build_ffmpeg_command(job, output_dir, encoder, Path(temp_root), overwrite)
                print(f"\n[{job.job_id}] -> {output_path}")
                print(shlex_join(command))
        return 0

    failures: list[RenderResult] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=worker_count) as executor:
        future_to_job = {
            executor.submit(render_job, job, output_dir, encoder, overwrite): job for job in jobs
        }
        for future in concurrent.futures.as_completed(future_to_job):
            result = future.result()
            if result.return_code == 0:
                print(f"[ok] {result.job_id} -> {result.output_path}")
            else:
                failures.append(result)
                print(f"[failed] {result.job_id}", file=sys.stderr)
                print(result.stderr.strip(), file=sys.stderr)

    if failures:
        print(f"{len(failures)} render job(s) failed.", file=sys.stderr)
        return 1
    return 0


def choose_encoder(requested: str) -> str:
    normalized = requested.lower()
    if normalized in {"cpu", "libx264"}:
        return "libx264"
    if normalized in {"nvidia", "nvenc", "h264_nvenc"}:
        return "h264_nvenc"
    if normalized in {"intel", "qsv", "h264_qsv"}:
        return "h264_qsv"
    if normalized in {"amd", "amf", "h264_amf"}:
        return "h264_amf"
    if normalized != "auto":
        return requested

    if _has_nvidia_runtime() and _ffmpeg_encoder_exists("h264_nvenc"):
        return "h264_nvenc"
    return "libx264"


def determine_workers(requested: int | str, job_count: int) -> int:
    if job_count < 1:
        return 1
    if isinstance(requested, int) or str(requested).isdigit():
        return max(1, min(int(requested), job_count))

    cpu_count = os.cpu_count() or 1
    cpu_target = max(1, cpu_count - 1)
    ram_target = max(1, _total_memory_gib() // 1)
    return max(1, min(job_count, cpu_target, ram_target))


def normalize_color(value: str) -> str:
    value = value.strip()
    if re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return f"0x{value[1:]}"
    return value


def shlex_join(command: Iterable[str]) -> str:
    return " ".join(_shell_quote(part) for part in command)


def write_example_config(path: Path, count: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    example = {
        "defaults": {
            "width": 1280,
            "height": 720,
            "fps": 30,
            "duration": 8,
            "background": "#101827",
            "font_color": "white",
            "subtitle_color": "#dbeafe",
            "font_size": 64,
            "subtitle_size": 34,
            "crf": 20,
            "preset": "medium",
        },
        "count": count,
        "job_template": {
            "id": "video-{index:03d}",
            "title": "Video local {index:03d}",
            "subtitle": "Renderizado sin servidores externos usando FFmpeg local",
            "output_name": "video-{index:03d}.mp4",
        },
    }
    path.write_text(json.dumps(example, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Render 100+ videos locally with FFmpeg.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init-config", help="create a 100-video config template")
    init_parser.add_argument("--path", type=Path, default=Path("configs/example_100_videos.json"))
    init_parser.add_argument("--count", type=int, default=100)

    render_parser = subparsers.add_parser("render", help="render videos from a JSON config")
    render_parser.add_argument("--config", type=Path, required=True)
    render_parser.add_argument("--output-dir", type=Path, default=Path("renders"))
    render_parser.add_argument("--workers", default="auto", help="'auto' or a positive integer")
    render_parser.add_argument("--encoder", default="auto", help="auto, cpu, nvidia, intel, amd, or ffmpeg encoder")
    render_parser.add_argument("--limit", type=int, help="render only the first N jobs")
    render_parser.add_argument("--dry-run", action="store_true")
    render_parser.add_argument("--no-overwrite", action="store_true")

    encoder_parser = subparsers.add_parser("list-encoders", help="show local FFmpeg H.264 encoders")
    encoder_parser.set_defaults(list_encoders=True)

    args = parser.parse_args(argv)
    _ensure_ffmpeg()

    if args.command == "init-config":
        write_example_config(args.path, args.count)
        print(f"Wrote {args.path} with {args.count} local render jobs.")
        return 0

    if args.command == "list-encoders":
        print(_ffmpeg_h264_encoders())
        return 0

    jobs = load_plan(args.config)
    if args.limit is not None:
        jobs = jobs[: max(0, args.limit)]
    if not jobs:
        raise SystemExit("No jobs selected.")

    return render_all(jobs, args.output_dir, args.encoder, args.workers, args.dry_run, not args.no_overwrite)


def _encoder_args(encoder: str, job: RenderJob) -> list[str]:
    args = ["-c:v", encoder]
    if job.video_bitrate:
        args.extend(["-b:v", str(job.video_bitrate)])
    elif encoder == "libx264":
        args.extend(["-preset", job.preset, "-crf", str(job.crf)])
    elif encoder == "h264_nvenc":
        args.extend(["-preset", "p4", "-cq", str(job.crf), "-b:v", "0"])
    return args


def _expand_template(template: dict[str, Any], index: int) -> dict[str, Any]:
    context = {"index": index, "index0": index - 1}
    return {key: _format_template_value(value, context) for key, value in template.items()}


def _format_template_value(value: Any, context: dict[str, int]) -> Any:
    if isinstance(value, str):
        return value.format(**context)
    if isinstance(value, list):
        return [_format_template_value(item, context) for item in value]
    if isinstance(value, dict):
        return {key: _format_template_value(item, context) for key, item in value.items()}
    return value


def _input_args(job: RenderJob) -> list[str]:
    if job.source:
        source_path = Path(job.source)
        if source_path.suffix.lower() in IMAGE_SUFFIXES:
            args = ["-loop", "1", "-t", _duration(job.duration), "-i", job.source]
        else:
            args = ["-stream_loop", "-1", "-t", _duration(job.duration), "-i", job.source]
    else:
        args = [
            "-f",
            "lavfi",
            "-i",
            f"color=c={job.background}:s={job.width}x{job.height}:r={job.fps}:d={_duration(job.duration)}",
        ]

    if job.audio:
        args.extend(["-stream_loop", "-1", "-i", job.audio])
    return args


def _video_filter(job: RenderJob, title_file: Path, subtitle_file: Path) -> str:
    filters = []
    if job.source:
        filters.append(
            f"scale={job.width}:{job.height}:force_original_aspect_ratio=increase,"
            f"crop={job.width}:{job.height},fps={job.fps}"
        )
    filters.append("format=yuv420p")

    font_file = job.font_file or _default_font_file()
    title_y = f"({job.height}-text_h)/2-{max(40, job.subtitle_size + 36)}"
    filters.append(
        "drawtext="
        f"fontfile={_filter_quote(font_file)}:"
        f"textfile={_filter_quote(str(title_file))}:"
        f"fontcolor={job.font_color}:fontsize={job.font_size}:"
        "x=(w-text_w)/2:"
        f"y={title_y}:"
        "line_spacing=12:box=1:boxcolor=black@0.35:boxborderw=24"
    )
    if job.subtitle:
        filters.append(
            "drawtext="
            f"fontfile={_filter_quote(font_file)}:"
            f"textfile={_filter_quote(str(subtitle_file))}:"
            f"fontcolor={job.subtitle_color}:fontsize={job.subtitle_size}:"
            "x=(w-text_w)/2:"
            f"y=({job.height}-text_h)/2+{max(18, job.font_size // 2)}:"
            "line_spacing=8"
        )
    return ",".join(filters)


def _write_text_file(directory: Path, filename: str, content: str) -> Path:
    path = directory / _safe_output_name(filename)
    path.write_text(content, encoding="utf-8")
    return path


def _default_font_file() -> str:
    for candidate in DEFAULT_FONT_PATHS:
        if Path(candidate).exists():
            return candidate
    raise FileNotFoundError("No default bold font was found; set font_file in your config.")


def _optional_path(value: Any, config_path: Path) -> str | None:
    if value in (None, ""):
        return None
    path = Path(str(value)).expanduser()
    if not path.is_absolute():
        path = (config_path.parent / path).resolve()
    return str(path)


def _positive_int(value: Any, name: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise ValueError(f"{name} must be greater than zero")
    return parsed


def _positive_float(value: Any, name: str) -> float:
    parsed = float(value)
    if parsed <= 0:
        raise ValueError(f"{name} must be greater than zero")
    return parsed


def _safe_output_name(name: str) -> str:
    return Path(name).name


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip()).strip("-")
    return slug or "video"


def _wrap_text(value: str, width: int) -> str:
    if not value:
        return ""
    return "\n".join(textwrap.wrap(value, width=width, break_long_words=False)) or value


def _filter_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    return f"'{escaped}'"


def _shell_quote(value: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_./:=@%+-]+", value):
        return value
    return "'" + value.replace("'", "'\"'\"'") + "'"


def _duration(value: float) -> str:
    return f"{value:.3f}".rstrip("0").rstrip(".")


def _ensure_ffmpeg() -> None:
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is required. Install it locally and run this command again.")


def _ffmpeg_encoder_exists(name: str) -> bool:
    return name in _ffmpeg_h264_encoders()


def _ffmpeg_h264_encoders() -> str:
    completed = subprocess.run(
        ["ffmpeg", "-hide_banner", "-encoders"],
        text=True,
        capture_output=True,
        check=False,
    )
    return "\n".join(line for line in completed.stdout.splitlines() if "h264" in line.lower())


def _has_nvidia_runtime() -> bool:
    return Path("/proc/driver/nvidia/version").exists() or shutil.which("nvidia-smi") is not None


def _total_memory_gib() -> int:
    try:
        page_size = os.sysconf("SC_PAGE_SIZE")
        page_count = os.sysconf("SC_PHYS_PAGES")
    except (AttributeError, ValueError, OSError):
        return 1
    return max(1, int(page_size * page_count / (1024**3)))


if __name__ == "__main__":
    raise SystemExit(main())
