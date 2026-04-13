import React from "react";
import {
  LayoutGrid,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  ArrowRight,
} from "./Icons";
import CoverArt from "./CoverArt";

function formatTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;

  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function Player({ track, onHide }) {
  const progress = track?.progress ?? 96;
  const duration = track?.duration ?? 251;
  const elapsedSeconds = Math.round((progress / 100) * duration);

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/5 px-6 py-3 flex items-center justify-between z-[200]">
      <div className="flex items-center gap-4 w-[300px]">
        <div className="w-14 h-14 rounded-lg overflow-hidden shadow-lg border border-white/5">
          <CoverArt art={track?.art} compact />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white truncate text-sm">{track?.title || "Bozia Mix"}</p>
          <p className="text-xs text-neutral-400 truncate">{track?.artist || "BoziaMusic Originals"}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl px-8">
        <div className="flex items-center gap-6">
          <button className="text-neutral-400 hover:text-white transition-colors">
            <Shuffle size={18} />
          </button>
          <button className="text-neutral-400 hover:text-white transition-colors">
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform">
            <Play size={22} fill="currentColor" />
          </button>
          <button className="text-neutral-400 hover:text-white transition-colors">
            <SkipForward size={22} fill="currentColor" />
          </button>
          <button className="text-neutral-400 hover:text-white transition-colors">
            <Repeat2 size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 w-full text-[10px] font-bold text-neutral-500">
          <span>{formatTime(elapsedSeconds)}</span>
          <div className="flex-1 h-1 bg-neutral-800 rounded-full relative group cursor-pointer">
            <div 
              className="absolute inset-y-0 left-0 bg-red-500 rounded-full group-hover:bg-red-400 transition-colors" 
              style={{ width: `${progress}%` }} 
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" 
              style={{ left: `${progress}%` }} 
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 w-[300px]">
        {onHide ? (
          <button
            type="button"
            onClick={onHide}
            className="text-neutral-400 hover:text-white transition-colors"
            aria-label="Schowaj player"
            title="Schowaj player"
          >
            <ArrowRight size={18} />
          </button>
        ) : null}
        <button className="text-neutral-400 hover:text-white transition-colors">
          <LayoutGrid size={18} />
        </button>
        <div className="flex items-center gap-3 w-32">
          <Volume2 size={18} className="text-neutral-400" />
          <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-neutral-400 w-2/3" />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Player;
