import React, { useState } from "react";
import { Play, Clock } from "../Icons";
import SectionHeader from "./SectionHeader";

function formatDuration(dur) {
  if (!dur) return "--:--";
  if (typeof dur === "number") {
    const m = Math.floor(dur / 60);
    const s = Math.floor(dur % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return dur;
}

export default function QueueTable({ page, onPlay }) {
  const [hoveredRow, setHoveredRow] = useState(null);

  return (
    <section
      className="p-6 md:p-8 rounded-[32px] overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: "var(--bg-panel)",
        border: "1px solid var(--surface-line)",
      }}
    >
      <SectionHeader title={page.queueTitle} action={page.queueAction} />

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-separate" style={{ borderSpacing: "0 4px" }}>
          <thead>
            <tr
              className="text-[10px] uppercase tracking-widest font-black"
              style={{ color: "var(--text-soft)" }}
            >
              <th className="px-4 py-2 w-12 text-center">#</th>
              <th className="px-4 py-2">Tytuł</th>
              <th className="px-4 py-2 hidden md:table-cell">Szczegóły</th>
              <th className="px-4 py-2 w-24">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} />
                  <span>Czas</span>
                </div>
              </th>
              <th className="px-4 py-2 w-28 text-right pr-6">Energia</th>
            </tr>
          </thead>
          <tbody>
            {page.queue.map((item, index) => {
              const isHovered = hoveredRow === index;
              return (
                <tr
                  key={`${page.key}-${item.title}-${index}`}
                  className="group cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: isHovered ? "var(--bg-hover)" : "transparent",
                  }}
                  onClick={() => onPlay?.(item)}
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td
                    className="px-4 py-3.5 rounded-l-2xl text-sm font-black text-center tabular-nums transition-colors duration-200"
                    style={{ color: isHovered ? "var(--primary)" : "var(--text-soft)" }}
                  >
                    {isHovered ? (
                      <Play size={14} fill="currentColor" className="mx-auto" style={{ color: "var(--primary)" }} />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.thumbnail && (
                        <div
                          className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 transition-transform duration-300"
                          style={{
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--surface-line)",
                            transform: isHovered ? "scale(1.05)" : "scale(1)",
                          }}
                        >
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p
                          className="font-bold truncate text-sm transition-colors duration-200"
                          style={{ color: isHovered ? "var(--primary)" : "var(--text-main)" }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="text-xs truncate mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {item.artist}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td
                    className="px-4 py-3.5 text-xs truncate hidden md:table-cell"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {item.detail}
                  </td>
                  <td
                    className="px-4 py-3.5 text-xs font-mono tabular-nums"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {formatDuration(item.duration)}
                  </td>
                  <td className="px-4 py-3.5 rounded-r-2xl pr-6">
                    {item.energy !== undefined && (
                      <div className="flex items-center justify-end gap-3">
                        <div
                          className="w-16 h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: "var(--bg-hover-strong)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${item.energy}%`,
                              backgroundColor: item.energy > 70 ? "#10b981" : item.energy > 40 ? "var(--primary)" : "#f59e0b",
                            }}
                          />
                        </div>
                        <span
                          className="text-[10px] font-black w-8 tabular-nums"
                          style={{
                            color: item.energy > 70 ? "#10b981" : item.energy > 40 ? "var(--primary)" : "#f59e0b",
                          }}
                        >
                          {item.energy}%
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
