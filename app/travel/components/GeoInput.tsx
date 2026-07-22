"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Globe } from "lucide-react";
import { geoSearch, ensureLocationId, type GeoPlace } from "../lib/travelApi";

type Props = {
  id: string;
  label: string;
  placeholder: string;
  value: GeoPlace | null;
  onSelect: (place: GeoPlace | null) => void;
};

/**
 * Champ lieu à autocomplétion MONDIALE (référentiel geo_locations + géocodage).
 * À la sélection d'un candidat fournisseur (id null), le lieu est persisté puis
 * renvoyé avec un id — jamais de texte libre non vérifié.
 */
export default function GeoInput({ id, label, placeholder, value, onSelect }: Props) {
  const [query, setQuery] = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value?.name || ""); }, [value]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    const handle = setTimeout(async () => {
      try { setSuggestions(await geoSearch(term)); }
      catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const pick = async (place: GeoPlace) => {
    setQuery(place.name);
    setOpen(false);
    setActive(-1);
    try {
      const resolved = await ensureLocationId(place);
      onSelect(resolved);
    } catch {
      onSelect(null);
    }
  };

  const labelOf = (p: GeoPlace) => [p.city && p.city !== p.name ? p.city : "", p.region, p.country_name].filter(Boolean).join(", ");

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 focus-within:border-[var(--ml-gold)] focus-within:ring-2 focus-within:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5">
        <Globe className="h-4 w-4 shrink-0 text-[var(--ml-gold-deep)] dark:text-yellow-400" aria-hidden="true" />
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
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && active >= 0 && suggestions[active]) { e.preventDefault(); pick(suggestions[active]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          className="w-full bg-transparent text-sm font-medium text-[var(--ml-text)] outline-none placeholder:text-[var(--ml-text-soft)]/60 dark:text-white dark:placeholder:text-white/30"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--ml-text-soft)]" aria-hidden="true" />}
      </div>

      {open && (loading || suggestions.length > 0) && (
        <ul id={`${id}-listbox`} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[var(--ml-border)] bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#101a36]">
          {suggestions.length === 0 && loading && (
            <li className="px-3 py-2 text-sm text-[var(--ml-text-soft)] dark:text-white/50">Recherche…</li>
          )}
          {suggestions.map((p, i) => (
            <li
              key={`${p.id ?? "c"}-${p.external_place_id ?? i}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm ${i === active ? "bg-[var(--ml-blue)]/5 dark:bg-white/10" : ""}`}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ml-gold-deep)] dark:text-yellow-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-medium text-[var(--ml-text)] dark:text-white">{p.name}{p.country_code ? ` · ${p.country_code}` : ""}</span>
                {labelOf(p) && <span className="block truncate text-xs text-[var(--ml-text-soft)] dark:text-white/40">{labelOf(p)}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
