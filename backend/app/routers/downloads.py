from fastapi import APIRouter, HTTPException

from ..services.download import DownloadError, download_video
from ..schemas import DownloadRequest, DownloadResponse

router = APIRouter()


@router.post("/", summary="下载 YouTube 视频", response_model=DownloadResponse)
def trigger_download(payload: DownloadRequest):
    try:
        result = download_video(
            video_id=payload.video_id,
            format_code=payload.format_code,
            audio_only=payload.audio_only,
        )
    except DownloadError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"message": "下载完成", "data": result}
