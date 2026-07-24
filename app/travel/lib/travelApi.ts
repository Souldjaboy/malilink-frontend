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

/* ─────────────────── Référentiel mondial des lieux (Lot 1) ─────────────────── */

export type GeoPlace = {
  id: number | null;              // null = candidat fournisseur non encore persisté
  name: string;
  country_code: string;
  country_name: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  location_type: string;
  source?: "local" | "provider";
  external_provider?: string;
  external_place_id?: string;
};

/** Autocomplétion mondiale (local + géocodage). */
export async function geoSearch(query: string): Promise<GeoPlace[]> {
  const q = encodeURIComponent(query.trim());
  const data = await getJson<{ results: GeoPlace[] }>(`/travel/geo/search?q=${q}`);
  return data.results || [];
}

/** Persiste un lieu choisi (candidat fournisseur) → renvoie le lieu avec un id. */
export async function persistLocation(place: GeoPlace): Promise<GeoPlace> {
  const data = await postJson<{ location: GeoPlace }>("/travel/geo/locations", {
    name: place.name, country_code: place.country_code, country_name: place.country_name,
    region: place.region, city: place.city, latitude: place.latitude, longitude: place.longitude,
    location_type: place.location_type, external_provider: place.external_provider,
    external_place_id: place.external_place_id,
  });
  return data.location;
}

/** Garantit un id : si le lieu vient du fournisseur (id null), on le persiste. */
export async function ensureLocationId(place: GeoPlace): Promise<GeoPlace> {
  return place.id != null ? place : persistLocation(place);
}

export type SearchParams = {
  originLocationId: number;
  destinationLocationId: number;
  date: string;
  adults: number;
  children: number;
  mode?: string | null;
};

export async function searchOffers(p: SearchParams): Promise<TravelSearchResult> {
  const params = new URLSearchParams({
    origin: String(p.originLocationId),
    destination: String(p.destinationLocationId),
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
  published?: boolean;
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

/** Publie une ligne dans le catalogue Marketplace (Lot A). */
export async function publishRoute(routeId: number, companyId: number) {
  return postJson<{ success: boolean }>(`/travel/partner/routes/${routeId}/publish`, { travel_company_id: companyId });
}
export async function unpublishRoute(routeId: number, companyId: number) {
  return postJson<{ success: boolean }>(`/travel/partner/routes/${routeId}/unpublish`, { travel_company_id: companyId });
}

/* ─────────────────── Catalogue Marketplace (Lot A) ─────────────────── */

export type CatalogOffer = {
  id: number;
  related_module: string;
  related_id: number;
  company_name: string;
  category: string;
  subcategory: string;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  availability: number | null;
  location: string;
  photos: string[];
};

export type CatalogCategory = {
  code: string;
  label: string;
  emoji: string;
  children: { code: string; label: string; emoji: string }[];
};

export type OfferDetail = {
  offer: CatalogOffer;
  route: {
    id: number; mode_code: string; duration_minutes: number | null; distance_km: number | null;
    services: string[]; baggage_policy: string; cancellation_policy: string; description: string; currency: string;
    company_name: string; logo_url: string; company_phone: string; rating: number; rating_count: number;
    origin: string; origin_lat: number | null; origin_lng: number | null; origin_country: string;
    destination: string; dest_lat: number | null; dest_lng: number | null; dest_country: string;
  };
  departures: {
    schedule_id: number; departure_time: string | null; arrival_time: string | null; days_of_week: number[];
    seats_total: number; seats_available: number; base_price: number | null; child_price: number | null; status: string;
  }[];
};

/** Détail public d'une offre catalogue (page de réservation). */
export async function fetchOfferDetail(catalogId: string | number): Promise<OfferDetail> {
  return getJson<OfferDetail>(`/travel/offer/${catalogId}`);
}

export async function fetchCatalogCategories(): Promise<CatalogCategory[]> {
  const data = await getJson<{ categories: CatalogCategory[] }>("/marketplace/catalog/categories");
  return data.categories || [];
}

export async function fetchCatalog(params: { category?: string; subcategory?: string; q?: string }): Promise<{ count: number; counts: Record<string, number>; offers: CatalogOffer[] }> {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.subcategory) sp.set("subcategory", params.subcategory);
  if (params.q) sp.set("q", params.q);
  return getJson(`/marketplace/catalog?${sp.toString()}`);
}

/* ─────────────── Réservation / Paiement Wallet / Billet ─────────────── */

export type TravelTicket = {
  ticket_number: string;
  verification_code: string;
  qr_payload: string;
  status: string;
  seat_number?: string;
};
export type TravelBooking = {
  reference: string;
  travel_date: string;
  total: number;
  currency: string;
  status: string;
  payment_status: string;
  origin?: string;
  destination?: string;
  company_name?: string;
};

export async function createTravelBooking(body: {
  route_id: number; schedule_id?: number | null; travel_date: string;
  seat_class?: string; adults: number; children: number;
  passengers: { first_name: string; last_name: string; phone?: string; email?: string }[];
}): Promise<TravelBooking> {
  const data = await postJson<{ booking: TravelBooking }>("/travel/bookings", body);
  return data.booking;
}
export async function payTravelBooking(reference: string): Promise<{ booking: TravelBooking; ticket: TravelTicket }> {
  return postJson<{ booking: TravelBooking; ticket: TravelTicket }>(`/travel/bookings/${reference}/pay`, {});
}
export async function fetchMyTrips(): Promise<(TravelBooking & { ticket_number?: string; verification_code?: string; qr_payload?: string; ticket_status?: string })[]> {
  const data = await getJson<{ bookings: (TravelBooking & { ticket_number?: string })[] }>("/travel/bookings/mine");
  return data.bookings || [];
}
export async function cancelTravelBooking(reference: string) {
  return postJson<{ success: boolean }>(`/travel/bookings/${reference}/cancel`, {});
}

/* ─────────────── Partenaire : réservations / stats / paiements / scan / POS ─────────────── */

export type PartnerStats = {
  vehicles: number; routes: number; schedules: number; seats_total: number;
  bookings_paid: number; bookings_pending: number; bookings_cancelled: number;
  seats_sold: number; revenue: number; commission: number; vendor_net: number; fill_rate: number;
  top_routes: { origin: string; destination: string; sales: number }[];
};
export async function fetchPartnerStats(): Promise<PartnerStats | null> {
  const data = await getJson<{ stats: PartnerStats | null }>("/travel/partner/stats");
  return data.stats;
}
export type PartnerBooking = {
  reference: string; travel_date: string; seats_count: number; total: number; commission: number;
  currency: string; status: string; payment_status: string; channel: string; created_at: string;
  origin?: string; destination?: string; passenger?: string; phone?: string;
  ticket_number?: string; verification_code?: string; ticket_status?: string;
};
export async function fetchPartnerBookings(params: { status?: string; q?: string } = {}): Promise<PartnerBooking[]> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  const data = await getJson<{ bookings: PartnerBooking[] }>(`/travel/partner/bookings?${sp.toString()}`);
  return data.bookings || [];
}
export async function fetchPartnerPayments(): Promise<{ reference: string; total: number; commission: number; vendor_net: number; currency: string; payment_method: string; paid_at: string; origin?: string; destination?: string }[]> {
  const data = await getJson<{ payments: { reference: string; total: number }[] }>("/travel/partner/payments");
  return (data.payments as never) || [];
}
export async function fetchConnectors(): Promise<{ code: string; label: string; enabled: boolean; is_real_money: boolean }[]> {
  const data = await getJson<{ connectors: { code: string; label: string; enabled: boolean; is_real_money: boolean }[] }>("/travel/partner/connectors");
  return data.connectors || [];
}
export async function scanTicket(code: string): Promise<{ valid: boolean; result: string; origin?: string; destination?: string; company?: string; travel_date?: string; boarded?: boolean }> {
  return postJson("/travel/partner/scan", { code });
}
export async function posSell(body: Record<string, unknown>): Promise<{ booking: TravelBooking; ticket: TravelTicket }> {
  return postJson<{ booking: TravelBooking; ticket: TravelTicket }>("/travel/partner/pos/sell", body);
}
