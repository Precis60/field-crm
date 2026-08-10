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
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!key) return;
    loadGoogleMapsScript(key)
      .then(() => setReady(true))
      .catch(() => { setReady(false); setError(true); });
  }, [key]);

  useEffect(() => {
    if (ready && inputRef.current && window.google) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current);
      const listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address) {
          onChangeRef.current(place.formatted_address);
        }
      });
      return () => {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      };
    }
  }, [ready]);

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
    <>
      <input
        ref={inputRef}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
      />
      {error && <p className="lp-hint">Google Places failed to load — manual entry only.</p>}
    </>
  );
}
