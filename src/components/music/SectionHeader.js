import React from "react";
import { ArrowRight } from "../Icons";

export default function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-white font-display">{title}</h2>
      <button 
        type="button" 
        className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white transition-colors" 
        onClick={onAction}
      >
        {action}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
