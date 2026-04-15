import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-6 right-6 z-[500] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 min-w-[280px] max-w-[380px] border ${
              toast.type === "error"
                ? "bg-neutral-950 border-red-500/30 text-white"
                : toast.type === "success"
                ? "bg-neutral-950 border-emerald-500/30 text-white"
                : "bg-neutral-950 border-white/10 text-white"
            }`}
            style={{ animation: "toast-in 0.25s ease forwards" }}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                toast.type === "error"
                  ? "bg-red-500"
                  : toast.type === "success"
                  ? "bg-emerald-500"
                  : "bg-blue-400"
              }`}
            />
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast musi być użyty wewnątrz ToastProvider");
  return ctx;
}
