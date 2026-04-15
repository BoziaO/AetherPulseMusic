import React from "react";
import CoverArt from "../CoverArt";
import { Play } from "../Icons";

export default function MediaCard({ item, onClick }) {
  return (
    <article 
      className="media-card group cursor-pointer" 
      onClick={onClick || (() => {})}
    >
      <div className="media-card__cover relative overflow-hidden rounded-2xl bg-neutral-900 shadow-lg group-hover:shadow-red-500/10 transition-all duration-500 group-hover:scale-[1.02]">
        <CoverArt art={item.cover} />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button 
            type="button" 
            className="w-14 h-14 flex items-center justify-center bg-red-500 text-white rounded-full shadow-2xl translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:scale-110 active:scale-95"
            aria-label={`Odtwórz ${item.title}`}
          >
            <Play size={24} fill="currentColor" />
          </button>
        </div>
      </div>
      <div className="media-card__body mt-4 px-1">
        <h3 className="font-bold text-white truncate group-hover:text-red-400 transition-colors duration-300">{item.title}</h3>
        <p className="text-sm text-neutral-400 truncate mt-1 group-hover:text-neutral-300 transition-colors duration-300">{item.subtitle}</p>
        {item.meta && (
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mt-2 block group-hover:text-neutral-400 transition-colors">
            {item.meta}
          </span>
        )}
      </div>
    </article>
  );
}
