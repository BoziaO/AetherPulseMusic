import React, { memo, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, ChevronUp } from "./Icons";
import CoverArt from "./CoverArt";

export default memo(function MiniPlayer({
  track,
  isPlaying = false,
  onTogglePlay,
  onNext,
  onExpand,
  progress = 0,
}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;
    // Only handle horizontal swipes (abs(dx) > abs(dy))
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) {
        onNext?.();
      }
    }
  }, [onNext]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[400] px-4 py-2 flex items-center gap-3 cursor-pointer"
      style={{
        backgroundColor: "var(--bg-player)",
        borderTop: "1px solid var(--surface-line)",
      }}
      onClick={onExpand}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      aria-label="Expand player"
    >
      {/* Thin progress line */}
      <div
        className="absolute top-0 left-0 h-[2px]"
        style={{
          width: `${progress}%`,
          backgroundColor: "var(--primary)",
        }}
      />

      {/* Cover */}
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 pointer-events-none">
        <CoverArt art={track?.art} compact />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 pointer-events-none">
        <p className="text-sm font-bold truncate" style={{ color: "var(--text-main)" }}>
          {track?.title || "Not Playing"}
        </p>
        <p className="text-xs truncate opacity-50">
          {track?.artist || "AetherPulse"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay?.(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{ backgroundColor: "var(--primary)", color: "#fff" }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying
            ? <Pause size={16} fill="currentColor" />
            : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
          style={{ color: "var(--text-main)" }}
          aria-label="Next track"
        >
          <SkipForward size={18} fill="currentColor" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
          style={{ color: "var(--text-soft)" }}
          aria-label="Expand player"
        >
          <ChevronUp size={18} />
        </button>
      </div>
    </div>
  );
});
