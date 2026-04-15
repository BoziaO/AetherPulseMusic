import React, { useEffect, useRef, useState } from "react";

function CreatePlaylistModal({ onConfirm, onCancel, type = "youtube" }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("PRIVATE");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm({ title: title.trim(), description: description.trim(), privacyStatus: privacy });
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={handleBackdropClick}
    >
      <div className="relative bg-neutral-950 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-1">Nowa playlista</h2>
        <p className="text-sm text-neutral-500 mb-6">
          {type === "local" ? "Lokalna playlista zostanie utworzona." : "Playlista zostanie utworzona w YouTube Music."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
              Nazwa *
            </label>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-neutral-600 outline-none focus:border-red-500/50 transition-colors text-sm"
              placeholder="Moja playlista..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
              Opis
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-neutral-600 outline-none focus:border-red-500/50 transition-colors resize-none text-sm"
              rows={3}
              placeholder="Opis playlisty..."
            />
          </div>

          {type !== "local" && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
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
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      privacy === opt.value
                        ? "bg-red-600 text-white"
                        : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                    }`}
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
              className="flex-1 px-6 py-3 rounded-full bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-6 py-3 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
