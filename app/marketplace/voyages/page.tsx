"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, MapPin, Users, Loader2, PackageSearch } from "lucide-react";
import { formatFCFA } from "../../lib/format";
import {
  fetchCatalog, fetchCatalogCategories, MODE_EMOJI,
  type CatalogOffer, type CatalogCategory,
} from "../../travel/lib/travelApi";

/**
 * Marketplace › Voyages et réservations.
 * Affiche UNIQUEMENT les offres réellement publiées par les partenaires
 * (catalogue central). Jamais de données fictives : si une sous-catégorie est
 * vide → « Aucun service disponible actuellement dans cette catégorie. »
 */
export default function MarketplaceVoyagesPage() {
  const [voyageCat, setVoyageCat] = useState<CatalogCategory | null>(null);
  const [subcategory, setSubcategory] = useState<string>("");
  const [q, setQ] = useState("");
  const [offers, setOffers] = useState<CatalogOffer[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalogCategories()
      .then((cats) => setVoyageCat(cats.find((c) => c.code === "voyage") || null))
      .catch(() => setVoyageCat(null));
  }, []);

  const load = useMemo(
    () => () => {
      setLoading(true);
      fetchCatalog({ category: "voyage", subcategory: subcategory || undefined, q: q || undefined })
        .then((r) => { setOffers(r.offers); setCounts(r.counts || {}); })
        .catch(() => { setOffers([]); setCounts({}); })
        .finally(() => setLoading(false));
    },
    [subcategory, q]
  );

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div className="min-h-screen bg-[var(--ml-soft)] px-4 pb-16 pt-8 dark:bg-[#0a0f22] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/marketplace" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ml-blue)] transition hover:underline dark:text-white/80">
          <ArrowLeft className="h-4 w-4" /> Retour à Marketplace
        </Link>

        {/* En-tête */}
        <div className="rounded-2xl bg-gradient-to-br from-[var(--ml-blue)] to-[var(--ml-blue-2)] p-6 text-white">
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: "#ffffff" }}>🧳 Voyages et réservations</h1>
          <p className="mt-1 text-sm text-white/75">Comparez et réservez les offres des compagnies partenaires MaliLink.</p>
          <div className="mt-4 flex max-w-md items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
            <Search className="h-4 w-4 text-white/70" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une destination, une compagnie…"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/50"
              aria-label="Rechercher dans les voyages"
            />
          </div>
        </div>

        {/* Sous-catégories */}
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Sous-catégories de voyage">
          <SubTab active={subcategory === ""} onClick={() => setSubcategory("")} emoji="🧳" label="Tout" />
          {voyageCat?.children.map((c) => (
            <SubTab
              key={c.code}
              active={subcategory === c.code}
              onClick={() => setSubcategory(c.code)}
              emoji={c.emoji || MODE_EMOJI[c.code] || "✈️"}
              label={c.label}
              count={counts[c.code]}
            />
          ))}
        </div>

        {/* Offres */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[var(--ml-text-soft)] dark:text-white/60">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--ml-border)] bg-white/60 px-6 py-16 text-center dark:border-white/10 dark:bg-white/5">
              <PackageSearch className="mb-3 h-9 w-9 text-[var(--ml-text-soft)] dark:text-white/40" />
              <h3 className="text-lg font-bold text-[var(--ml-blue)] dark:text-white">Aucun service disponible actuellement dans cette catégorie.</h3>
              <p className="mt-1 max-w-md text-sm text-[var(--ml-text-soft)] dark:text-white/60">
                Les offres publiées par les compagnies partenaires apparaîtront ici automatiquement.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((o) => (
                <article key={o.id} className="flex flex-col rounded-2xl border border-[var(--ml-border)] bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{MODE_EMOJI[o.subcategory] || "🧳"}</span>
                    <span className="rounded-md bg-[var(--ml-soft)] px-2 py-0.5 text-[11px] font-semibold uppercase text-[var(--ml-text-soft)] dark:bg-white/10 dark:text-white/60">{o.subcategory}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-[var(--ml-blue)] dark:text-white">{o.title}</h3>
                  <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">{o.company_name}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ml-text-soft)] dark:text-white/50">
                    {o.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {o.location}</span>}
                    {o.availability != null && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" /> {o.availability} places</span>}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--ml-border)] pt-3 dark:border-white/10">
                    <div>
                      {o.price != null && <><span className="text-[11px] text-[var(--ml-text-soft)] dark:text-white/50">dès </span><span className="text-lg font-black text-[var(--ml-gold-deep)] dark:text-yellow-400">{formatFCFA(o.price)}</span></>}
                    </div>
                    <Link href={`/marketplace/voyages/${o.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--ml-blue)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--ml-blue-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-gold)]">
                      Réserver
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubTab({ active, onClick, emoji, label, count }: { active: boolean; onClick: () => void; emoji: string; label: string; count?: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
        active ? "bg-[var(--ml-blue)] text-white" : "bg-white text-[var(--ml-text)] hover:bg-[var(--ml-blue)]/10 dark:bg-white/5 dark:text-white/80"
      }`}
    >
      <span aria-hidden="true">{emoji}</span>
      {label}
      {count ? <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20" : "bg-[var(--ml-gold)]/20 text-[var(--ml-gold-deep)] dark:text-yellow-300"}`}>{count}</span> : null}
    </button>
  );
}
