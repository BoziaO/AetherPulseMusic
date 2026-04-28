import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);
const ToastCenterContext = createContext(null);

const TYPE_COLORS = {
  error: { dot: "#ef4444", border: "rgba(239,68,68,0.25)" },
  success: { dot: "#10b981", border: "rgba(16,185,129,0.25)" },
  info: { dot: "#60a5fa", border: "rgba(96,165,250,0.15)" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++idRef.current;
    const createdAt = Date.now();
    setToasts((prev) => [...prev, { id, message, type, createdAt, exiting: false }]);
    setNotifications((prev) => [{ id, message, type, createdAt, read: false }, ...prev].slice(0, 50));
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => removeToast(id), 250);
    }, duration);
  }, [removeToast]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => removeToast(id), 250);
  }, [removeToast]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.reduce((acc, item) => acc + (item.read ? 0 : 1), 0),
    [notifications],
  );

  const toastCenterValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      clearNotifications,
      markAllNotificationsRead,
    }),
    [notifications, unreadCount, clearNotifications, markAllNotificationsRead],
  );

  return (
    <ToastContext.Provider value={showToast}>
      <ToastCenterContext.Provider value={toastCenterValue}>
        {children}
        <div className="fixed top-6 right-6 z-[500] flex flex-col gap-2.5 pointer-events-none">
          {toasts.map((toast) => {
            const colors = TYPE_COLORS[toast.type] || TYPE_COLORS.info;
            return (
              <div
                key={toast.id}
                className="pointer-events-auto px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 min-w-[280px] max-w-[420px]"
                style={{
                  backgroundColor: "var(--bg-panel)",
                  border: `1px solid ${colors.border}`,
                  color: "var(--text-main)",
                  boxShadow: "var(--shadow-card)",
                  animation: `${toast.exiting ? "toast-out" : "toast-in"} 0.25s ease forwards`,
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.dot }} />
                <span className="flex-1">{toast.message}</span>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="text-xs font-black px-2 py-1 rounded-lg"
                  style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
                >
                  Zamknij
                </button>
              </div>
            );
          })}
        </div>
      </ToastCenterContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function useToastCenter() {
  return useContext(ToastCenterContext);
}
