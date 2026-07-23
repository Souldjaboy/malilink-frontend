"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Ticket, Sparkles, ArrowLeftRight, Plane, Building2, Globe } from "lucide-react";
import {
  searchOffers,
  CATEGORIES,
  type GeoPlace,
  type TravelOffer,
  type TravelSearchResult,
} from "./lib/travelApi";
import GeoInput from "./components/GeoInput";
import ResultCard, { type Highlight } from "./components/ResultCard";
import BookingDrawer from "./components/BookingDrawer";
import { SkeletonList, EmptyState, ErrorState } from "./components/States";

const CLASSES = ["Économie", "Business", "Première"] as const;

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function TravelPage() {
  const [category, setCategory] = useState<string>("plane");
  const [categoryUnavailable, setCategoryUnavailable] = useState(false);

  const [origin, setOrigin] = useState<GeoPlace | null>(null);
  const [destination, setDestination] = useState<GeoPlace | null>(null);
  const [dateAller, setDateAller] = useState<string>(tomorrowISO());
  const [dateRetour, setDateRetour] = useState<string>("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [travelClass, setTravelClass] = useState<(typeof CLASSES)[number]>("Économie");

  const [result, setResult] = useState<TravelSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // Filtres (appliqués côté client sur les résultats).
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [companyFilter, setCompanyFilter] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"prix" | "duree" | "note">("prix");

  const [drawerOffer, setDrawerOffer] = useState<TravelOffer | null>(null);

  const selectedCategory = CATEGORIES.find((c) => c.code === category) || CATEGORIES[0];

  const runSearch = async () => {
    setFormError("");
    setCategoryUnavailable(false);
    setResult(null);
    setError("");

    // Catégories hors modèle de trajet (hôtel, location) : pas encore de
    // partenaires. On l'annonce clairement, sans jamais inventer de données.
    if (!selectedCategory.searchable) {
      setCategoryUnavailable(true);
      return;
    }
    if (!origin?.id || !destination?.id) {
      setFormError("Choisissez un lieu de départ et une destination dans la liste.");
      return;
    }
    if (origin.id === destination.id) {
      setFormError("Le départ et la destination doivent être différents.");
      return;
    }
    setLoading(true);
    try {
      const data = await searchOffers({
        originLocationId: origin.id,
        destinationLocationId: destination.id,
        date: dateAller,
        adults,
        children,
        mode: selectedCategory.mode,
      });
      setResult(data);
      setMaxPrice(null);
      setCompanyFilter(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la recherche.");
    } finally {
      setLoading(false);
    }
  };

  const swapCities = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const companies = useMemo(() => {
    if (!result) return [];
    const map = new Map<number, string>();
    result.offers.forEach((o) => map.set(o.company.id, o.company.name));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [result]);

  const priceBounds = useMemo(() => {
    if (!result || result.offers.length === 0) return { min: 0, max: 0 };
    const totals = result.offers.map((o) => o.total);
    return { min: Math.min(...totals), max: Math.max(...totals) };
  }, [result]);

  const visibleOffers = useMemo(() => {
    if (!result) return [];
    let list = [...result.offers];
    if (maxPrice != null) list = list.filter((o) => o.total <= maxPrice);
    if (companyFilter.size > 0) list = list.filter((o) => companyFilter.has(o.company.id));
    list.sort((a, b) => {
      if (sortBy === "prix") return a.total - b.total;
      if (sortBy === "duree") return (a.duration_minutes || 1e9) - (b.duration_minutes || 1e9);
      return Number(b.company.rating) - Number(a.company.rating);
    });
    return list;
  }, [result, maxPrice, companyFilter, sortBy]);

  const highlightOf = (offerId: string): Highlight => {
    if (!result) return null;
    const c = result.comparator;
    if (c.best_rated === offerId) return "best";
    if (c.cheapest === offerId) return "cheapest";
    if (c.fastest === offerId) return "fastest";
    return null;
  };

  const toggleCompany = (id: number) => {
    setCompanyFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasSearched = loading || !!result || !!error || categoryUnavailable;

  return (
    <div className="min-h-screen bg-[var(--ml-soft)] pb-16 dark:bg-[#0a0f22]">
      {/* HERO premium — plateforme mondiale */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0a1330] via-[var(--ml-blue-2)] to-[#0a1330] px-4 pb-32 pt-10 text-white sm:px-6 lg:px-8">
        {/* Décor animé (respecte prefers-reduced-motion) */}
        <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
          <Globe className="ml-hero-spin absolute -right-16 -top-16 h-96 w-96 text-white/[0.04]" strokeWidth={0.6} />
          <span className="ml-hero-float absolute right-8 top-16 text-7xl opacity-20 sm:right-24">✈️</span>
          <span className="ml-hero-float2 absolute left-4 top-40 text-5xl opacity-10">🏨</span>
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--ml-soft)]/0 to-transparent dark:from-[#0a0f22]/0" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-yellow-300 ring-1 ring-yellow-400/20">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Plateforme mondiale de voyage
            </span>
            <div className="flex gap-2">
              <Link
                href="/travel/partenaire"
                className="inline-flex items-center gap-2 rounded-full bg-yellow-400/90 px-3 py-1.5 text-xs font-bold text-[var(--ml-blue-deep)] transition hover:bg-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Espace partenaire
              </Link>
              <Link
                href="/travel/mes-voyages"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              >
                <Ticket className="h-3.5 w-3.5" aria-hidden="true" /> Mes voyages
              </Link>
            </div>
          </div>

          <h1
            className="mt-8 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: "#ffffff", textShadow: "0 2px 24px rgba(0,0,0,0.45)" }}
          >
            Voyagez partout dans le monde
            <br />
            avec <span style={{ color: "var(--ml-gold-light)" }}>MaliLink</span>
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-semibold sm:text-xl" style={{ color: "#ffffff" }}>
            <span>Comparez.</span><span className="text-yellow-300">Réservez.</span>
            <span>Payez.</span><span className="text-yellow-300">Voyagez.</span>
          </p>
          <p className="mt-2 text-base text-white/80">
            Tout avec un seul compte. Un seul Wallet.
          </p>
        </div>
      </header>

      {/* MOTEUR DE RECHERCHE (chevauche le hero) */}
      <div className="relative z-20 mx-auto -mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[var(--ml-border)] bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#101a36] sm:p-6">
          {/* Onglets catégories — toutes disponibles, sans « Bientôt » */}
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Catégorie de voyage">
            {CATEGORIES.map((c) => (
              <button
                key={c.code}
                type="button"
                role="tab"
                aria-selected={category === c.code}
                onClick={() => {
                  setCategory(c.code);
                  setCategoryUnavailable(false);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  category === c.code
                    ? "bg-[var(--ml-blue)] text-white shadow"
                    : "bg-[var(--ml-soft)] text-[var(--ml-text)] hover:bg-[var(--ml-blue)]/10 dark:bg-white/5 dark:text-white/80"
                }`}
              >
                <span aria-hidden="true">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>

          {/* Formulaire */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <GeoInput id="origin" label="Départ" placeholder="Ville de départ (partout dans le monde)" value={origin} onSelect={setOrigin} />
            </div>
            <div className="flex items-end justify-center lg:col-span-1">
              <button
                type="button"
                onClick={swapCities}
                aria-label="Inverser départ et destination"
                className="mb-1 grid h-10 w-10 place-items-center rounded-xl border border-[var(--ml-border)] bg-white text-[var(--ml-blue)] transition hover:bg-[var(--ml-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-gold)] dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>
            <div className="lg:col-span-4">
              <GeoInput id="destination" label="Destination" placeholder="Ville d'arrivée" value={destination} onSelect={setDestination} />
            </div>
            <div className="lg:col-span-3">
              <label htmlFor="date-aller" className="mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">Date aller</label>
              <input
                id="date-aller"
                type="date"
                value={dateAller}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDateAller(e.target.value)}
                className="w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] focus:ring-2 focus:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="date-retour" className="mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">Date retour (optionnel)</label>
              <input
                id="date-retour"
                type="date"
                value={dateRetour}
                min={dateAller}
                onChange={(e) => setDateRetour(e.target.value)}
                className="w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] focus:ring-2 focus:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="adults" className="mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">Adultes</label>
              <input id="adults" type="number" min={1} max={9} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] focus:ring-2 focus:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5 dark:text-white" />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="children" className="mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">Enfants</label>
              <input id="children" type="number" min={0} max={9} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] focus:ring-2 focus:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5 dark:text-white" />
            </div>
            {category === "plane" && (
              <div className="lg:col-span-2">
                <label htmlFor="classe" className="mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">Classe</label>
                <select id="classe" value={travelClass} onChange={(e) => setTravelClass(e.target.value as (typeof CLASSES)[number])}
                  className="w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] focus:ring-2 focus:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5 dark:text-white">
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-end lg:col-span-2">
              <button
                type="button"
                onClick={runSearch}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ml-gold)] px-5 py-2.5 text-sm font-black text-[var(--ml-blue)] shadow transition hover:bg-[var(--ml-gold-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-blue)]"
              >
                <Search className="h-4 w-4" aria-hidden="true" /> Rechercher
              </button>
            </div>
          </div>
          {formError && <p className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">{formError}</p>}
        </div>
      </div>

      {/* RÉSULTATS */}
      <main className="mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        {!hasSearched && (
          <EmptyState
            icon={<Plane className="h-7 w-7" />}
            title="Où souhaitez-vous aller ?"
            message="Choisissez votre départ, votre destination et la date, puis lancez la recherche pour comparer les offres des compagnies partenaires."
          />
        )}

        {categoryUnavailable && (
          <EmptyState
            icon={<span className="text-2xl" aria-hidden="true">{selectedCategory.emoji}</span>}
            title="Aucun partenaire disponible actuellement."
            message={`La catégorie « ${selectedCategory.label} » ouvre progressivement : dès qu'un partenaire rejoint MaliLink Voyage dans cette catégorie, ses offres apparaîtront ici.`}
          >
            <Link
              href="/travel/partenaire"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-blue)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--ml-blue-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-gold)]"
            >
              <Building2 className="h-4 w-4" /> Devenir partenaire
            </Link>
          </EmptyState>
        )}

        {loading && (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="hidden lg:block" />
            <SkeletonList count={4} />
          </div>
        )}

        {!loading && error && <ErrorState message={error} onRetry={runSearch} />}

        {!loading && !error && result && (
          <>
            {/* Bandeau comparateur */}
            {result.count > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--ml-border)] bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <span className="text-sm font-bold text-[var(--ml-blue)] dark:text-white">{result.count} offre{result.count > 1 ? "s" : ""}</span>
                <span className="text-[var(--ml-text-soft)]">·</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">⭐ Le moins cher</span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">⚡ Le plus rapide</span>
                <span className="rounded-full bg-[var(--ml-gold)]/15 px-2.5 py-1 text-xs font-bold text-[var(--ml-gold-deep)] dark:bg-yellow-400/15 dark:text-yellow-300">🏆 Meilleur choix</span>
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--ml-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ml-blue)] transition hover:bg-[var(--ml-soft)] dark:border-white/10 dark:text-white lg:hidden"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Filtres
                </button>
              </div>
            )}

            {result.count === 0 ? (
              <EmptyState
                title="Aucun partenaire disponible actuellement."
                message="Aucune compagnie ne dessert encore ce trajet à cette date. Essayez une autre ville, une autre date, ou une autre catégorie."
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                {/* Filtres */}
                <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
                  <div className="space-y-5 rounded-2xl border border-[var(--ml-border)] bg-white p-5 dark:border-white/10 dark:bg-white/5">
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--ml-blue)] dark:text-white">
                        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filtres
                      </h3>
                    </div>
                    <div>
                      <label htmlFor="sort" className="mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">Trier par</label>
                      <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="w-full rounded-lg border border-[var(--ml-border)] bg-white px-3 py-2 text-sm text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] dark:border-white/10 dark:bg-white/5 dark:text-white">
                        <option value="prix">Prix croissant</option>
                        <option value="duree">Durée</option>
                        <option value="note">Note</option>
                      </select>
                    </div>
                    {priceBounds.max > priceBounds.min && (
                      <div>
                        <label htmlFor="price" className="mb-1 flex items-center justify-between text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">
                          <span>Prix max</span>
                          <span className="tabular-nums text-[var(--ml-blue)] dark:text-white">{(maxPrice ?? priceBounds.max).toLocaleString("fr-FR")} F</span>
                        </label>
                        <input id="price" type="range" min={priceBounds.min} max={priceBounds.max} step={500}
                          value={maxPrice ?? priceBounds.max} onChange={(e) => setMaxPrice(Number(e.target.value))}
                          className="w-full accent-[var(--ml-gold)]" />
                      </div>
                    )}
                    {companies.length > 1 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60">Compagnies</p>
                        <ul className="space-y-1.5">
                          {companies.map((c) => (
                            <li key={c.id}>
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ml-text)] dark:text-white/80">
                                <input type="checkbox" checked={companyFilter.has(c.id)} onChange={() => toggleCompany(c.id)} className="accent-[var(--ml-blue)]" />
                                {c.name}
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </aside>

                {/* Liste résultats */}
                <section className="space-y-4">
                  {visibleOffers.length === 0 ? (
                    <EmptyState title="Aucune offre ne correspond aux filtres" message="Élargissez la fourchette de prix ou réinitialisez les compagnies sélectionnées." />
                  ) : (
                    visibleOffers.map((offer) => (
                      <ResultCard key={offer.offer_id} offer={offer} highlight={highlightOf(offer.offer_id)} onReserve={setDrawerOffer} />
                    ))
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </main>

      <BookingDrawer offer={drawerOffer} adults={adults} childrenCount={children} travelDate={dateAller} onClose={() => setDrawerOffer(null)} />
    </div>
  );
}
