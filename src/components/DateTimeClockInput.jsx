import ClockTimeInput from "./ClockTimeInput";
import DateInput from "./DateInput";

export default function DateTimeClockInput({ value, onChange, className = "", ...rest }) {
  const [date, time] = (value || "").split("T");

  function handleDate(e) {
    const newDate = e.target.value;
    if (!newDate) {
      if (onChange) onChange({ target: { value: "" } });
      return;
    }
    const next = `${newDate}T${time || "00:00"}`;
    if (onChange) onChange({ target: { value: next } });
  }

  function handleTime(e) {
    const newTime = e.target.value;
    if (!newTime) return;
    const baseDate = date || new Date().toISOString().slice(0, 10);
    const next = `${baseDate}T${newTime}`;
    if (onChange) onChange({ target: { value: next } });
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "stretch",
        flexWrap: "wrap",
      }}
    >
      <DateInput
        className={className}
        value={date || ""}
        onChange={handleDate}
        style={{ flex: "1 1 120px", minWidth: 120 }}
        {...rest}
      />
      <ClockTimeInput
        value={time || ""}
        onChange={handleTime}
        className={className}
        style={{ flex: "0 0 110px", minWidth: 100 }}
      />
    </div>
  );
}
