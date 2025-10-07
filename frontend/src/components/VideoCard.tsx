import React, { useMemo, useState } from "react";
import { VideoItem } from "../api/youtube";
import "./VideoCard.css";

interface VideoCardProps {
  video: VideoItem;
  onAddToCollection?: (video: VideoItem) => void;
  labels?: {
    watchOnYoutube: string;
    openInline: string;
    closeInline: string;
    addToCollection: string;
  };
  layout?: "list" | "grid";
  index?: number;
}

const defaultLabels = {
  watchOnYoutube: "在 YouTube 上观看",
  openInline: "站内播放",
  closeInline: "关闭站内播放",
  addToCollection: "添加到收藏",
};

const VideoCard: React.FC<VideoCardProps> = ({ video, onAddToCollection, labels, layout = "list", index }) => {
  const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  const [showPlayer, setShowPlayer] = useState(false);
  const mergedLabels = { ...defaultLabels, ...(labels ?? {}) };

  const publishedDate = useMemo(() => new Date(video.publishedAt).toLocaleDateString(), [video.publishedAt]);

  const durationLabel = useMemo(() => {
    if (!video.durationISO8601) {
      return undefined;
    }
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(video.durationISO8601);
    if (!match) {
      return video.durationISO8601;
    }
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    const paddedMinutes = hours > 0 ? minutes.toString().padStart(2, "0") : minutes.toString();
    const paddedSeconds = seconds.toString().padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes || "0"}:${paddedSeconds}`;
  }, [video.durationISO8601]);

  const embedUrl = useMemo(
    () => `https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`,
    [video.videoId],
  );

  return (
    <article className={`video-card video-card--${layout} ${showPlayer ? "video-card--expanded" : ""}`}>
      <div className={`video-card__media ${showPlayer ? "video-card__media--player" : ""}`}>
        {layout === "grid" && typeof index === "number" ? (
          <div className="video-card__badge">{index}</div>
        ) : null}
        <div className="video-card__media-inner">
          {showPlayer ? (
            <iframe
              className="video-card__iframe"
              src={embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <a
              className="video-card__thumb-link"
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="打开 YouTube 视频"
            >
              <img className="video-card__thumb" src={video.thumbnail} alt={video.title} />
              {durationLabel ? <span className="video-card__duration">{durationLabel}</span> : null}
            </a>
          )}
        </div>
      </div>

      <div className="video-card__info">
        <a className="video-card__title-link" href={videoUrl} target="_blank" rel="noopener noreferrer">
          <h3 className="video-card__title">{video.title}</h3>
        </a>
        <p className="video-card__channel">{video.channelTitle}</p>
        <div className="video-card__meta">
          <span>{publishedDate}</span>
          {durationLabel ? <span>{durationLabel}</span> : null}
        </div>
        {layout === "list" ? (
          <>
            <p className="video-card__description">{video.description}</p>
            <div className="video-card__actions">
              <a className="video-card__watch" href={videoUrl} target="_blank" rel="noopener noreferrer">
                {mergedLabels.watchOnYoutube}
              </a>
              <button
                type="button"
                className="video-card__button video-card__button--secondary"
                onClick={() => setShowPlayer((prev) => !prev)}
              >
                {showPlayer ? mergedLabels.closeInline : mergedLabels.openInline}
              </button>
              {onAddToCollection ? (
                <button type="button" className="video-card__button" onClick={() => onAddToCollection(video)}>
                  {mergedLabels.addToCollection}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
};

export default VideoCard;
