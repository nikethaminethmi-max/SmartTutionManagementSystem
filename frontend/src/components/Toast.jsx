/**
 * Toast.jsx — Global toast notification system
 */
import { useState, useEffect } from "react";

const THEME = {
  success: { bg: "#dcfce7", border: "#86efac", text: "#15803d", icon: "✅" },
  error:   { bg: "#fee2e2", border: "#fca5a5", text: "#dc2626", icon: "❌" },
  warning: { bg: "#fef9c3", border: "#fde047", text: "#ca8a04", icon: "⚠️" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", icon: "ℹ️" },
};

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const t = THEME[toast.type] ?? THEME.info;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 16px",
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        boxShadow: "0 4px 12px rgba(0,0,0,.12)",
        cursor: "pointer",
        maxWidth: 360,
        fontSize: 14,
        color: t.text,
        fontFamily: "system-ui,sans-serif",
        fontWeight: 500,
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.28s cubic-bezier(.22,1,.36,1), opacity 0.28s ease",
        marginBottom: 8,
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{t.icon}</span>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{toast.message}</span>
      <span style={{ fontSize: 16, opacity: 0.5, flexShrink: 0, marginTop: 1 }}>×</span>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        pointerEvents: "auto",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
