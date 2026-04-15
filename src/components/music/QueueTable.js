import React from "react";
import { RefreshCw } from "../Icons";
import SectionHeader from "./SectionHeader";

export default function QueueTable({ page, onPlay }) {
  return (
    <section className="bg-neutral-900/30 border border-white/5 p-6 md:p-8 rounded-[32px] overflow-hidden backdrop-blur-sm transition-all hover:bg-neutral-900/40">
      <SectionHeader title={page.queueTitle} action={page.queueAction} />

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest font-black text-neutral-500">
              <th className="px-4 py-2 w-12 text-center">#</th>
              <th className="px-4 py-2">Tytuł</th>
              <th className="px-4 py-2 hidden md:table-cell">Szczegóły</th>
              <th className="px-4 py-2 w-24">
                <div className="flex items-center gap-1">
                  <RefreshCw size={12} />
                  <span>Czas</span>
                </div>
              </th>
              <th className="px-4 py-2 w-28 text-right pr-6">Energia</th>
            </tr>
          </thead>
          <tbody className="before:block before:h-2">
            {page.queue.map((item, index) => (
              <tr 
                key={`${page.key}-${item.title}-${index}`} 
                className="group cursor-pointer hover:bg-white/5 transition-all"
                onClick={() => onPlay?.(item)}
              >
                <td className="px-4 py-4 rounded-l-2xl text-sm font-bold text-neutral-600 group-hover:text-red-500 transition-colors text-center">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.thumbnail && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800 border border-white/5">
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate text-sm group-hover:text-red-400 transition-colors">{item.title}</p>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">{item.artist}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-neutral-400 truncate hidden md:table-cell">
                  {item.detail}
                </td>
                <td className="px-4 py-4 text-xs text-neutral-500 font-mono">
                  {item.duration}
                </td>
                <td className="px-4 py-4 rounded-r-2xl pr-6">
                  <div className="flex items-center justify-end gap-3">
                    <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000" 
                        style={{ width: `${item.energy}%` }} 
                      />
                    </div>
                    <span className="text-[10px] font-black text-emerald-500 w-8">{item.energy}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
