"use client";

/**
 * Couche API du module MaliLink Voyage.
 * Branchée sur les vraies routes Travel du backend (Lot 4A) via authFetch.
 * Aucune donnée fictive : chaque fonction interroge une API réelle.
 */

import { authFetch } from "../../lib/api";

export type TravelMode = {
  code: string;
  label: string;
  category: "land" | "air" | "rail" | "water";
  enabled: boolean;
};

export type TravelCity = {
  id: number;
  name: string;
  region: string;
  country: string;
};

export type TravelCompanyLite = {
  id: number;
  name: string;
  logo_url: string;
  rating: number;
  rating_count: number;
};

export type TravelOffer = {
  offer_id: string;
  route_id: number;
  schedule_id: number;
  mode_code: string;
  company: TravelCompanyLite;
  origin_city: string;
  destination_city: string;
  departure_time: string | null;
  arrival_time: string | null;
  duration_minutes: number | null;
  seats_total: number;
  seat_class: string;
  services: string[];
  baggage_included_kg: number | null;
  currency: string;
  promo: { type: string; value: number } | null;
  subtotal: number;
  discount: number;
  total: number;
};

export type TravelSearchResult = {
  count: number;
  comparator: {
    cheapest: string | null;
    fastest: string | null;
    best_rated: string | null;
  };
  offers: TravelOffer[];
};

async function getJson<T>(path: string): Promise<T> {
  const res = await authFetch(path, { cache: "no-store" });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export async function fetchModes(): Promise<TravelMode[]> {
  const data = await getJson<{ modes: TravelMode[] }>("/travel/modes");
  return data.modes || [];
}

export async function fetchCities(query: string): Promise<TravelCity[]> {
  const q = encodeURIComponent(query.trim());
  const data = await getJson<{ cities: TravelCity[] }>(`/travel/cities?q=${q}`);
  return data.cities || [];
}

export type SearchParams = {
  originCityId: number;
  destinationCityId: number;
  date: string;
  adults: number;
  children: number;
  mode?: string | null;
};

export async function searchOffers(p: SearchParams): Promise<TravelSearchResult> {
  const params = new URLSearchParams({
    origin: String(p.originCityId),
    destination: String(p.destinationCityId),
    date: p.date,
    adults: String(p.adults),
    children: String(p.children),
  });
  if (p.mode) params.set("mode", p.mode);
  return getJson<TravelSearchResult>(`/travel/search?${params.toString()}`);
}

/** Formatte des minutes en "4h30" / "45 min". */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Retire les secondes d'une heure "08:00:00" → "08:00". */
export function shortTime(t: string | null | undefined): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

/** Icône emoji par mode de transport (fallback ✈). */
export const MODE_EMOJI: Record<string, string> = {
  bus: "🚌",
  car: "🚌",
  minibus: "🚐",
  taxi: "🚖",
  private: "🚗",
  plane: "✈️",
  train: "🚆",
  boat: "🚢",
  moto: "🏍️",
  helico: "🚁",
};
