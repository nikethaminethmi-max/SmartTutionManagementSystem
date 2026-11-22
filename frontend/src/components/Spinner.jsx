/**
 * Spinner.jsx — Reusable loading spinner (Phase 6 polish)
 *
 * Usage:
 *   <Spinner />                    — small, centered
 *   <Spinner size={48} color="#7c3aed" />
 *   <PageSpinner label="Loading dashboard…" />
 */

// ── Inline CSS keyframe injected once ────────────────────────────────────────
let _keyframesInjected = false;
function injectKeyframes() {
  if (_keyframesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes tms-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes tms-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: .4; }
    }
  `;
  document.head.appendChild(style);
  _keyframesInjected = true;
}

// ── Circular spinner ──────────────────────────────────────────────────────────
export default function Spinner({ size = 28, color = "#7c3aed", thickness = 3 }) {
  injectKeyframes();
  return (
    <div
      style={{
        width:  size,
        height: size,
        borderRadius: "50%",
        border: `${thickness}px solid ${color}22`,
        borderTopColor: color,
        animation: "tms-spin .7s linear infinite",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

// ── Full-page loading screen ──────────────────────────────────────────────────
export function PageSpinner({ label = "Loading…", icon = "📚" }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f1f5f9",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui,'Segoe UI',sans-serif",
    }}>
      <div style={{ textAlign: "center", color: "#7c3aed" }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: "tms-pulse 1.6s ease-in-out infinite" }}>
          {icon}
        </div>
        <Spinner size={40} thickness={4} />
        <div style={{ marginTop: 16, fontSize: 15, color: "#6b7280" }}>{label}</div>
      </div>
    </div>
  );
}

// ── Inline button spinner ─────────────────────────────────────────────────────
export function ButtonSpinner({ color = "#ffffff" }) {
  injectKeyframes();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 14, height: 14,
        borderRadius: "50%",
        border: `2px solid ${color}44`,
        borderTopColor: color,
        animation: "tms-spin .7s linear infinite",
        display: "inline-block",
      }} />
    </span>
  );
}

