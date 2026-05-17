import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from local_video_renderer import determine_workers, load_plan, render_job, resolve_output_dir, validate_jobs


class LocalVideoRendererTests(unittest.TestCase):
    def test_load_plan_expands_one_hundred_job_template(self):
        with tempfile.TemporaryDirectory() as temp_root:
            config_path = Path(temp_root) / "videos.json"
            config_path.write_text(
                json.dumps(
                    {
                        "defaults": {
                            "width": 320,
                            "height": 180,
                            "fps": 12,
                            "duration": 1,
                            "background": "#123456",
                            "subtitle_color": "#abcdef",
                        },
                        "count": 100,
                        "job_template": {
                            "id": "video-{index:03d}",
                            "title": "Video {index:03d}",
                            "output_name": "video-{index:03d}.mp4",
                        },
                    }
                ),
                encoding="utf-8",
            )

            jobs = load_plan(config_path)

        self.assertEqual(100, len(jobs))
        self.assertEqual("video-001", jobs[0].job_id)
        self.assertEqual("Video 100", jobs[-1].title)
        self.assertEqual("0x123456", jobs[0].background)
        self.assertEqual("0xabcdef", jobs[0].subtitle_color)

    def test_determine_workers_caps_to_job_count(self):
        self.assertEqual(3, determine_workers(8, 3))
        self.assertGreaterEqual(determine_workers("auto", 3), 1)

    def test_validate_jobs_reports_missing_assets_and_output_collisions(self):
        with tempfile.TemporaryDirectory() as temp_root:
            temp_path = Path(temp_root)
            config_path = temp_path / "videos.json"
            config_path.write_text(
                json.dumps(
                    {
                        "jobs": [
                            {
                                "id": "one",
                                "title": "One",
                                "width": 161,
                                "height": 90,
                                "source": "missing.png",
                                "output_name": "same.mp4",
                            },
                            {
                                "id": "two",
                                "title": "Two",
                                "output_name": "same.mp4",
                            },
                        ]
                    }
                ),
                encoding="utf-8",
            )

            errors = validate_jobs(load_plan(config_path), temp_path / "renders")

        self.assertTrue(any("source does not exist" in error for error in errors))
        self.assertTrue(any("output collides" in error for error in errors))
        self.assertTrue(any("width and height must be even" in error for error in errors))

    def test_render_job_can_skip_existing_outputs_for_resume(self):
        with tempfile.TemporaryDirectory() as temp_root:
            temp_path = Path(temp_root)
            config_path = temp_path / "videos.json"
            config_path.write_text(
                json.dumps({"jobs": [{"id": "resume", "title": "Resume", "output_name": "resume.mp4"}]}),
                encoding="utf-8",
            )
            output_dir = temp_path / "renders"
            output_dir.mkdir()
            existing_output = output_dir / "resume.mp4"
            existing_output.write_bytes(b"already rendered")

            result = render_job(load_plan(config_path)[0], output_dir, "cpu", skip_existing=True)

        self.assertTrue(result.skipped)
        self.assertEqual(0, result.return_code)
        self.assertEqual([], result.command)
        self.assertEqual(len(b"already rendered"), result.size_bytes)

    def test_resolve_output_dir_uses_configured_final_folder(self):
        with tempfile.TemporaryDirectory() as temp_root:
            temp_path = Path(temp_root)
            config_path = temp_path / "videos.json"
            config_path.write_text(
                json.dumps({"folders": {"final_dir": "videos_finalizados"}, "jobs": [{"title": "One"}]}),
                encoding="utf-8",
            )

            output_dir = resolve_output_dir(config_path, None)

        self.assertEqual("videos_finalizados", output_dir.name)

    @unittest.skipUnless(shutil.which("ffmpeg"), "ffmpeg is required for render integration test")
    def test_render_job_creates_local_mp4_with_expected_resolution(self):
        with tempfile.TemporaryDirectory() as temp_root:
            temp_path = Path(temp_root)
            config_path = temp_path / "videos.json"
            config_path.write_text(
                json.dumps(
                    {
                        "jobs": [
                            {
                                "id": "smoke",
                                "title": "Local render smoke test",
                                "subtitle": "No external service",
                                "duration": 0.5,
                                "width": 160,
                                "height": 90,
                                "fps": 10,
                                "background": "#223344",
                                "font_size": 16,
                                "subtitle_size": 10,
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            job = load_plan(config_path)[0]
            output_dir = temp_path / "renders"

            result = render_job(job, output_dir, "cpu")

            self.assertEqual(0, result.return_code, result.stderr)
            output_path = Path(result.output_path)
            self.assertTrue(output_path.exists())
            self.assertGreater(output_path.stat().st_size, 1000)

            if shutil.which("ffprobe"):
                probe = subprocess.run(
                    [
                        "ffprobe",
                        "-v",
                        "error",
                        "-select_streams",
                        "v:0",
                        "-show_entries",
                        "stream=width,height",
                        "-of",
                        "csv=p=0",
                        str(output_path),
                    ],
                    text=True,
                    capture_output=True,
                    check=True,
                )
                self.assertEqual("160,90", probe.stdout.strip())

    @unittest.skipUnless(shutil.which("ffmpeg"), "ffmpeg is required for render CLI integration test")
    def test_cli_render_writes_manifest_and_can_skip_existing(self):
        with tempfile.TemporaryDirectory() as temp_root:
            temp_path = Path(temp_root)
            config_path = temp_path / "videos.json"
            output_dir = temp_path / "renders"
            manifest_path = temp_path / "manifest.json"
            config_path.write_text(
                json.dumps(
                    {
                        "jobs": [
                            {
                                "id": "cli",
                                "title": "CLI manifest smoke test",
                                "duration": 0.5,
                                "width": 160,
                                "height": 90,
                                "fps": 10,
                                "font_size": 16,
                                "subtitle_size": 10,
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )

            first = subprocess.run(
                [
                    sys.executable,
                    "local_video_renderer.py",
                    "render",
                    "--config",
                    str(config_path),
                    "--output-dir",
                    str(output_dir),
                    "--workers",
                    "1",
                    "--encoder",
                    "cpu",
                    "--manifest",
                    str(manifest_path),
                ],
                text=True,
                capture_output=True,
                check=True,
            )
            self.assertIn("[ok] (1/1) cli", first.stdout)
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(1, manifest["totals"]["ok"])
            self.assertEqual("ok", manifest["results"][0]["status"])

            second = subprocess.run(
                [
                    sys.executable,
                    "local_video_renderer.py",
                    "render",
                    "--config",
                    str(config_path),
                    "--output-dir",
                    str(output_dir),
                    "--workers",
                    "1",
                    "--encoder",
                    "cpu",
                    "--manifest",
                    str(manifest_path),
                    "--skip-existing",
                ],
                text=True,
                capture_output=True,
                check=True,
            )
            self.assertIn("[skip] (1/1) cli", second.stdout)
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(1, manifest["totals"]["skipped"])

    @unittest.skipUnless(shutil.which("ffmpeg"), "ffmpeg is required for avatar/music integration test")
    def test_cli_render_uses_configured_folders_avatar_and_music(self):
        with tempfile.TemporaryDirectory() as temp_root:
            temp_path = Path(temp_root)
            avatar_dir = temp_path / "avatares"
            music_dir = temp_path / "musica"
            final_dir = temp_path / "final"
            avatar_dir.mkdir()
            music_dir.mkdir()
            avatar_path = avatar_dir / "avatar.png"
            music_path = music_dir / "music.wav"

            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-f",
                    "lavfi",
                    "-i",
                    "color=c=green:s=48x48:d=0.1",
                    "-frames:v",
                    "1",
                    str(avatar_path),
                ],
                text=True,
                capture_output=True,
                check=True,
            )
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-f",
                    "lavfi",
                    "-i",
                    "sine=frequency=440:duration=0.6",
                    "-ac",
                    "1",
                    str(music_path),
                ],
                text=True,
                capture_output=True,
                check=True,
            )

            config_path = temp_path / "videos.json"
            config_path.write_text(
                json.dumps(
                    {
                        "folders": {
                            "final_dir": str(final_dir),
                            "music_dir": str(music_dir),
                            "avatar_dir": str(avatar_dir),
                        },
                        "defaults": {
                            "duration": 0.6,
                            "width": 160,
                            "height": 90,
                            "fps": 10,
                            "font_size": 16,
                            "subtitle_size": 10,
                            "presentation_mode": "avatar",
                            "avatar": "auto",
                            "avatar_position": "bottom_left",
                            "avatar_size_percent": 25,
                            "music": "auto",
                            "music_volume": 80,
                        },
                        "jobs": [{"id": "avatar-music", "title": "Avatar y musica"}],
                    }
                ),
                encoding="utf-8",
            )

            validate = subprocess.run(
                [
                    sys.executable,
                    "local_video_renderer.py",
                    "validate",
                    "--config",
                    str(config_path),
                    "--encoder",
                    "cpu",
                ],
                text=True,
                capture_output=True,
                check=True,
            )
            self.assertIn("Validation OK: 1 job(s)", validate.stdout)

            render = subprocess.run(
                [
                    sys.executable,
                    "local_video_renderer.py",
                    "render",
                    "--config",
                    str(config_path),
                    "--workers",
                    "1",
                    "--encoder",
                    "cpu",
                ],
                text=True,
                capture_output=True,
                check=True,
            )
            self.assertIn("[ok] (1/1) avatar-music", render.stdout)

            output_path = final_dir / "avatar-music.mp4"
            self.assertTrue(output_path.exists())
            probe = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "stream=codec_type",
                    "-of",
                    "csv=p=0",
                    str(output_path),
                ],
                text=True,
                capture_output=True,
                check=True,
            )
            self.assertIn("video", probe.stdout)
            self.assertIn("audio", probe.stdout)

            manifest = json.loads((final_dir / "render_manifest.json").read_text(encoding="utf-8"))
            self.assertEqual("avatar", manifest["results"][0]["presentation_mode"])
            self.assertEqual(1, manifest["totals"]["ok"])


if __name__ == "__main__":
    unittest.main()
