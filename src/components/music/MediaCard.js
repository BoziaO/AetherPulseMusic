import React from "react";
import CoverArt from "../CoverArt";
import { Play, Edit2, Trash2 } from "../Icons";

export default function MediaCard({ item, onClick, onEdit, onDelete }) {
  return (
    <article
      className="media-card group cursor-pointer"
      onClick={onClick || (() => {})}
    >
      <div
        className="media-card__cover relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:scale-[1.02]"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <CoverArt art={item.cover} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <button
            type="button"
            className="w-14 h-14 flex items-center justify-center text-white rounded-full shadow-2xl translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:scale-110 active:scale-95"
            style={{ backgroundColor: "var(--primary)" }}
            aria-label={`Odtwórz ${item.title}`}
          >
            <Play size={24} fill="currentColor" />
          </button>
        </div>
        {(onEdit || onDelete) && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="w-8 h-8 flex items-center justify-center text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                aria-label="Edytuj"
              >
                <Edit2 size={16} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="w-8 h-8 flex items-center justify-center text-red-400 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                aria-label="Usuń"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="media-card__body mt-4 px-1">
        <h3
          className="font-bold truncate transition-colors duration-300"
          style={{ color: "var(--text-main)" }}
        >
          {item.title}
        </h3>
        <p
          className="text-sm truncate mt-1 transition-colors duration-300"
          style={{ color: "var(--text-muted)" }}
        >
          {item.subtitle}
        </p>
        {item.meta && (
          <span
            className="text-[10px] uppercase tracking-widest font-bold mt-2 block transition-colors"
            style={{ color: "var(--text-soft)" }}
          >
            {item.meta}
          </span>
        )}
      </div>
    </article>
  );
}
