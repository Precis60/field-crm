import ClockTimeInput from "./ClockTimeInput";

export default function DateTimeClockInput({ value, onChange, className = "", ...rest }) {
  const [date, time] = (value || "").split("T");

  function handleDate(e) {
    const newDate = e.target.value;
    const next = newDate && time ? `${newDate}T${time}` : "";
    if (onChange) onChange({ target: { value: next } });
  }

  function handleTime(e) {
    const newTime = e.target.value;
    const next = date && newTime ? `${date}T${newTime}` : value;
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
      <input
        type="date"
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
