import React from "react";
import CoverArt from "../CoverArt";

export default function ChartRow({ item, onClick }) {
  return (
    <div
      className="chart-row group flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-200"
      style={{ color: "var(--text-main)" }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <span
        className="font-black text-sm min-w-[28px] text-center tabular-nums transition-colors duration-200"
        style={{ color: "var(--text-soft)" }}
      >
        {item.label}
      </span>

      {item.thumbnail ? (
        <div
          className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
      ) : item.cover ? (
        <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden group-hover:scale-105 transition-transform duration-300">
          <CoverArt art={item.cover} compact />
        </div>
      ) : null}

      <div className="flex-1 min-w-0">
        <strong
          className="block font-bold truncate text-sm transition-colors duration-200"
          style={{ color: "var(--text-main)" }}
        >
          {item.title}
        </strong>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          {item.subtitle}
        </p>
      </div>

      {item.change && (
        <span
          className="font-black text-xs whitespace-nowrap tabular-nums"
          style={{
            color: item.change.startsWith("+") ? "#10b981" : "#ef4444",
          }}
        >
          {item.change}
        </span>
      )}
    </div>
  );
}
