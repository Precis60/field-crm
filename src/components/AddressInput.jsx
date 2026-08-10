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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
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
  const [loadError, setLoadError] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [searchError, setSearchError] = useState("");
  const placesLibRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!key) return;
    loadGoogleMapsScript(key)
      .then(async (google) => {
        placesLibRef.current = await google.maps.importLibrary("places");
        setReady(true);
        setLoadError(false);
      })
      .catch(() => { setReady(false); setLoadError(true); });
  }, [key]);

  async function fetchSuggestions(text) {
    if (!placesLibRef.current || !text.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const { AutocompleteSuggestion } = placesLibRef.current;
      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: text,
      });
      if (!results || results.length === 0) {
        setSuggestions([]);
        setOpen(false);
        setSearchError("");
        return;
      }
      setSuggestions(
        results
          .filter((r) => r.placePrediction)
          .map((r) => ({
            id: r.placePrediction.placeId,
            label: r.placePrediction.text.text,
            prediction: r.placePrediction,
          }))
      );
      setOpen(true);
      setSearchError("");
    } catch (e) {
      setSuggestions([]);
      setOpen(false);
      setSearchError(e?.message || "Google Places request failed");
    }
  }

  function handleInput(e) {
    const text = e.target.value;
    onChangeRef.current(text);
    setSearchError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 250);
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
        onBlur={() => setTimeout(() => setOpen(false), 120)}
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
      {loadError && <p className="lp-hint">Google Places failed to load — manual entry only.</p>}
      {searchError && <p className="lp-hint" style={{ color: "#B4483A" }}>{searchError}</p>}
    </div>
  );
}
