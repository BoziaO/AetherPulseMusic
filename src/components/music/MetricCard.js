import React from "react";
import { Sparkles, TrendingUp, BadgeCheck, Music, Heart, Clock } from "../Icons";

const ICONS = [Sparkles, TrendingUp, BadgeCheck, Music, Heart, Clock];

export default function MetricCard({ stat, index }) {
  const Icon = ICONS[index % ICONS.length];

  return (
    <article
      className="metric-card group cursor-default transition-all duration-300"
      style={{
        backgroundColor: "var(--bg-panel)",
        border: "1px solid var(--surface-line)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-card)";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = "var(--surface-line-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-panel)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--surface-line)";
      }}
    >
      <span
        className="w-10 h-10 flex items-center justify-center rounded-2xl transition-colors duration-300"
        style={{
          backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
          color: "var(--primary)",
        }}
      >
        <Icon size={18} />
      </span>
      <strong
        className="block mt-5 font-black tracking-tighter leading-none"
        style={{
          fontSize: "clamp(1.6rem, 3vw, 2rem)",
          fontFamily: '"Space Grotesk", sans-serif',
          color: "var(--text-main)",
        }}
      >
        {stat.value}
      </strong>
      <p
        className="mt-1.5 text-sm font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        {stat.label}
      </p>
    </article>
  );
}
