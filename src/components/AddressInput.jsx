import { useEffect, useRef, useState } from "react";

let loadPromise = null;

function loadGoogleMapsScript(key) {
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.places) {
        resolve(window.google);
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error("Could not load Google Places"));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

export default function AddressInput({ value, onChange, placeholder, className = "lp-input" }) {
  const inputRef = useRef(null);
  const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const serviceRef = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!key) return;
    loadGoogleMapsScript(key)
      .then(() => { setReady(true); setError(false); })
      .catch(() => { setReady(false); setError(true); });
  }, [key]);

  useEffect(() => {
    if (ready && window.google && !serviceRef.current) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
    }
  }, [ready]);

  function fetchSuggestions(text) {
    if (!serviceRef.current || !text.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    serviceRef.current.getPlacePredictions(
      { input: text, types: ["address"] },
      (predictions, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
          setSuggestions([]);
          setOpen(false);
          return;
        }
        setSuggestions(predictions.map((p) => ({ id: p.place_id, label: p.description })));
        setOpen(true);
      }
    );
  }

  function handleInput(e) {
    const text = e.target.value;
    onChange(text);
    fetchSuggestions(text);
  }

  function select(s) {
    onChangeRef.current(s.label);
    setSuggestions([]);
    setOpen(false);
  }

  if (!key) {
    return (
      <>
        <input
          ref={inputRef}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          placeholder={placeholder}
        />
        <p className="lp-hint">Google Places key not configured — manual entry only.</p>
      </>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={value ?? ""}
        onChange={handleInput}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        className={className}
        placeholder={placeholder}
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 8,
            maxHeight: 220,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 11px",
                fontSize: 13,
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="lp-hint">Google Places failed to load — manual entry only.</p>}
    </div>
  );
}
