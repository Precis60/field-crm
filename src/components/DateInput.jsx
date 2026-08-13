import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseISODate(v) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

function toISODate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function todayParts() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

// Monday-start weekday index (0 = Monday .. 6 = Sunday) for the given date.
function weekdayIndex(year, month, day) {
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (jsDay + 6) % 7;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatDisplay(v) {
  const p = parseISODate(v);
  if (!p) return "";
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DateInput({ value, onChange, className = "", placeholder = "Select date", allowClear = true, ...rest }) {
  const [open, setOpen] = useState(false);
  const parsed = parseISODate(value);
  const today = todayParts();
  const [viewYear, setViewYear] = useState((parsed || today).year);
  const [viewMonth, setViewMonth] = useState((parsed || today).month);

  function openPicker() {
    const p = parseISODate(value) || today;
    setViewYear(p.year);
    setViewMonth(p.month);
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

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function pick(day) {
    const v = toISODate(viewYear, viewMonth, day);
    if (onChange) onChange({ target: { value: v } });
    setOpen(false);
  }

  function goToday() {
    setViewYear(today.year);
    setViewMonth(today.month);
    const v = toISODate(today.year, today.month, today.day);
    if (onChange) onChange({ target: { value: v } });
    setOpen(false);
  }

  function clear() {
    if (onChange) onChange({ target: { value: "" } });
    setOpen(false);
  }

  const cells = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const leadEmpty = weekdayIndex(viewYear, viewMonth, 1);
    const arr = [];
    for (let i = 0; i < leadEmpty; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  const display = formatDisplay(value);

  return (
    <>
      <input
        type="text"
        readOnly
        value={display}
        onFocus={openPicker}
        onClick={openPicker}
        placeholder={placeholder}
        className={className}
        {...rest}
      />
      {open && (
        <div
          onClick={() => setOpen(false)}
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
              padding: "20px 18px",
              width: 320,
              maxWidth: "100%",
              maxHeight: "calc(100vh - 32px)",
              overflow: "auto",
              background: "var(--panel, #fff)",
              boxShadow: "0 16px 40px rgba(27,43,34,0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line, #DED8C8)",
                  background: "#FCFBF8", color: "var(--ink, #1B2B22)", cursor: "pointer", fontSize: 15,
                }}
              >
                ‹
              </button>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: "var(--ink, #1B2B22)" }}>
                {MONTH_NAMES[viewMonth - 1]} {viewYear}
              </div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line, #DED8C8)",
                  background: "#FCFBF8", color: "var(--ink, #1B2B22)", cursor: "pointer", fontSize: 15,
                }}
              >
                ›
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
              {WEEKDAYS.map((w, i) => (
                <div
                  key={i}
                  style={{
                    textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
                    textTransform: "uppercase", color: "var(--muted, #6B7268)", padding: "4px 0",
                  }}
                >
                  {w}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {cells.map((day, i) => {
                if (day == null) return <div key={i} />;
                const isSelected = parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day;
                const isToday = today.year === viewYear && today.month === viewMonth && today.day === day;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(day)}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 9,
                      border: isToday && !isSelected ? "1px solid var(--brass, #A67C3D)" : "1px solid transparent",
                      background: isSelected ? "var(--brass, #A67C3D)" : "#FCFBF8",
                      color: isSelected ? "#fff" : "var(--ink, #1B2B22)",
                      fontWeight: isSelected || isToday ? 700 : 500,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "space-between" }}>
              {allowClear ? (
                <button type="button" className="lp-btn-ghost" onClick={clear}>
                  Clear
                </button>
              ) : <span />}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="lp-btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="lp-btn-ghost"
                  onClick={goToday}
                  style={{ background: "var(--brass, #A67C3D)", color: "#fff", border: "1px solid var(--brass, #A67C3D)" }}
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
