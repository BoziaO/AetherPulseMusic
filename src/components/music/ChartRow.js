import React from "react";

export default function ChartRow({ item }) {
  return (
    <div className="chart-row group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all duration-300 cursor-pointer">
      <span className="chart-row__label font-bold text-neutral-600 min-w-[32px] group-hover:text-red-500 transition-colors">{item.label}</span>
      <div className="chart-row__copy flex-1 min-w-0">
        <strong className="block text-white truncate group-hover:text-red-400 transition-colors">{item.title}</strong>
        <p className="text-sm text-neutral-500 truncate mt-0.5">{item.subtitle}</p>
      </div>
      <div className="flex flex-col items-end">
        <span className={`font-bold text-sm whitespace-nowrap ${item.change?.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
          {item.change}
        </span>
      </div>
    </div>
  );
}
