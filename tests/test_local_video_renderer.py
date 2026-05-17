import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from local_video_renderer import determine_workers, load_plan, render_job


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


if __name__ == "__main__":
    unittest.main()
