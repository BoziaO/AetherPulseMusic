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
  repeatMode = 'none',
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
    const seconds = pct * (audioDuration || 0);
    onSeek?.(seconds);
  };

  const handleVolumeClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const vol = Math.round(pct * 100);
    onVolumeChange?.(vol);
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-2xl border-t border-white/5 px-8 py-4 flex items-center justify-between z-[200] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
      {/* Current Track Info */}
      <div className="flex items-center gap-5 w-[320px] group">
        <div className="w-16 h-16 rounded-[20px] overflow-hidden shadow-2xl border border-white/5 group-hover:scale-105 transition-transform duration-500 bg-neutral-900">
          <CoverArt art={track?.art} compact />
        </div>
        <div className="min-w-0">
          <p className="font-black text-white truncate text-sm tracking-tight group-hover:text-red-400 transition-colors">{track?.title || "Bozia Mix"}</p>
          <p className="text-[11px] text-neutral-500 font-bold truncate mt-1 uppercase tracking-wider">{track?.artist || "BoziaMusic Originals"}</p>
        </div>
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-full hover:bg-white/5 transition-all ${isFavorite ? 'text-red-500' : 'text-neutral-600 hover:text-white'}`}
            title={isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {/* Controls and Progress */}
      <div className="flex flex-col items-center gap-3 flex-1 max-w-2xl px-12">
        <div className="flex items-center gap-8">
          <button 
            onClick={onToggleShuffle} 
            className={`transition-all hover:scale-110 ${isShuffled ? "text-red-500" : "text-neutral-500 hover:text-white"}`} 
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          <button 
            onClick={() => onPrev?.()} 
            className="text-neutral-400 hover:text-white transition-all hover:scale-110 active:scale-90" 
            title="Previous"
          >
            <SkipBack size={24} fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-[18px] hover:scale-110 active:scale-95 transition-all shadow-xl shadow-white/10"
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </button>
          <button 
            onClick={() => onNext?.()} 
            className="text-neutral-400 hover:text-white transition-all hover:scale-110 active:scale-90" 
            title="Next"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
          <button 
            onClick={onToggleRepeat} 
            className={`transition-all hover:scale-110 ${repeatMode !== 'none' ? "text-red-500" : "text-neutral-500 hover:text-white"}`} 
            title="Repeat"
          >
            <Repeat2 size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4 w-full text-[10px] font-black tracking-widest text-neutral-600 uppercase">
          <span className="w-10 text-right">{formatTime(elapsedSeconds)}</span>
          <div 
            onClick={handleProgressClick} 
            className="flex-1 h-1.5 bg-neutral-800/50 rounded-full relative group cursor-pointer overflow-visible"
          >
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 scale-0 group-hover:scale-100 border-2 border-red-500"
              style={{ left: `${progress}%`, marginLeft: '-7px' }}
            />
          </div>
          <span className="w-10">{formatTime(Math.round(audioDuration || 0))}</span>
        </div>
      </div>

      {/* Extras and Volume */}
      <div className="flex items-center justify-end gap-6 w-[320px]">
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            className="text-neutral-500 hover:text-white transition-all hover:rotate-90 duration-500"
            title="Ukryj"
          >
            <ArrowRight size={20} />
          </button>
        )}
        <button className="text-neutral-500 hover:text-white transition-colors" title="Queue">
          <LayoutGrid size={20} />
        </button>
        <div className="flex items-center gap-4 w-36 group">
          <div className="relative">
            <Volume2 size={20} className="text-neutral-500 group-hover:text-white transition-colors" />
            {volume === 0 && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[2px] bg-red-500 rotate-45"></div>}
          </div>
          <div 
            onClick={handleVolumeClick} 
            className="flex-1 h-1.5 bg-neutral-800/50 rounded-full cursor-pointer relative overflow-hidden group/vol"
          >
            <div 
              className="h-full bg-neutral-500 group-hover/vol:bg-red-500 transition-all shadow-[0_0_8px_rgba(239,68,68,0.2)]" 
              style={{ width: `${volume}%` }} 
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Player;
