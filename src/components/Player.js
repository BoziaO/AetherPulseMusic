import React, { memo, useState } from "react";
import {
  Play, Pause, Repeat2, Shuffle, SkipBack, SkipForward,
  Volume2, VolumeX, ChevronDown, Heart, Mic, LayoutGrid
} from "./Icons";
import CoverArt from "./CoverArt";

function formatTime(seconds) {
  const s = Number.isFinite(seconds) ? seconds : 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const RepeatIcon = memo(function RepeatIcon({ repeatMode, ...props }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <Repeat2 {...props} />
      {repeatMode === "one" && (
        <span className="absolute -top-1 -right-1 w-3 h-3 text-white text-[7px] font-bold rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--primary)" }}>
          1
        </span>
      )}
    </span>
  );
});

export default memo(function Player({
  track, onHide, isPlaying = false, onTogglePlay, onSeek,
  currentTime = 0, audioDuration = 0, volume = 80, onVolumeChange,
  onPrev, onNext, isShuffled = false, repeatMode = "none",
  onToggleShuffle, onToggleRepeat, isFavorite = false, onToggleFavorite,
  onShowQueue, onShowLyrics,
}) {
  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  const [progressHoverTime, setProgressHoverTime] = useState(null);
  const [progressHoverX, setProgressHoverX] = useState(0);

  const getProgressFromEvent = (clientX, target) => {
    const rect = target.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleProgressClick = (e) => {
    const pct = getProgressFromEvent(e.clientX, e.currentTarget);
    onSeek?.(pct * (audioDuration || 0));
  };

  const handleProgressMouseMove = (e) => {
    const pct = getProgressFromEvent(e.clientX, e.currentTarget);
    setProgressHoverX(e.clientX - e.currentTarget.getBoundingClientRect().left);
    setProgressHoverTime(pct * (audioDuration || 0));
  };

  const handleProgressTouch = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    const pct = getProgressFromEvent(touch.clientX, e.currentTarget);
    onSeek?.(pct * (audioDuration || 0));
  };

  const handleVolumeClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onVolumeChange?.(Math.round(pct * 100));
  };

  const isMuted = volume === 0;

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-[400] transition-transform duration-500"
      style={{ transform: track ? "translateY(0)" : "translateY(100%)" }}
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-3 -mt-1 cursor-pointer group z-50"
        onClick={handleProgressClick}
        onMouseMove={handleProgressMouseMove}
        onMouseLeave={() => setProgressHoverTime(null)}
        onTouchStart={handleProgressTouch}
        onTouchMove={handleProgressTouch}
      >
        <div className="absolute inset-0 top-1 bottom-1" style={{ backgroundColor: "var(--bg-hover)" }} />
        <div
          className="absolute top-1 bottom-1 left-0 transition-[width] duration-150"
          style={{ width: `${progress}%`, backgroundColor: "var(--primary)" }}
        />
        <div
          className="absolute top-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow"
          style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
        />
        {progressHoverTime !== null && (
          <div className="absolute -top-8 px-2 py-1 rounded-lg text-[10px] font-bold pointer-events-none"
            style={{ left: `${progressHoverX}px`, transform: "translateX(-50%)", backgroundColor: "var(--bg-panel)", border: "1px solid var(--surface-line)", color: "var(--text-main)" }}>
            {formatTime(progressHoverTime)}
          </div>
        )}
      </div>

      <div
        className="px-4 sm:px-8 py-4 flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, var(--dynamic-bg, var(--bg-player)) 0%, var(--bg-player) 100%)",
          borderTop: "1px solid var(--surface-line)",
          backdropFilter: "none",
        }}
      >
        {/* Dynamic color glow */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 10% 50%, var(--dynamic-primary, transparent) 0%, transparent 60%)",
          }}
        />
        {/* Track Info */}
        <div className="relative z-10 flex items-center gap-4 w-full lg:w-[300px] min-w-0">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
            <CoverArt art={track?.art} compact />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold truncate" style={{ color: "var(--text-main)" }}>
              {track?.title || "Not Playing"}
            </h4>
            <p className="text-xs font-medium truncate opacity-50 mt-0.5">
              {track?.artist || "AetherPulse"}
            </p>
          </div>
          <button
            onClick={onToggleFavorite}
            className="p-2 rounded-lg flex-shrink-0 transition-colors"
            style={{ color: isFavorite ? "var(--primary)" : "var(--text-soft)" }}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Controls */}
        <div className="relative z-10 flex flex-col items-center gap-2 flex-1 w-full">
          <div className="flex items-center gap-6">
            <button
              onClick={onToggleShuffle}
              className="p-2 rounded-lg transition-colors"
              style={{ color: isShuffled ? "var(--primary)" : "var(--text-soft)" }}
            >
              <Shuffle size={16} />
            </button>
            <button onClick={onPrev} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: "var(--text-main)" }}>
              <SkipBack size={22} fill="currentColor" />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{ backgroundColor: "var(--primary)", color: "#fff" }}
            >
              {isPlaying
                ? <Pause size={20} fill="currentColor" />
                : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={onNext} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: "var(--text-main)" }}>
              <SkipForward size={22} fill="currentColor" />
            </button>
            <button
              onClick={onToggleRepeat}
              className="p-2 rounded-lg transition-colors"
              style={{ color: repeatMode !== "none" ? "var(--primary)" : "var(--text-soft)" }}
            >
              <RepeatIcon repeatMode={repeatMode} size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full max-w-sm">
            <span className="text-[10px] font-medium tabular-nums opacity-40 w-9 text-right">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 rounded-full overflow-hidden cursor-pointer" onClick={handleProgressClick}
              style={{ backgroundColor: "var(--bg-hover)" }}>
              <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: "var(--text-muted)", opacity: 0.6 }} />
            </div>
            <span className="text-[10px] font-medium tabular-nums opacity-40 w-9">{formatTime(audioDuration)}</span>
          </div>
        </div>

        {/* Volume & Extras */}
        <div className="relative z-10 flex items-center justify-end gap-5 w-full lg:w-[300px]">
          <div className="flex items-center gap-1">
            <button onClick={onShowLyrics} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-soft)" }} title="Lyrics" aria-label="Lyrics">
              <Mic size={18} />
            </button>
            <button onClick={onShowQueue} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-soft)" }} title="Queue" aria-label="Queue">
              <LayoutGrid size={18} />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 w-28 group">
            <Volume2 size={16} className="opacity-40" />
            <div className="flex-1 h-1 rounded-full relative cursor-pointer overflow-hidden" onClick={handleVolumeClick}
              style={{ backgroundColor: "var(--bg-hover)" }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${volume}%`, backgroundColor: "var(--text-muted)", opacity: 0.6 }} />
            </div>
          </div>

          <button onClick={() => onVolumeChange?.(isMuted ? 80 : 0)} className="hidden lg:block p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: "var(--text-soft)" }} title={isMuted ? "Unmute" : "Mute"} aria-label={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button onClick={onHide} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: "var(--text-soft)" }} title="Hide player">
            <ChevronDown size={18} />
          </button>
        </div>
      </div>
    </footer>
  );
});
