#!/usr/bin/env python3
"""Local batch video renderer powered by FFmpeg."""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


IMAGE_SUFFIXES = {".apng", ".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"}
VIDEO_SUFFIXES = {".avi", ".m4v", ".mkv", ".mov", ".mp4", ".webm"}
AUDIO_SUFFIXES = {".aac", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav"}
GREEN = "\033[92m"
RESET = "\033[0m"
AVATAR_POSITIONS = {
    "bottom_center": ("(main_w-overlay_w)/2", "main_h-overlay_h-40"),
    "bottom_right": ("main_w-overlay_w-40", "main_h-overlay_h-40"),
    "bottom_left": ("40", "main_h-overlay_h-40"),
    "top_right": ("main_w-overlay_w-40", "40"),
    "top_left": ("40", "40"),
}
AVATAR_POSITION_ALIASES = {
    "medio_abajo": "bottom_center",
    "centro_abajo": "bottom_center",
    "abajo_medio": "bottom_center",
    "derecha_abajo": "bottom_right",
    "abajo_derecha": "bottom_right",
    "izquierda_abajo": "bottom_left",
    "abajo_izquierda": "bottom_left",
    "derecha_arriba": "top_right",
    "arriba_derecha": "top_right",
    "izquierda_arriba": "top_left",
    "arriba_izquierda": "top_left",
}
DEFAULT_FONT_PATHS = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
)
MOITHANO_NICHES = [
    "casos de la vida real",
    "historias de Dios",
    "verdad o falso",
    "preguntas biblicas A B C D",
    "historias por capitulos",
    "reflexiones profundas",
    "superacion personal",
    "familia y valores",
    "milagros y testimonios",
    "misterios historicos",
    "datos curiosos",
    "experimentos cientificos",
    "salud y bienestar",
    "educacion y aprendizaje",
    "motivacion personal",
    "relaciones humanas",
    "criminalistica y detectives",
    "naturaleza y medio ambiente",
    "universo y astronomia",
    "animales salvajes",
    "tecnologia e innovacion",
    "historias militares",
    "geopolitica y conflictos",
    "boxeo e historia del combate",
    "futbol y deporte",
    "peliculas y analisis",
    "arqueologia",
    "mitos y leyendas",
    "fabulas y cuentos morales",
    "historias de drama real",
    "preguntas hipoteticas",
    "contenido biblico familiar",
    "enigmas sin resolver",
    "documentales cortos",
    "biografias impactantes",
    "emprendimiento",
    "finanzas personales",
    "seguridad digital",
    "psicologia cotidiana",
    "historia universal",
    "cultura latina",
    "curiosidades de animales",
    "historias de rescate",
    "lecciones para jovenes",
    "consejos para padres",
    "oraciones y meditaciones",
    "retos de conocimiento",
    "antes y despues",
    "leyendas urbanas",
    "historias de esperanza",
]


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
    voice_audio: str | None
    music: str | None
    music_volume: int
    presentation_mode: str
    avatar: str | None
    avatar_position: str
    avatar_size_percent: int
    niche: str
    chapter: int | None
    story_id: str
    sequence: int
    question: str
    options: list[str]
    correct_answer: str
    voice_provider: str
    voice_name: str
    military_border: bool


@dataclass(frozen=True)
class RenderResult:
    job_id: str
    output_path: str
    command: list[str]
    return_code: int
    stderr: str
    size_bytes: int = 0
    elapsed_seconds: float = 0.0
    skipped: bool = False


@dataclass(frozen=True)
class InputLayout:
    voice_index: int | None = None
    music_index: int | None = None
    avatar_index: int | None = None


def load_plan(config_path: Path) -> list[RenderJob]:
    data = json.loads(config_path.read_text(encoding="utf-8"))
    defaults = data.get("defaults", {})
    folders = data.get("folders", {})
    music_dir = _optional_path(folders.get("music_dir") or folders.get("music"), config_path)
    avatar_dir = _optional_path(folders.get("avatar_dir") or folders.get("avatars"), config_path)
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
                voice_audio=_optional_path(merged.get("voice_audio") or merged.get("audio"), config_path),
                music=_asset_path(merged.get("music"), music_dir, config_path, AUDIO_SUFFIXES),
                music_volume=_bounded_int(merged.get("music_volume", 35), "music_volume", 1, 200),
                presentation_mode=normalize_presentation_mode(str(merged.get("presentation_mode", "voice_only"))),
                avatar=_asset_path(merged.get("avatar"), avatar_dir, config_path, IMAGE_SUFFIXES | VIDEO_SUFFIXES),
                avatar_position=normalize_avatar_position(str(merged.get("avatar_position", "bottom_right"))),
                avatar_size_percent=_bounded_int(
                    merged.get("avatar_size_percent", 28), "avatar_size_percent", 5, 100
                ),
                niche=str(merged.get("niche", "")),
                chapter=_optional_int(merged.get("chapter")),
                story_id=str(merged.get("story_id", "historia-principal")),
                sequence=_positive_int(merged.get("sequence", merged.get("chapter", position)), "sequence"),
                question=str(merged.get("question", "")),
                options=[str(option) for option in merged.get("options", [])],
                correct_answer=str(merged.get("correct_answer", "")),
                voice_provider=str(merged.get("voice_provider", "microsoft_edge")),
                voice_name=str(merged.get("voice_name", "auto")),
                military_border=_bool_value(merged.get("military_border", True)),
            )
        )

    return jobs


def validate_jobs(
    jobs: list[RenderJob],
    output_dir: Path,
    processed_hashes: set[str] | None = None,
) -> list[str]:
    errors: list[str] = []
    seen_ids: set[str] = set()
    seen_outputs: dict[str, str] = {}
    seen_content_hashes: dict[str, str] = {}
    seen_story_sequences: dict[tuple[str, int], str] = {}
    processed_hashes = processed_hashes or set()

    for job in jobs:
        if job.job_id in seen_ids:
            errors.append(f"duplicate job id: {job.job_id}")
        seen_ids.add(job.job_id)

        story_key = (job.story_id, job.sequence)
        if story_key in seen_story_sequences:
            errors.append(
                f"{job.job_id}: story sequence {job.sequence} collides with "
                f"{seen_story_sequences[story_key]} in {job.story_id}"
            )
        seen_story_sequences[story_key] = job.job_id

        digest = content_hash(job)
        if digest in seen_content_hashes:
            errors.append(f"{job.job_id}: repeated content/questions from {seen_content_hashes[digest]}")
        seen_content_hashes[digest] = job.job_id
        if digest in processed_hashes:
            errors.append(f"{job.job_id}: content hash was already processed: {digest}")

        if Path(job.output_name).name != job.output_name:
            errors.append(f"{job.job_id}: output_name must be a file name, not a path")

        output_key = str((output_dir / _safe_output_name(job.output_name)).resolve()).casefold()
        if output_key in seen_outputs:
            errors.append(
                f"{job.job_id}: output collides with {seen_outputs[output_key]} at {job.output_name}"
            )
        seen_outputs[output_key] = job.job_id

        if job.width % 2 or job.height % 2:
            errors.append(f"{job.job_id}: width and height must be even for H.264/yuv420p")

        for label, raw_path in (
            ("source", job.source),
            ("audio", job.audio),
            ("voice_audio", job.voice_audio),
            ("music", job.music),
            ("avatar", job.avatar),
            ("font_file", job.font_file),
        ):
            if raw_path and not Path(raw_path).exists():
                errors.append(f"{job.job_id}: {label} does not exist: {raw_path}")

        if job.presentation_mode == "avatar" and not job.avatar:
            errors.append(f"{job.job_id}: presentation_mode avatar requires avatar")

    return errors


def content_hash(job: RenderJob) -> str:
    if job.question:
        content = {
            "kind": "question",
            "question": _normalize_hash_text(job.question),
            "options": [_normalize_hash_text(option) for option in job.options],
            "correct_answer": _normalize_hash_text(job.correct_answer),
        }
    else:
        content = {
            "kind": "story",
            "niche": _normalize_hash_text(job.niche),
            "title": _normalize_hash_text(job.title),
            "subtitle": _normalize_hash_text(job.subtitle),
        }
    payload = json.dumps(content, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def load_hash_registry(path: Path | None) -> set[str]:
    if not path or not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return {str(item) for item in data}
    if isinstance(data, dict):
        hashes = data.get("hashes") or data.get("processed_hashes") or []
        return {str(item) for item in hashes}
    raise ValueError("hash registry must be a JSON list or object with hashes")


def write_hash_registry(path: Path, hashes: set[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(sorted(hashes), indent=2) + "\n", encoding="utf-8")


def build_ffmpeg_command(
    job: RenderJob,
    output_dir: Path,
    encoder: str,
    text_dir: Path,
    overwrite: bool = True,
) -> tuple[list[str], Path]:
    output_path = output_path_for_job(job, output_dir)
    selected_encoder = choose_encoder(encoder)
    title_file = _write_text_file(text_dir, f"{job.job_id}-title.txt", _wrap_text(job.title, 28))
    subtitle_file = _write_text_file(text_dir, f"{job.job_id}-subtitle.txt", _wrap_text(job.subtitle, 42))

    command = ["ffmpeg", "-y" if overwrite else "-n", "-hide_banner", "-loglevel", "error"]
    input_args, layout = _input_args(job)
    command.extend(input_args)

    filter_graph, audio_filter = _filter_graph(job, title_file, subtitle_file, layout)
    command.extend(["-filter_complex", filter_graph, "-map", "[vout]"])

    if audio_filter:
        command.extend(["-map", "[aout]", "-c:a", "aac", "-b:a", "192k"])
    elif layout.voice_index is not None:
        command.extend(["-map", f"{layout.voice_index}:a:0", "-c:a", "aac", "-b:a", "192k"])
    else:
        command.append("-an")

    command.extend(_encoder_args(selected_encoder, job))
    command.extend(["-t", _duration(job.duration), "-movflags", "+faststart", str(output_path)])
    return command, output_path


def output_path_for_job(job: RenderJob, output_dir: Path) -> Path:
    return output_dir / _safe_output_name(job.output_name)


def render_job(
    job: RenderJob,
    output_dir: Path,
    encoder: str,
    overwrite: bool = True,
    skip_existing: bool = False,
) -> RenderResult:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_path_for_job(job, output_dir)
    if skip_existing and output_path.exists() and output_path.stat().st_size > 0:
        return RenderResult(job.job_id, str(output_path), [], 0, "", output_path.stat().st_size, 0.0, True)

    with tempfile.TemporaryDirectory(prefix="local-video-renderer-") as temp_root:
        command, output_path = build_ffmpeg_command(job, output_dir, encoder, Path(temp_root), overwrite)
        started_at = time.perf_counter()
        completed = subprocess.run(command, text=True, capture_output=True, check=False)
        elapsed = time.perf_counter() - started_at
        size_bytes = output_path.stat().st_size if output_path.exists() else 0
        return RenderResult(
            job.job_id,
            str(output_path),
            command,
            completed.returncode,
            completed.stderr,
            size_bytes,
            elapsed,
        )


def render_all(
    jobs: list[RenderJob],
    output_dir: Path,
    encoder: str,
    workers: int | str,
    dry_run: bool,
    overwrite: bool,
    skip_existing: bool,
    manifest_path: Path | None,
    hash_registry_path: Path | None = None,
    processed_hashes: set[str] | None = None,
) -> int:
    worker_count = determine_workers(workers, len(jobs))
    selected_encoder = choose_encoder(encoder)
    processed_hashes = processed_hashes or set()
    print_stage_header("RENDERIZADO")
    print(f"Rendering {len(jobs)} video(s) locally with {worker_count} worker(s).")
    print(f"Encoder: {selected_encoder}")

    if dry_run:
        with tempfile.TemporaryDirectory(prefix="local-video-renderer-dry-run-") as temp_root:
            for job in jobs:
                command, output_path = build_ffmpeg_command(job, output_dir, encoder, Path(temp_root), overwrite)
                print(f"\n[{job.job_id}] -> {output_path}")
                print(shlex_join(command))
        return 0

    failures: list[RenderResult] = []
    results: list[RenderResult] = []
    started_at = time.perf_counter()
    generated_seconds = 0.0
    with concurrent.futures.ThreadPoolExecutor(max_workers=worker_count) as executor:
        future_to_job = {
            executor.submit(render_job, job, output_dir, selected_encoder, overwrite, skip_existing): job
            for job in jobs
        }
        completed_count = 0
        for future in concurrent.futures.as_completed(future_to_job):
            job = future_to_job[future]
            result = future.result()
            completed_count += 1
            progress = f"({completed_count}/{len(jobs)})"
            results.append(result)
            if result.skipped:
                generated_seconds += job.duration
                print(f"[skip] {progress} {result.job_id} -> {result.output_path}")
            elif result.return_code == 0:
                generated_seconds += job.duration
                print(
                    f"[ok] {progress} {result.job_id} -> {result.output_path} "
                    f"({result.size_bytes} bytes, {result.elapsed_seconds:.2f}s)"
                )
            else:
                failures.append(result)
                print(f"[failed] {progress} {result.job_id}", file=sys.stderr)
                print(result.stderr.strip(), file=sys.stderr)
            print_progress_line("RENDER", completed_count, len(jobs), started_at, generated_seconds)

    if manifest_path:
        write_manifest(manifest_path, jobs, results, output_dir, selected_encoder, worker_count)
        print(f"Wrote manifest: {manifest_path}")

    if hash_registry_path and not failures:
        updated_hashes = set(processed_hashes)
        successful_ids = {result.job_id for result in results if result.return_code == 0}
        for job in jobs:
            if job.job_id in successful_ids:
                updated_hashes.add(content_hash(job))
        write_hash_registry(hash_registry_path, updated_hashes)
        print(f"Wrote hash registry: {hash_registry_path}")

    if failures:
        print(f"{len(failures)} render job(s) failed.", file=sys.stderr)
        return 1
    return 0


def write_manifest(
    manifest_path: Path,
    jobs: list[RenderJob],
    results: list[RenderResult],
    output_dir: Path,
    encoder: str,
    worker_count: int,
) -> None:
    order = {job.job_id: index for index, job in enumerate(jobs)}
    ordered_results = sorted(results, key=lambda result: order.get(result.job_id, len(order)))
    payload = {
        "renderer": "local_video_renderer",
        "created_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "output_dir": str(output_dir),
        "encoder": encoder,
        "worker_count": worker_count,
        "totals": {
            "jobs": len(jobs),
            "ok": sum(1 for result in ordered_results if result.return_code == 0 and not result.skipped),
            "skipped": sum(1 for result in ordered_results if result.skipped),
            "failed": sum(1 for result in ordered_results if result.return_code != 0),
        },
        "results": [
            {
                "job_id": result.job_id,
                "content_hash": content_hash(jobs[order[result.job_id]]) if result.job_id in order else "",
                "niche": jobs[order[result.job_id]].niche if result.job_id in order else "",
                "chapter": jobs[order[result.job_id]].chapter if result.job_id in order else None,
                "story_id": jobs[order[result.job_id]].story_id if result.job_id in order else "",
                "sequence": jobs[order[result.job_id]].sequence if result.job_id in order else None,
                "presentation_mode": jobs[order[result.job_id]].presentation_mode if result.job_id in order else "",
                "voice_provider": jobs[order[result.job_id]].voice_provider if result.job_id in order else "",
                "voice_name": jobs[order[result.job_id]].voice_name if result.job_id in order else "",
                "status": "skipped" if result.skipped else "ok" if result.return_code == 0 else "failed",
                "output_path": result.output_path,
                "size_bytes": result.size_bytes,
                "elapsed_seconds": round(result.elapsed_seconds, 3),
                "command": result.command,
                "stderr": result.stderr.strip(),
            }
            for result in ordered_results
        ],
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def compile_stories(
    jobs: list[RenderJob],
    clips_dir: Path,
    final_dir: Path,
    story_id: str | None,
    output_name: str | None,
    manifest_path: Path | None,
) -> int:
    selected_jobs = [job for job in jobs if story_id is None or job.story_id == story_id]
    if not selected_jobs:
        print("No clips selected for compilation.", file=sys.stderr)
        return 2

    grouped: dict[str, list[RenderJob]] = {}
    for job in selected_jobs:
        grouped.setdefault(job.story_id, []).append(job)

    final_dir.mkdir(parents=True, exist_ok=True)
    print_stage_header("COMPILADOR DE VIDEOS")
    started_at = time.perf_counter()
    compiled: list[dict[str, Any]] = []
    failures = 0
    total_groups = len(grouped)

    with tempfile.TemporaryDirectory(prefix="moithano-compile-") as temp_root:
        for index, (group_story_id, group_jobs) in enumerate(sorted(grouped.items()), start=1):
            ordered_jobs = sorted(group_jobs, key=lambda job: (job.sequence, job.chapter or 0, job.job_id))
            clip_paths = [output_path_for_job(job, clips_dir) for job in ordered_jobs]
            missing = [str(path) for path in clip_paths if not path.exists()]
            if missing:
                failures += 1
                print(f"[failed] {group_story_id}: missing clips: {', '.join(missing)}", file=sys.stderr)
                continue

            target_name = output_name if output_name and total_groups == 1 else f"{_slugify(group_story_id)}.mp4"
            if not target_name.lower().endswith(".mp4"):
                target_name = f"{target_name}.mp4"
            output_path = final_dir / _safe_output_name(target_name)
            list_path = Path(temp_root) / f"{_slugify(group_story_id)}.txt"
            list_path.write_text(
                "".join(f"file '{str(path).replace(chr(39), chr(39) + chr(92) + chr(39) + chr(39))}'\n" for path in clip_paths),
                encoding="utf-8",
            )

            command = [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_path),
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                str(output_path),
            ]
            completed = subprocess.run(command, text=True, capture_output=True, check=False)
            generated_seconds = sum(job.duration for job in ordered_jobs)
            if completed.returncode == 0:
                print(f"[ok] {group_story_id} -> {output_path} ({len(ordered_jobs)} clips)")
            else:
                failures += 1
                print(f"[failed] {group_story_id}", file=sys.stderr)
                print(completed.stderr.strip(), file=sys.stderr)

            compiled.append(
                {
                    "story_id": group_story_id,
                    "status": "ok" if completed.returncode == 0 else "failed",
                    "output_path": str(output_path),
                    "clips": [str(path) for path in clip_paths],
                    "clip_count": len(clip_paths),
                    "generated_seconds": generated_seconds,
                    "ordered_jobs": [
                        {
                            "job_id": job.job_id,
                            "sequence": job.sequence,
                            "chapter": job.chapter,
                            "content_hash": content_hash(job),
                        }
                        for job in ordered_jobs
                    ],
                    "stderr": completed.stderr.strip(),
                }
            )
            print_progress_line("COMPILAR", index, total_groups, started_at, generated_seconds)

    if manifest_path:
        payload = {
            "renderer": "local_video_renderer",
            "created_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "clips_dir": str(clips_dir),
            "final_dir": str(final_dir),
            "totals": {
                "stories": total_groups,
                "ok": sum(1 for item in compiled if item["status"] == "ok"),
                "failed": sum(1 for item in compiled if item["status"] != "ok"),
            },
            "compiled": compiled,
        }
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote compile manifest: {manifest_path}")

    return 1 if failures else 0


def validate_encoder(requested: str) -> list[str]:
    selected = choose_encoder(requested)
    if not _ffmpeg_encoder_exists(selected):
        available = ", ".join(sorted(_ffmpeg_encoder_names())) or "none"
        return [f"FFmpeg encoder is not available: {selected}. Available encoders include: {available}"]
    return []


def print_stage_header(stage: str) -> None:
    print(f"{GREEN}====[ MOITHANO {stage} ]===={RESET}")


def print_progress_line(stage: str, completed: int, total: int, started_at: float, generated_seconds: float) -> None:
    percent = 100.0 if total <= 0 else (completed / total) * 100
    elapsed = time.perf_counter() - started_at
    bar_width = 28
    filled = bar_width if total <= 0 else int(bar_width * completed / total)
    bar = "#" * filled + "-" * (bar_width - filled)
    print(
        f"{GREEN}[{stage}] [{bar}] {percent:6.2f}% | videos {completed}/{total} | "
        f"generado {_format_seconds(generated_seconds)} | transcurrido {_format_seconds(elapsed)}{RESET}"
    )


def _format_seconds(seconds: float) -> str:
    minutes, remainder = divmod(max(0.0, seconds), 60)
    whole_seconds = int(remainder)
    microseconds = int((remainder - whole_seconds) * 1_000_000)
    return f"{int(minutes)}m {whole_seconds}s {microseconds:06d}us"


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


def _normalize_hash_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def normalize_presentation_mode(value: str) -> str:
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "solo_voz": "voice_only",
        "voz": "voice_only",
        "voice": "voice_only",
        "narration_only": "voice_only",
        "con_avatar": "avatar",
        "avatar_hablando": "avatar",
        "avatar_speaking": "avatar",
    }
    normalized = aliases.get(normalized, normalized)
    if normalized not in {"voice_only", "avatar"}:
        raise ValueError("presentation_mode must be voice_only or avatar")
    return normalized


def normalize_avatar_position(value: str) -> str:
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    normalized = AVATAR_POSITION_ALIASES.get(normalized, normalized)
    if normalized not in AVATAR_POSITIONS:
        options = ", ".join(sorted(AVATAR_POSITIONS))
        raise ValueError(f"avatar_position must be one of: {options}")
    return normalized


def resolve_output_dir(config_path: Path, requested_output_dir: Path | None, purpose: str = "clips") -> Path:
    if requested_output_dir:
        return requested_output_dir
    data = json.loads(config_path.read_text(encoding="utf-8"))
    folders = data.get("folders", {})
    if purpose == "final":
        configured = folders.get("final_dir") or folders.get("finished_dir")
        fallback = Path("ejemplos/videos_finalizados")
    else:
        configured = folders.get("clips_dir") or folders.get("short_clips_dir") or folders.get("output_dir")
        fallback = Path("renders")
    configured = configured or folders.get("final_dir") or folders.get("finished_dir")
    if configured:
        path = Path(str(configured)).expanduser()
        if not path.is_absolute():
            path = (config_path.parent / path).resolve()
        return path
    return fallback


def resolve_configured_path(config_path: Path, keys: tuple[str, ...]) -> Path | None:
    data = json.loads(config_path.read_text(encoding="utf-8"))
    folders = data.get("folders", {})
    for key in keys:
        value = folders.get(key)
        if value:
            path = Path(str(value)).expanduser()
            if not path.is_absolute():
                path = (config_path.parent / path).resolve()
            return path
    return None


def shlex_join(command: Iterable[str]) -> str:
    return " ".join(_shell_quote(part) for part in command)


def write_example_config(path: Path, count: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    example = {
        "app": {
            "name": "Generador de Videos IA Moithano",
            "icon": "assets/moithano_icon.svg",
            "theme": "military_lion",
            "ai_video_provider": "sora2",
            "voice_providers": ["microsoft_edge", "levelup_paid", "elevenlabs", "openai_tts"],
        },
        "folders": {
            "input_dir": "ejemplos/entrada",
            "clips_dir": "ejemplos/videos_cortitos",
            "final_dir": "ejemplos/videos_finalizados",
            "music_dir": "ejemplos/musica_fondo",
            "avatar_dir": "ejemplos/avatares",
            "hash_registry": "ejemplos/hashes_procesados.json",
        },
        "niches": MOITHANO_NICHES,
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
            "presentation_mode": "voice_only",
            "avatar": "",
            "avatar_position": "bottom_right",
            "avatar_size_percent": 28,
            "music": "",
            "music_volume": 35,
            "voice_provider": "microsoft_edge",
            "voice_name": "auto",
            "military_border": True,
        },
        "count": count,
        "job_template": {
            "id": "video-{index:03d}",
            "story_id": "historia-moithano-001",
            "sequence": "{index}",
            "title": "Video local {index:03d}",
            "subtitle": "Renderizado sin servidores externos usando FFmpeg local",
            "output_name": "video-{index:03d}.mp4",
            "niche": "historias por capitulos",
            "chapter": "{index}",
            "question": "Pregunta original del capitulo {index}",
            "options": [
                "A. Opcion unica {index}",
                "B. Opcion alternativa {index}",
                "C. Opcion descartada {index}",
                "D. Opcion sorpresa {index}",
            ],
            "correct_answer": "A",
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
    render_parser.add_argument("--output-dir", type=Path, help="overrides folders.final_dir from config")
    render_parser.add_argument("--workers", default="auto", help="'auto' or a positive integer")
    render_parser.add_argument("--encoder", default="auto", help="auto, cpu, nvidia, intel, amd, or ffmpeg encoder")
    render_parser.add_argument("--limit", type=int, help="render only the first N jobs")
    render_parser.add_argument("--dry-run", action="store_true")
    render_parser.add_argument("--no-overwrite", action="store_true")
    render_parser.add_argument("--skip-existing", action="store_true", help="resume by skipping non-empty outputs")
    render_parser.add_argument("--manifest", type=Path, help="write render report JSON to this path")
    render_parser.add_argument("--no-manifest", action="store_true", help="disable the default render manifest")
    render_parser.add_argument("--hash-registry", type=Path, help="JSON list of already processed content hashes")
    render_parser.add_argument("--no-update-hash-registry", action="store_true", help="do not append successful hashes")

    validate_parser = subparsers.add_parser("validate", help="validate config, assets, and encoder")
    validate_parser.add_argument("--config", type=Path, required=True)
    validate_parser.add_argument("--output-dir", type=Path, help="overrides folders.final_dir from config")
    validate_parser.add_argument("--workers", default="auto", help="'auto' or a positive integer")
    validate_parser.add_argument("--encoder", default="auto", help="auto, cpu, nvidia, intel, amd, or ffmpeg encoder")
    validate_parser.add_argument("--limit", type=int, help="validate only the first N jobs")
    validate_parser.add_argument("--hash-registry", type=Path, help="JSON list of already processed content hashes")

    compile_parser = subparsers.add_parser("compile", help="join short clips into ordered final videos")
    compile_parser.add_argument("--config", type=Path, required=True)
    compile_parser.add_argument("--clips-dir", type=Path, help="folder with short clips")
    compile_parser.add_argument("--final-dir", type=Path, help="folder for long final videos")
    compile_parser.add_argument("--story-id", help="compile only one story")
    compile_parser.add_argument("--output-name", help="output file name when compiling one story")
    compile_parser.add_argument("--manifest", type=Path, help="write compile report JSON to this path")

    encoder_parser = subparsers.add_parser("list-encoders", help="show local FFmpeg H.264 encoders")
    encoder_parser.set_defaults(list_encoders=True)

    args = parser.parse_args(argv)

    if args.command == "init-config":
        write_example_config(args.path, args.count)
        print(f"Wrote {args.path} with {args.count} local render jobs.")
        return 0

    _ensure_ffmpeg()

    if args.command == "list-encoders":
        print(_ffmpeg_h264_encoders())
        return 0

    if args.command == "compile":
        jobs = load_plan(args.config)
        clips_dir = resolve_output_dir(args.config, args.clips_dir, "clips")
        final_dir = resolve_output_dir(args.config, args.final_dir, "final")
        manifest_path = args.manifest or final_dir / "compile_manifest.json"
        return compile_stories(jobs, clips_dir, final_dir, args.story_id, args.output_name, manifest_path)

    output_dir = resolve_output_dir(args.config, args.output_dir, "clips")
    jobs = load_plan(args.config)
    if args.limit is not None:
        jobs = jobs[: max(0, args.limit)]
    if not jobs:
        raise SystemExit("No jobs selected.")

    hash_registry_path = args.hash_registry or resolve_configured_path(
        args.config, ("hash_registry", "processed_hashes", "hashes_procesados")
    )
    processed_hashes = load_hash_registry(hash_registry_path)

    errors = validate_jobs(jobs, output_dir, processed_hashes) + validate_encoder(args.encoder)
    if errors:
        print("Validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 2

    worker_count = determine_workers(args.workers, len(jobs))
    if args.command == "validate":
        print(f"Validation OK: {len(jobs)} job(s), {worker_count} worker(s), encoder {choose_encoder(args.encoder)}.")
        return 0

    manifest_path = None if args.no_manifest else args.manifest or output_dir / "render_manifest.json"
    return render_all(
        jobs,
        output_dir,
        args.encoder,
        args.workers,
        args.dry_run,
        not args.no_overwrite,
        args.skip_existing,
        manifest_path,
        None if args.no_update_hash_registry else hash_registry_path,
        processed_hashes,
    )


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


def _input_args(job: RenderJob) -> tuple[list[str], InputLayout]:
    next_index = 1
    voice_index = None
    music_index = None
    avatar_index = None

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

    if job.voice_audio:
        args.extend(["-i", job.voice_audio])
        voice_index = next_index
        next_index += 1
    if job.music:
        args.extend(_looping_input_args(job.music, job.duration))
        music_index = next_index
        next_index += 1
    if job.presentation_mode == "avatar" and job.avatar:
        args.extend(_looping_input_args(job.avatar, job.duration))
        avatar_index = next_index

    return args, InputLayout(voice_index, music_index, avatar_index)


def _filter_graph(job: RenderJob, title_file: Path, subtitle_file: Path, layout: InputLayout) -> tuple[str, bool]:
    filters = _video_filters(job, title_file, subtitle_file)
    graph_parts = [f"[0:v]{','.join(filters)}[base]"]

    if layout.avatar_index is not None:
        avatar_width = max(24, int(job.width * job.avatar_size_percent / 100))
        x_position, y_position = AVATAR_POSITIONS[job.avatar_position]
        graph_parts.append(f"[{layout.avatar_index}:v]scale={avatar_width}:-1[avatar]")
        graph_parts.append(f"[base][avatar]overlay=x={x_position}:y={y_position}:format=auto[vout]")
    else:
        graph_parts.append("[base]null[vout]")

    audio_filter = _audio_filter(job, layout)
    if audio_filter:
        graph_parts.append(audio_filter)

    return ";".join(graph_parts), bool(audio_filter)


def _video_filters(job: RenderJob, title_file: Path, subtitle_file: Path) -> list[str]:
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
    if job.military_border:
        filters.append("drawbox=x=0:y=0:w=iw:h=ih:color=0x29ff7b@0.85:t=6")
    return filters


def _audio_filter(job: RenderJob, layout: InputLayout) -> str:
    if layout.voice_index is not None and layout.music_index is not None:
        volume = job.music_volume / 100
        return (
            f"[{layout.voice_index}:a]volume=1.0[voice];"
            f"[{layout.music_index}:a]volume={volume:.2f}[music];"
            "[voice][music]amix=inputs=2:duration=longest:dropout_transition=2[aout]"
        )
    if layout.music_index is not None:
        volume = job.music_volume / 100
        return f"[{layout.music_index}:a]volume={volume:.2f}[aout]"
    return ""


def _looping_input_args(path: str, duration: float) -> list[str]:
    suffix = Path(path).suffix.lower()
    if suffix in IMAGE_SUFFIXES:
        return ["-loop", "1", "-t", _duration(duration), "-i", path]
    return ["-stream_loop", "-1", "-t", _duration(duration), "-i", path]


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


def _asset_path(value: Any, asset_dir: str | None, config_path: Path, suffixes: set[str]) -> str | None:
    if value in (None, ""):
        return None
    if str(value).strip().lower() == "auto":
        return _first_asset(asset_dir, suffixes)

    path = Path(str(value)).expanduser()
    if path.is_absolute():
        return str(path)

    if asset_dir:
        candidate = Path(asset_dir) / path
        if candidate.exists():
            return str(candidate.resolve())
    return str((config_path.parent / path).resolve())


def _first_asset(asset_dir: str | None, suffixes: set[str]) -> str | None:
    if not asset_dir:
        return None
    root = Path(asset_dir)
    if not root.exists():
        return None
    for path in sorted(root.iterdir()):
        if path.is_file() and path.suffix.lower() in suffixes:
            return str(path.resolve())
    return None


def _positive_int(value: Any, name: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise ValueError(f"{name} must be greater than zero")
    return parsed


def _bounded_int(value: Any, name: str, minimum: int, maximum: int) -> int:
    parsed = int(value)
    if parsed < minimum or parsed > maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return parsed


def _optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    return int(value)


def _bool_value(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "si", "sí", "on"}


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
    return name in _ffmpeg_encoder_names()


def _ffmpeg_h264_encoders() -> str:
    completed = subprocess.run(
        ["ffmpeg", "-hide_banner", "-encoders"],
        text=True,
        capture_output=True,
        check=False,
    )
    return "\n".join(line for line in completed.stdout.splitlines() if "h264" in line.lower())


def _ffmpeg_encoder_names() -> set[str]:
    completed = subprocess.run(
        ["ffmpeg", "-hide_banner", "-encoders"],
        text=True,
        capture_output=True,
        check=False,
    )
    names: set[str] = set()
    for line in completed.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[0].startswith("V"):
            names.add(parts[1])
    return names


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
