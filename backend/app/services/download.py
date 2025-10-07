from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import yt_dlp

BASE_DIR = Path(__file__).resolve().parent.parent
DOWNLOAD_DIR = (BASE_DIR / "downloads").resolve()
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


class DownloadError(Exception):
    """自定义下载异常。"""


@dataclass(slots=True)
class DownloadResult:
    video_id: str
    title: str
    filepath: Path
    filesize: int | None
    ext: str | None
    duration: int | None
    downloaded_at: datetime

    def to_dict(self) -> dict[str, str | int | None]:
        return {
            "video_id": self.video_id,
            "title": self.title,
            "filepath": str(self.filepath),
            "filesize": self.filesize,
            "ext": self.ext,
            "duration": self.duration,
            "downloaded_at": self.downloaded_at.isoformat(),
        }


def download_video(
    video_id: str,
    format_code: str | None = None,
    audio_only: bool = False,
) -> dict[str, str | int | None]:
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    selected_format = "bestaudio/best" if audio_only else (format_code or "best")

    ydl_opts: dict[str, object] = {
        "format": selected_format,
        "outtmpl": str(DOWNLOAD_DIR / "%(title)s-%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            output_path = Path(ydl.prepare_filename(info))
    except yt_dlp.utils.DownloadError as exc:  # type: ignore[attr-defined]
        raise DownloadError(str(exc)) from exc

    filesize = output_path.stat().st_size if output_path.exists() else None

    result = DownloadResult(
        video_id=video_id,
        title=info.get("title", ""),
        filepath=output_path,
        filesize=filesize,
        ext=info.get("ext"),
        duration=info.get("duration"),
        downloaded_at=datetime.utcnow(),
    )

    return result.to_dict()
