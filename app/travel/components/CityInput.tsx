"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { fetchCities, type TravelCity } from "../lib/travelApi";

type Props = {
  id: string;
  label: string;
  placeholder: string;
  value: TravelCity | null;
  onSelect: (city: TravelCity | null) => void;
};

/** Champ ville avec autocomplétion branchée sur /travel/cities (débounce). */
export default function CityInput({ id, label, placeholder, value, onSelect }: Props) {
  const [query, setQuery] = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState<TravelCity[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value?.name || "");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    const handle = setTimeout(async () => {
      try {
        setSuggestions(await fetchCities(term));
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const pick = (city: TravelCity) => {
    onSelect(city);
    setQuery(city.name);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 focus-within:border-[var(--ml-gold)] focus-within:ring-2 focus-within:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5">
        <MapPin className="h-4 w-4 shrink-0 text-[var(--ml-gold-deep)] dark:text-yellow-400" aria-hidden="true" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && active >= 0 && suggestions[active]) {
              e.preventDefault();
              pick(suggestions[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="w-full bg-transparent text-sm font-medium text-[var(--ml-text)] outline-none placeholder:text-[var(--ml-text-soft)]/60 dark:text-white dark:placeholder:text-white/30"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[var(--ml-border)] bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#101a36]"
        >
          {suggestions.map((city, i) => (
            <li
              key={city.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(city);
              }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                i === active
                  ? "bg-[var(--ml-blue)]/5 text-[var(--ml-blue)] dark:bg-white/10 dark:text-white"
                  : "text-[var(--ml-text)] dark:text-white/80"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-[var(--ml-gold-deep)] dark:text-yellow-400" aria-hidden="true" />
              <span className="font-medium">{city.name}</span>
              {city.region && <span className="text-xs text-[var(--ml-text-soft)] dark:text-white/40">· {city.region}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
