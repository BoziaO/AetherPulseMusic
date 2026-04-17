import React from "react";
import { ArrowRight } from "../Icons";

export default function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold font-display" style={{ color: "var(--text-main)" }}>{title}</h2>
      {action && (
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-bold transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-main)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          onClick={onAction}
        >
          {action}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
