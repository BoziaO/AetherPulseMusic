import React, { useEffect, useRef, useState } from "react";

function CreatePlaylistModal({ onConfirm, onCancel, type = "youtube" }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("PRIVATE");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm({ title: title.trim(), description: description.trim(), privacyStatus: privacy });
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "var(--bg-input)",
    border: "1px solid var(--surface-line)",
    borderRadius: "12px",
    color: "var(--text-main)",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="relative rounded-3xl p-8 w-full max-w-md shadow-2xl"
        style={{
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--surface-line)",
          color: "var(--text-main)",
        }}
      >
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-main)" }}>Nowa playlista</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          {type === "local" ? "Lokalna playlista zostanie utworzona." : "Playlista zostanie utworzona w YouTube Music."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-soft)" }}>
              Nazwa *
            </label>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              placeholder="Moja playlista..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-soft)" }}>
              Opis
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, resize: "none" }}
              rows={3}
              placeholder="Opis playlisty..."
            />
          </div>

          {type !== "local" && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-soft)" }}>
                Widoczność
              </label>
              <div className="flex gap-2">
                {[
                  { value: "PRIVATE", label: "Prywatna" },
                  { value: "UNLISTED", label: "Niewidoczna" },
                  { value: "PUBLIC", label: "Publiczna" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrivacy(opt.value)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={
                      privacy === opt.value
                        ? { backgroundColor: "var(--primary)", color: "#fff" }
                        : { backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 rounded-full text-sm font-bold transition-colors"
              style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-main)" }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-6 py-3 rounded-full text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Utwórz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatePlaylistModal;
