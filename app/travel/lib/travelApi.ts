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
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export class NotFoundError extends Error {
  constructor() {
    super("not_found");
    this.name = "NotFoundError";
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await authFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((payload as { error?: string })?.error || `Erreur ${res.status}`);
  return payload as T;
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
  boat: "🚤",
  moto: "🏍️",
  helico: "🚁",
  hotel: "🏨",
  rental: "🚗",
};

/**
 * Catégories affichées dans le moteur de recherche.
 * TOUJOURS disponibles (aucun libellé « Bientôt ») : une catégorie sans
 * partenaire renvoie simplement « Aucun partenaire disponible actuellement. ».
 * `mode` = mode_code interrogé côté /travel/search ; `searchable=false` pour
 * les catégories hors modèle de trajet (hôtel, location) tant que le backend
 * dédié n'existe pas.
 */
export type TravelCategory = { code: string; label: string; emoji: string; mode?: string; searchable: boolean };
export const CATEGORIES: TravelCategory[] = [
  { code: "plane", label: "Avion", emoji: "✈️", mode: "plane", searchable: true },
  { code: "train", label: "Train", emoji: "🚆", mode: "train", searchable: true },
  { code: "bus", label: "Bus", emoji: "🚌", mode: "bus", searchable: true },
  { code: "taxi", label: "Taxi", emoji: "🚖", mode: "taxi", searchable: true },
  { code: "moto", label: "Moto-taxi", emoji: "🏍️", mode: "moto", searchable: true },
  { code: "boat", label: "Bateau", emoji: "🚤", mode: "boat", searchable: true },
  { code: "helico", label: "Hélicoptère", emoji: "🚁", mode: "helico", searchable: true },
  { code: "hotel", label: "Hôtel", emoji: "🏨", searchable: false },
  { code: "rental", label: "Location de voiture", emoji: "🚗", searchable: false },
];

/* ─────────────────────── Espace partenaire (SaaS) ─────────────────────── */

export type TravelCompany = {
  id: number;
  name: string;
  logo_url: string;
  description: string;
  phone: string;
  email: string;
  rating: number;
  rating_count: number;
  status: string;
  verified: boolean;
};

export type TravelVehicle = {
  id: number;
  name: string;
  registration: string;
  mode_code: string;
  capacity: number;
  has_ac: boolean;
  has_wifi: boolean;
  has_usb: boolean;
  has_tv: boolean;
  has_toilet: boolean;
  state: string;
  status: string;
};

export type TravelRoute = {
  id: number;
  mode_code: string;
  origin_city: string;
  destination_city: string;
  origin_city_id: number;
  destination_city_id: number;
  duration_minutes: number | null;
  distance_km: number | null;
  services: string[];
  status: string;
};

/** Compagnie du partenaire courant (404 → NotFoundError si aucune). */
export async function fetchMyCompany(): Promise<TravelCompany> {
  const data = await getJson<{ company: TravelCompany }>("/travel/partner/company");
  return data.company;
}

export async function createCompany(body: {
  name: string;
  phone?: string;
  email?: string;
  description?: string;
  logo_url?: string;
}): Promise<TravelCompany> {
  const data = await postJson<{ company: TravelCompany }>("/travel/partner/company", body);
  return data.company;
}

export async function fetchVehicles(): Promise<TravelVehicle[]> {
  const data = await getJson<{ vehicles: TravelVehicle[] }>("/travel/partner/vehicles");
  return data.vehicles || [];
}

export async function createVehicle(body: Record<string, unknown>): Promise<TravelVehicle> {
  const data = await postJson<{ vehicle: TravelVehicle }>("/travel/partner/vehicles", body);
  return data.vehicle;
}

export async function fetchRoutes(): Promise<TravelRoute[]> {
  const data = await getJson<{ routes: TravelRoute[] }>("/travel/partner/routes");
  return data.routes || [];
}

export async function createRoute(body: Record<string, unknown>): Promise<TravelRoute> {
  const data = await postJson<{ route: TravelRoute }>("/travel/partner/routes", body);
  return data.route;
}

export async function createSchedule(routeId: number, body: Record<string, unknown>) {
  return postJson<{ schedule: { id: number } }>(`/travel/partner/routes/${routeId}/schedules`, body);
}

export async function createPrice(routeId: number, body: Record<string, unknown>) {
  return postJson<{ price: { id: number } }>(`/travel/partner/routes/${routeId}/prices`, body);
}
