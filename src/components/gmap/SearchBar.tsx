"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";
import type { PlaceSelection, SearchBarProps } from "@/components/gmap/contracts";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;
const MAX_SUGGESTIONS = 5;

type Suggestion = { id: string; text: string; prediction: google.maps.places.PlacePrediction };

// Place search over the Places API (New) autocomplete. Own input + dropdown so it
// matches the dark side-menu styling. Autocomplete keystrokes share one session
// token (Google's billing pattern); a new token starts after each pick.
// https://developers.google.com/maps/documentation/javascript/place-autocomplete-new
export function SearchBar({ onSelect, placeholder = "Search a place…", className }: SearchBarProps) {
  const places = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [message, setMessage] = useState<string | null>(null);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const input = query.trim();
    if (!places || input.length < MIN_CHARS) {
      setSuggestions([]);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        token.current ??= new places.AutocompleteSessionToken();
        const { suggestions: raw } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: token.current,
        });
        if (id !== requestId.current) return; // a newer keystroke superseded this one
        const next = raw.flatMap((s) =>
          s.placePrediction
            ? [{ id: s.placePrediction.placeId, text: s.placePrediction.text.text, prediction: s.placePrediction }]
            : [],
        );
        setSuggestions(next.slice(0, MAX_SUGGESTIONS));
        setActive(-1);
        setMessage(next.length === 0 ? "No matches" : null);
        setOpen(true);
      } catch {
        if (id === requestId.current) setMessage("Search unavailable. Try again later.");
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, places]);

  async function pick(s: Suggestion) {
    setOpen(false);
    setQuery(s.text);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
      token.current = null; // session ends on a place-details request
      if (!place.location) throw new Error("no location");
      const selection: PlaceSelection = {
        lat: place.location.lat(),
        lon: place.location.lng(),
        label: place.formattedAddress ?? place.displayName ?? s.text,
      };
      setMessage(null);
      onSelect(selection);
    } catch {
      setMessage("Couldn’t load that place. Try another.");
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setMessage("Your browser doesn’t support location.");
      return;
    }
    setMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMessage(null);
        setOpen(false);
        setQuery("");
        onSelect({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Your location" });
      },
      (err) =>
        setMessage(err.code === err.PERMISSION_DENIED ? "Location permission denied." : "Couldn’t get your location."),
      { timeout: 10_000 },
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const s = suggestions[active >= 0 ? active : 0];
      if (s) void pick(s);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && suggestions.length > 0;

  return (
    <div
      className={`absolute left-1/2 top-3 z-20 w-[min(28rem,calc(100%-12rem))] -translate-x-1/2 ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[var(--panel)] px-4 py-2 text-[var(--ink)] focus-within:border-white/40">
        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls="place-suggestions"
          aria-autocomplete="list"
          aria-label="Search for a place"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setMessage(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={locate}
          aria-label="Use my location"
          title="Use my location"
          className="shrink-0 rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="3.5" />
            <circle cx="12" cy="12" r="8" />
            <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {showList && (
        <ul
          id="place-suggestions"
          role="listbox"
          className="mt-2 overflow-hidden rounded-xl border border-white/15 bg-[var(--panel)] py-1 text-sm text-[var(--ink)]"
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pick(s)}
                className={`block w-full px-4 py-2 text-left hover:bg-white/10 ${i === active ? "bg-white/10" : ""}`}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p role="status" className="mt-2 rounded-lg bg-[var(--panel)] px-4 py-2 text-xs text-slate-300">
          {message}
        </p>
      )}
    </div>
  );
}
