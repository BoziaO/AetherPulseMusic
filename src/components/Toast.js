import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

const TYPE_COLORS = {
  error: { dot: "#ef4444", border: "rgba(239,68,68,0.25)" },
  success: { dot: "#10b981", border: "rgba(16,185,129,0.25)" },
  info: { dot: "#60a5fa", border: "rgba(96,165,250,0.15)" },
};

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
        {toasts.map((toast) => {
          const colors = TYPE_COLORS[toast.type] || TYPE_COLORS.info;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 min-w-[280px] max-w-[380px]"
              style={{
                backgroundColor: "var(--bg-panel)",
                border: `1px solid ${colors.border}`,
                color: "var(--text-main)",
                boxShadow: "var(--shadow-card)",
                animation: "toast-in 0.25s ease forwards",
              }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.dot }} />
              <span className="flex-1">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
