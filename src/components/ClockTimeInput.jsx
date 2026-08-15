import { useEffect, useMemo, useRef, useState } from "react";

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseTime(value) {
  if (!value) return { hour12: 12, minute: 0, ampm: "am" };
  const [h, m] = value.split(":").map(Number);
  let hour = Number.isFinite(h) ? h : 0;
  const minute = Number.isFinite(m) ? m : 0;
  let ampm = "am";
  if (hour >= 12) {
    ampm = "pm";
    if (hour > 12) hour -= 12;
  } else if (hour === 0) {
    hour = 12;
  }
  return { hour12: hour || 12, minute, ampm };
}

function to24(hour12, ampm, minute) {
  let h = hour12;
  if (ampm === "am") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${pad2(h)}:${pad2(minute)}`;
}

export default function ClockTimeInput({ value, onChange, className = "", ...rest }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("hour");
  const parsed = useMemo(() => parseTime(value), [value]);
  const [ampm, setAmpm] = useState(parsed.ampm);
  const [selHour, setSelHour] = useState(parsed.hour12);
  const [selMinute, setSelMinute] = useState(parsed.minute);
  // On touch devices, closing the overlay on tap can let the same tap
  // "fall through" as a synthetic click on whatever is now underneath —
  // which is this same input — reopening the picker instantly and making
  // it look permanently stuck open. Suppress re-opening for a moment after
  // any close.
  const suppressReopenRef = useRef(false);

  function closeAndSuppress() {
    setOpen(false);
    suppressReopenRef.current = true;
    setTimeout(() => { suppressReopenRef.current = false; }, 400);
  }

  function openPicker() {
    if (suppressReopenRef.current) return;
    setMode("hour");
    setAmpm(parsed.ampm);
    setSelHour(parsed.hour12);
    setSelMinute(parsed.minute);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") closeAndSuppress();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commit(h = selHour, a = ampm, m = selMinute) {
    const v = to24(h, a, m);
    if (onChange) onChange({ target: { value: v } });
    closeAndSuppress();
  }

  function selectHour(h) {
    setSelHour(h);
    setMode("minute");
  }

  function selectMinute(m) {
    setSelMinute(m);
  }

  const display = useMemo(() => {
    const p = parseTime(value);
    return value ? `${pad2(p.hour12)}:${pad2(p.minute)} ${p.ampm.toUpperCase()}` : "--:--";
  }, [value]);

  const numbers = mode === "hour" ? HOURS : MINUTES;
  const radius = 92;

  return (
    <>
      <input
        type="text"
        readOnly
        value={display}
        onFocus={openPicker}
        onClick={openPicker}
        placeholder="--:--"
        className={className}
        {...rest}
      />
      {open && (
        <div
          onClick={closeAndSuppress}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(27,43,34,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              borderRadius: 14,
              padding: "24px 18px",
              width: 320,
              maxWidth: "100%",
              maxHeight: "calc(100vh - 32px)",
              overflow: "auto",
              background: "var(--panel, #fff)",
              boxShadow: "0 16px 40px rgba(27,43,34,0.25)",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 600, marginBottom: 14, color: "var(--ink, #1B2B22)" }}>
              {pad2(selHour)}:{pad2(selMinute)} {ampm.toUpperCase()}
            </div>
            <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 12.5, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted, #6B7268)" }}>
              {mode === "hour" ? "Select hour" : "Select minutes"}
            </div>

            <div
              style={{
                position: "relative",
                width: 240,
                height: 240,
                borderRadius: "50%",
                margin: "0 auto",
                background: "var(--stone, #EFEBDF)",
              }}
            >
              {numbers.map((n, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x = 120 + radius * Math.cos(angle);
                const y = 120 + radius * Math.sin(angle);
                const selected =
                  (mode === "hour" && n === selHour) ||
                  (mode === "minute" && n === selMinute);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => (mode === "hour" ? selectHour(n) : selectMinute(n))}
                    style={{
                      position: "absolute",
                      left: x,
                      top: y,
                      width: 40,
                      height: 40,
                      marginLeft: -20,
                      marginTop: -20,
                      borderRadius: "50%",
                      border: "none",
                      background: selected ? "var(--brass, #A67C3D)" : "#FCFBF8",
                      color: selected ? "#fff" : "var(--ink, #1B2B22)",
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: selected ? "0 2px 6px rgba(166,124,61,0.4)" : "0 1px 3px rgba(27,43,34,0.1)",
                    }}
                  >
                    {pad2(n)}
                  </button>
                );
              })}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  gap: 4,
                  zIndex: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => setAmpm("am")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: "none",
                    background: ampm === "am" ? "var(--brass, #A67C3D)" : "var(--panel, #fff)",
                    color: ampm === "am" ? "#fff" : "var(--ink, #1B2B22)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setAmpm("pm")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: "none",
                    background: ampm === "pm" ? "var(--brass, #A67C3D)" : "var(--panel, #fff)",
                    color: ampm === "pm" ? "#fff" : "var(--ink, #1B2B22)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  PM
                </button>
              </div>
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "center" }}>
              <button type="button" className="lp-btn-ghost" onClick={closeAndSuppress}>
                Cancel
              </button>
              <button
                type="button"
                className="lp-btn-ghost"
                onClick={() => commit()}
                style={{ background: "var(--brass, #A67C3D)", color: "#fff", border: "1px solid var(--brass, #A67C3D)" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
