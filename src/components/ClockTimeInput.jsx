import { useEffect, useMemo, useState } from "react";

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

  function openPicker() {
    setMode("hour");
    setAmpm(parsed.ampm);
    setSelHour(parsed.hour12);
    setSelMinute(parsed.minute);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function commit(h = selHour, a = ampm, m = selMinute) {
    const v = to24(h, a, m);
    if (onChange) onChange({ target: { value: v } });
    setOpen(false);
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
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
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
              border: "none",
              borderRadius: 12,
              padding: "24px 16px",
              width: 320,
              maxWidth: "100%",
              maxHeight: "calc(100vh - 32px)",
              overflow: "auto",
              background: "#fff",
              boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 16 }}>
              {pad2(selHour)}:{pad2(selMinute)} {ampm.toUpperCase()}
            </div>
            <div style={{ marginBottom: 16, fontWeight: 600, color: "#666" }}>
              {mode === "hour" ? "Select hour" : "Select minutes"}
            </div>

            <div
              style={{
                position: "relative",
                width: 240,
                height: 240,
                borderRadius: "50%",
                margin: "0 auto",
                background: "#f4f6f8",
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
                      background: selected ? "#1890ff" : "#fff",
                      color: selected ? "#fff" : "#1a1a1a",
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
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
                    background: ampm === "am" ? "#1890ff" : "#e4e7eb",
                    color: ampm === "am" ? "#fff" : "#1a1a1a",
                    fontWeight: 700,
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
                    background: ampm === "pm" ? "#1890ff" : "#e4e7eb",
                    color: ampm === "pm" ? "#fff" : "#1a1a1a",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  PM
                </button>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
              <button type="button" className="lp-btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="lp-btn-ghost"
                onClick={() => commit()}
                style={{ background: "#1890ff", color: "#fff", border: "1px solid #1890ff" }}
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
