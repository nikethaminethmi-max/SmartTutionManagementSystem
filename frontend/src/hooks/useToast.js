/**
 * useToast.js — Reusable Toast notification hook
 */
import { useState, useCallback } from "react";

let _nextId = 1;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, message, duration = 4000) => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    dismiss,
    success: (msg, dur) => push("success", msg, dur),
    error: (msg, dur) => push("error", msg, dur),
    warning: (msg, dur) => push("warning", msg, dur),
    info: (msg, dur) => push("info", msg, dur),
  };
}

export default useToast;
