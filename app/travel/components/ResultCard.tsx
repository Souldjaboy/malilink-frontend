"use client";

import { ArrowRight, Briefcase, Clock, Star, Users } from "lucide-react";
import { formatFCFA } from "../../lib/format";
import { formatDuration, shortTime, MODE_EMOJI, type TravelOffer } from "../lib/travelApi";

export type Highlight = "cheapest" | "fastest" | "best" | null;

const BADGE: Record<Exclude<Highlight, null>, { label: string; className: string }> = {
  cheapest: { label: "⭐ Le moins cher", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  fastest: { label: "⚡ Le plus rapide", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  best: { label: "🏆 Meilleur choix", className: "bg-[var(--ml-gold)]/15 text-[var(--ml-gold-deep)] dark:bg-yellow-400/15 dark:text-yellow-300" },
};

function CompanyLogo({ name, url }: { name: string; url?: string }) {
  if (url) {
    return <img src={url} alt={name} className="h-12 w-12 rounded-xl bg-white object-cover" />;
  }
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--ml-blue)] text-sm font-black text-yellow-400">
      {initials}
    </div>
  );
}

export default function ResultCard({
  offer,
  highlight,
  onReserve,
}: {
  offer: TravelOffer;
  highlight: Highlight;
  onReserve: (offer: TravelOffer) => void;
}) {
  const hasPromo = offer.discount > 0;
  return (
    <article
      className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-lg dark:bg-white/5 ${
        highlight
          ? "border-[var(--ml-gold)] ring-1 ring-[var(--ml-gold)]/40 dark:border-yellow-400/40"
          : "border-[var(--ml-border)] dark:border-white/10"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <CompanyLogo name={offer.company.name} url={offer.company.logo_url || undefined} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-bold text-[var(--ml-blue)] dark:text-white">{offer.company.name}</h3>
              <span className="text-lg" aria-hidden="true">{MODE_EMOJI[offer.mode_code] || "✈️"}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ml-text-soft)] dark:text-white/60">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-[var(--ml-gold)] text-[var(--ml-gold)]" aria-hidden="true" />
                {Number(offer.company.rating).toFixed(1)}
                <span className="text-[var(--ml-text-soft)]/70">({offer.company.rating_count})</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {offer.seats_total} places
              </span>
              {offer.baggage_included_kg ? (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                  {offer.baggage_included_kg} kg
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {highlight && (
          <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${BADGE[highlight].className}`}>
            {BADGE[highlight].label}
          </span>
        )}

        <div className="flex flex-1 items-center justify-between gap-4 sm:justify-end">
          <div className="text-center">
            <div className="text-lg font-black tabular-nums text-[var(--ml-blue)] dark:text-white">{shortTime(offer.departure_time)}</div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--ml-text-soft)] dark:text-white/50">{offer.origin_city}</div>
          </div>
          <div className="flex flex-col items-center text-[var(--ml-text-soft)] dark:text-white/40">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDuration(offer.duration_minutes)}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-[10px] uppercase">Direct</span>
          </div>
          <div className="text-center">
            <div className="text-lg font-black tabular-nums text-[var(--ml-blue)] dark:text-white">{shortTime(offer.arrival_time)}</div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--ml-text-soft)] dark:text-white/50">{offer.destination_city}</div>
          </div>
        </div>
      </div>

      {offer.services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {offer.services.map((s) => (
            <span key={s} className="rounded-md bg-[var(--ml-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ml-text-soft)] dark:bg-white/5 dark:text-white/60">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-[var(--ml-border)] pt-4 dark:border-white/10">
        <div>
          {hasPromo && (
            <span className="mr-2 text-sm text-[var(--ml-text-soft)] line-through dark:text-white/40">{formatFCFA(offer.subtotal)}</span>
          )}
          <span className="text-xl font-black text-[var(--ml-gold-deep)] dark:text-yellow-400">{formatFCFA(offer.total)}</span>
          {offer.promo && (
            <span className="ml-2 rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-300">
              -{offer.promo.type === "percent" ? `${offer.promo.value}%` : formatFCFA(offer.promo.value)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onReserve(offer)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-blue)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--ml-blue-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-gold)]"
        >
          Réserver
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
