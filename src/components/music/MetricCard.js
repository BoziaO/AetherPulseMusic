import React from "react";
import { Sparkles, TrendingUp, BadgeCheck } from "../Icons";

export default function MetricCard({ stat, index }) {
  const icons = [Sparkles, TrendingUp, BadgeCheck];
  const Icon = icons[index % icons.length];

  return (
    <article className="metric-card bg-neutral-900/50 border border-white/5 p-6 rounded-2xl hover:bg-neutral-800 transition-all duration-300 group">
      <span className="metric-card__icon w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg text-neutral-400 group-hover:text-red-500 transition-colors">
        <Icon size={20} />
      </span>
      <strong className="block text-3xl font-bold mt-4 text-white">{stat.value}</strong>
      <p className="text-neutral-400 text-sm mt-1">{stat.label}</p>
    </article>
  );
}
