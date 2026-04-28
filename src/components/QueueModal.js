import React, { useState } from "react";
import { X, Trash2, Play, Music, Plus } from "./Icons";
import { useToast } from "./Toast";
import { useLanguage } from "../contexts/LanguageContext";
import { useFocusTrap } from "../hooks/useFocusTrap";

export default function QueueModal({ isOpen, onClose, queue, currentTrackIndex, onSelectTrack, onRemoveTrack }) {
  const [newQueueTitle, setNewQueueTitle] = useState("");
  const showToast = useToast();
  const { t } = useLanguage();
  const trapRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  const handleSaveQueue = () => {
    if (newQueueTitle.trim()) {
      // Save current queue with title
      const queueData = {
        title: newQueueTitle,
        tracks: queue,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(
        `queue-${Date.now()}`,
        JSON.stringify(queueData)
      );
      setNewQueueTitle("");
      showToast(t("queueSaved"), "success");
    }
  };

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("queuePlayback")}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--surface-line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: "var(--surface-line)" }}
        >
          <h2 className="text-2xl font-black" style={{ color: "var(--text-main)" }}>
            {t("queuePlayback")}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors"
            style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
            aria-label={t("close")}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {queue && queue.length > 0 ? (
            queue.map((track, index) => (
              <div key={`${index}-${track.id || track.title}`} onClick={() => onSelectTrack?.(index)}
                className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
                style={{
                  backgroundColor: index === currentTrackIndex ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                  border: "1px solid " + (index === currentTrackIndex ? "var(--primary)" : "transparent"),
                }}
              >
                <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold"
                  style={{ backgroundColor: index === currentTrackIndex ? "var(--primary)" : "var(--bg-hover)", color: index === currentTrackIndex ? "white" : "var(--text-muted)" }}>
                  {index === currentTrackIndex ? <Play size={12} fill="currentColor" /> : <span>{index + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm" style={{ color: "var(--text-main)" }}>{track.title}</p>
                  <p className="text-xs truncate opacity-50">{track.artist || t("unknownArtist")}</p>
                </div>
                <span className="text-[11px] font-medium opacity-30 flex-shrink-0">{track.duration || "0:00"}</span>
                <button onClick={(e) => { e.stopPropagation(); onRemoveTrack?.(index); }}
                  className="p-1.5 rounded-md transition-colors flex-shrink-0 opacity-30 hover:opacity-100"
                  style={{ color: "var(--text-muted)" }} title={t("removeFromQueue")}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 opacity-40">
              <Music size={40} className="mb-3" />
              <p className="text-sm font-medium">{t("queueEmpty")}</p>
            </div>
          )}
        </div>

        {/* Save Queue Section */}
        {queue && queue.length > 0 && (
          <div className="border-t p-4 space-y-2" style={{ borderColor: "var(--surface-line)", backgroundColor: "var(--bg-card)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-40">{t("saveQueue")}</p>
            <div className="flex gap-2">
              <input type="text" placeholder={t("queueName")} value={newQueueTitle} onChange={(e) => setNewQueueTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                style={{ backgroundColor: "var(--bg-panel)", borderColor: "var(--surface-line)", color: "var(--text-main)" }} />
              <button onClick={handleSaveQueue} disabled={!newQueueTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-30"
                style={{ backgroundColor: newQueueTitle.trim() ? "var(--primary)" : "var(--bg-hover)", color: "white" }}>
                <Plus size={14} /> {t("save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

