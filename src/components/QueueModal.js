import React, { useState } from "react";
import { X, Trash2, Play, Music, Plus } from "./Icons";

export default function QueueModal({ isOpen, onClose, queue, currentTrackIndex, onSelectTrack, onRemoveTrack }) {
  const [newQueueTitle, setNewQueueTitle] = useState("");

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
      alert("Kolejka zapisana!");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--surface-line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: "var(--surface-line)" }}
        >
          <h2 className="text-2xl font-black" style={{ color: "var(--text-main)" }}>
            Kolejka odtwarzania
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-all hover:scale-110"
            style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {queue && queue.length > 0 ? (
            queue.map((track, index) => (
              <div
                key={`${index}-${track.id || track.title}`}
                onClick={() => onSelectTrack?.(index)}
                className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
                style={{
                  backgroundColor:
                    index === currentTrackIndex
                      ? "color-mix(in srgb, var(--primary) 20%, transparent)"
                      : "var(--bg-card)",
                  border:
                    index === currentTrackIndex
                      ? "1px solid var(--primary)"
                      : "1px solid var(--surface-line)",
                  opacity: index === currentTrackIndex ? 1 : 0.7,
                }}
              >
                {/* Index or Play Icon */}
                <div
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{
                    backgroundColor:
                      index === currentTrackIndex
                        ? "var(--primary)"
                        : "var(--bg-hover)",
                    color:
                      index === currentTrackIndex
                        ? "white"
                        : "var(--text-muted)",
                  }}
                >
                  {index === currentTrackIndex ? (
                    <Play size={14} fill="currentColor" />
                  ) : (
                    <span className="text-xs font-black">{index + 1}</span>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold truncate text-sm"
                    style={{ color: "var(--text-main)" }}
                  >
                    {track.title}
                  </p>
                  <p
                    className="text-xs truncate mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {track.artist || "Unknown Artist"}
                  </p>
                </div>

                {/* Duration */}
                <span
                  className="text-xs font-black flex-shrink-0"
                  style={{ color: "var(--text-soft)" }}
                >
                  {track.duration || "0:00"}
                </span>

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTrack?.(index);
                  }}
                  className="p-2 rounded-lg transition-all hover:scale-110 flex-shrink-0"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--text-soft)",
                  }}
                  title="Usuń z kolejki"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16"
              style={{ color: "var(--text-muted)" }}
            >
              <Music size={48} className="mb-4 opacity-30" />
              <p className="text-sm font-bold">Kolejka jest pusta</p>
            </div>
          )}
        </div>

        {/* Save Queue Section */}
        {queue && queue.length > 0 && (
          <div
            className="border-t p-6 space-y-3"
            style={{ borderColor: "var(--surface-line)", backgroundColor: "var(--bg-card)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>
              Zapisz tę kolejkę
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Nazwa kolejki..."
                value={newQueueTitle}
                onChange={(e) => setNewQueueTitle(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all"
                style={{
                  backgroundColor: "var(--bg-panel)",
                  borderColor: "var(--surface-line)",
                  color: "var(--text-main)",
                }}
              />
              <button
                onClick={handleSaveQueue}
                disabled={!newQueueTitle.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{
                  backgroundColor: newQueueTitle.trim() ? "var(--primary)" : "var(--bg-hover)",
                  color: "white",
                }}
              >
                <Plus size={16} />
                Zapisz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

