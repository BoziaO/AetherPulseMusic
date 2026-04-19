import React from "react";
import {
  Play,
  Pause,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  ArrowRight,
  Heart,
  Mic,
  LayoutGrid,
  Maximize2
} from "./Icons";
import CoverArt from "./CoverArt";
import { useTheme } from "../contexts/ThemeContext";

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
          className="absolute -top-1 -right-1 w-3 h-3 text-white text-[6px] font-black rounded-full flex items-center justify-center bg-primary"
        >
          1
        </span>
      )}
    </span>
  );
}

export default function Player({
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
  onShowQueue,
  onShowLyrics,
}) {
  const { liquidGlassEnabled, blurIntensity, transparency } = useTheme();
  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

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

  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 z-[400] transition-all duration-700 ${
        track ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {/* Progress Bar (Floating Above) */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 cursor-pointer group z-50"
        onClick={handleProgressClick}
      >
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
        <div 
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 group-hover:h-2"
          style={{ width: `${progress}%`, boxShadow: "0 0 20px var(--primary)" }}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-2xl scale-0 group-hover:scale-100"
          style={{ left: `${progress}%`, border: "3px solid var(--primary)" }}
        />
      </div>

      <div
        className={`px-8 py-6 flex flex-col lg:flex-row items-center justify-between gap-8 ${
          liquidGlassEnabled ? "backdrop-blur" : ""
        }`}
        style={{
          backgroundColor: liquidGlassEnabled
            ? `rgba(var(--bg-player-rgb, 7, 11, 22), ${transparency})`
            : "var(--bg-player)",
          backdropFilter: liquidGlassEnabled ? `blur(${blurIntensity}px)` : undefined,
          borderTop: "1px solid var(--surface-line)",
          fontFamily: "var(--font-display)"
        }}
      >
        {/* Track Info */}
        <div className="flex items-center gap-6 w-full lg:w-[350px] min-w-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl relative group flex-shrink-0">
             <CoverArt art={track?.art} compact />
             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 size={20} className="text-white" />
             </div>
          </div>
          <div className="min-w-0 flex-1">
             <div className="flex items-center gap-2">
                <h4 className="text-lg font-black truncate leading-tight group-hover:text-primary transition-colors">
                  {track?.title || "Not Playing"}
                </h4>
                {isPlaying && (
                  <div className="wave-bars">
                    <span /><span /><span /><span />
                  </div>
                )}
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 truncate mt-1">
               {track?.artist || "AetherPulse Originals"}
             </p>
          </div>
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-full transition-all hover:scale-125 ${isFavorite ? 'text-primary' : 'opacity-20 hover:opacity-100'}`}
          >
            <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Playback Controls */}
        <div className="flex flex-col items-center gap-4 flex-1">
          <div className="flex items-center gap-10">
            <button 
              onClick={onToggleShuffle}
              className={`transition-all hover:scale-110 ${isShuffled ? 'text-primary' : 'opacity-30 hover:opacity-100'}`}
            >
              <Shuffle size={18} />
            </button>
            <button 
              onClick={onPrev}
              className="opacity-60 hover:opacity-100 hover:scale-110 active:scale-90 transition-all"
            >
              <SkipBack size={24} fill="currentColor" />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-16 h-16 rounded-[24px] bg-primary text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-primary/40"
            >
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
            </button>
            <button 
              onClick={onNext}
              className="opacity-60 hover:opacity-100 hover:scale-110 active:scale-90 transition-all"
            >
              <SkipForward size={24} fill="currentColor" />
            </button>
            <button 
              onClick={onToggleRepeat}
              className={`transition-all hover:scale-110 ${repeatMode !== 'none' ? 'text-primary' : 'opacity-30 hover:opacity-100'}`}
            >
              <RepeatIcon repeatMode={repeatMode} size={18} />
            </button>
          </div>
          
          <div className="flex items-center gap-4 w-full max-w-md text-[10px] font-black opacity-40 uppercase tracking-widest">
             <span className="w-12 text-right">{formatTime(currentTime)}</span>
             <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary/40" style={{ width: `${progress}%` }} />
             </div>
             <span className="w-12">{formatTime(audioDuration)}</span>
          </div>
        </div>

        {/* Volume & Extras */}
        <div className="hidden lg:flex items-center justify-end gap-8 w-[350px]">
           <div className="flex items-center gap-4">
              <button 
                onClick={onShowLyrics}
                className="p-2 opacity-30 hover:opacity-100 hover:text-primary transition-all hover:scale-110"
                title="Lyrics"
              >
                <Mic size={20} />
              </button>
              <button 
                onClick={onShowQueue}
                className="p-2 opacity-30 hover:opacity-100 hover:text-primary transition-all hover:scale-110"
                title="Queue"
              >
                <LayoutGrid size={20} />
              </button>
           </div>
           
           <div className="flex items-center gap-4 w-32 group">
              <Volume2 size={18} className="opacity-40 group-hover:text-primary transition-colors" />
              <div 
                className="flex-1 h-1.5 bg-white/10 rounded-full relative cursor-pointer group/vol overflow-hidden"
                onClick={handleVolumeClick}
              >
                 <div 
                   className="absolute inset-y-0 left-0 bg-primary group-hover/vol:bg-primary transition-all"
                   style={{ width: `${volume}%` }}
                 />
              </div>
           </div>
           
           <button 
             onClick={onHide}
             className="p-2 opacity-30 hover:opacity-100 hover:rotate-90 transition-all duration-500"
           >
             <ArrowRight size={20} />
           </button>
        </div>
      </div>
    </footer>
  );
}
