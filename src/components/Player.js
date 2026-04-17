import React from "react";
import {
  LayoutGrid,
  Play,
  Pause,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  ArrowRight,
  Heart,
} from "./Icons";
import CoverArt from "./CoverArt";

function formatTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const rest = Math.floor(safeSeconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function RepeatIcon({ repeatMode, ...props }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <Repeat2 {...props} />
      {repeatMode === "one" && (
        <span
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-white text-[7px] font-black rounded-full flex items-center justify-center leading-none"
          style={{ backgroundColor: "var(--primary)" }}
        >
          1
        </span>
      )}
    </span>
  );
}

function Player({
  track,
  onHide,
  isPlaying = false,
  onTogglePlay,
  onSeek,
  currentTime = 0,
  audioDuration = 0,
  volume = 80,
  onVolumeChange,
  onPrev,
  onNext,
  isShuffled = false,
  repeatMode = "none",
  onToggleShuffle,
  onToggleRepeat,
  isFavorite = false,
  onToggleFavorite,
}) {
  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
  const elapsedSeconds = currentTime || 0;

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onSeek?.(pct * (audioDuration || 0));
  };

  const handleVolumeClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onVolumeChange?.(Math.round(pct * 100));
  };

  const repeatTitle =
    repeatMode === "none" ? "Włącz powtarzanie" :
    repeatMode === "all" ? "Powtarzaj wszystko" :
    "Powtarzaj jeden utwór";

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 lg:gap-6 z-[200]"
      style={{
        backgroundColor: "var(--bg-player)",
        borderTop: "1px solid var(--surface-line)",
        backdropFilter: "blur(24px)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
      }}
    >
      {/* Current Track Info */}
      <div className="flex items-center gap-3 sm:gap-5 w-full lg:w-[300px] group min-w-0">
        <div
          className="w-14 h-14 rounded-[18px] overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-500 flex-shrink-0"
          style={{ border: "1px solid var(--surface-line)", backgroundColor: "var(--bg-card)" }}
        >
          <CoverArt art={track?.art} compact />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="font-black truncate text-sm tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            {track?.title || "AetherPulse Mix"}
          </p>
          <p
            className="text-[11px] font-bold truncate mt-1 uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            {track?.artist || "AetherPulse Originals"}
          </p>
        </div>
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className="p-2 rounded-full transition-all flex-shrink-0"
            style={{ color: isFavorite ? "var(--primary)" : "var(--text-soft)" }}
            title={isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {/* Controls and Progress */}
      <div className="flex flex-col items-center gap-3 flex-1 w-full lg:max-w-2xl lg:px-8">
        <div className="flex items-center justify-center gap-5 sm:gap-8">
          <button
            onClick={onToggleShuffle}
            className="transition-all hover:scale-110"
            style={{ color: isShuffled ? "var(--primary)" : "var(--text-soft)" }}
            title={isShuffled ? "Wyłącz losowe" : "Włącz losowe"}
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={() => onPrev?.()}
            className="transition-all hover:scale-110 active:scale-90"
            style={{ color: "var(--text-muted)" }}
            title="Poprzedni"
          >
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-12 h-12 flex items-center justify-center rounded-[18px] hover:scale-110 active:scale-95 transition-all shadow-xl"
            style={{ backgroundColor: "var(--text-main)", color: "var(--bg-main)" }}
            aria-label={isPlaying ? "Pauza" : "Odtwórz"}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
          </button>
          <button
            onClick={() => onNext?.()}
            className="transition-all hover:scale-110 active:scale-90"
            style={{ color: "var(--text-muted)" }}
            title="Następny"
          >
            <SkipForward size={22} fill="currentColor" />
          </button>
          <button
            onClick={onToggleRepeat}
            className="transition-all hover:scale-110"
            style={{ color: repeatMode !== "none" ? "var(--primary)" : "var(--text-soft)" }}
            title={repeatTitle}
          >
            <RepeatIcon repeatMode={repeatMode} size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 w-full text-[10px] font-black tracking-widest uppercase" style={{ color: "var(--text-soft)" }}>
          <span className="w-9 sm:w-10 text-right">{formatTime(elapsedSeconds)}</span>
          <div
            onClick={handleProgressClick}
            className="flex-1 h-1.5 rounded-full relative group cursor-pointer overflow-visible"
            style={{ backgroundColor: "var(--bg-hover-strong)" }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
              style={{ width: `${progress}%`, background: "linear-gradient(to right, var(--primary), color-mix(in srgb, var(--primary) 70%, #ff9988))" }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 scale-0 group-hover:scale-100"
              style={{ left: `${progress}%`, marginLeft: "-7px", backgroundColor: "var(--text-main)", border: "2px solid var(--primary)" }}
            />
          </div>
          <span className="w-9 sm:w-10">{formatTime(Math.round(audioDuration || 0))}</span>
        </div>
      </div>

      {/* Extras and Volume */}
      <div className="hidden lg:flex items-center justify-end gap-5 w-[300px]">
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            className="transition-all hover:rotate-90 duration-500"
            style={{ color: "var(--text-soft)" }}
            title="Ukryj"
          >
            <ArrowRight size={20} />
          </button>
        )}
        <button className="transition-colors" style={{ color: "var(--text-soft)" }} title="Kolejka">
          <LayoutGrid size={20} />
        </button>
        <div className="flex items-center gap-3 w-36">
          <Volume2 size={18} style={{ color: "var(--text-soft)" }} />
          <div
            onClick={handleVolumeClick}
            className="flex-1 h-1.5 rounded-full cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: "var(--bg-hover-strong)" }}
          >
            <div
              className="h-full transition-all"
              style={{ width: `${volume}%`, backgroundColor: "var(--primary)" }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Player;
