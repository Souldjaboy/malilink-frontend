"use client";

import { useEffect } from "react";
import { Wallet, Smartphone, CreditCard, X, Clock, Briefcase, Info, ShieldCheck } from "lucide-react";
import { formatFCFA } from "../../lib/format";
import { formatDuration, shortTime, MODE_EMOJI, type TravelOffer } from "../lib/travelApi";

/**
 * Tiroir de détails + paiement d'une offre.
 * Le paiement passe UNIQUEMENT par le Wallet MaliLink. La réservation et le
 * règlement effectifs arrivent au Lot 4B : ici les actions sont présentées
 * mais désactivées, sans jamais simuler un paiement.
 */
export default function BookingDrawer({
  offer,
  passengers,
  onClose,
}: {
  offer: TravelOffer | null;
  passengers: number;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (offer) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [offer, onClose]);

  if (!offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Détails et réservation">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl dark:bg-[#0d1730]">
        {/* En-tête visuel */}
        <div className="relative bg-gradient-to-br from-[var(--ml-blue)] to-[var(--ml-blue-2)] px-6 pb-6 pt-5 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="text-4xl" aria-hidden="true">{MODE_EMOJI[offer.mode_code] || "✈️"}</span>
          <h2 className="mt-2 text-xl font-black">{offer.company.name}</h2>
          <p className="text-sm text-white/70">
            {offer.origin_city} → {offer.destination_city}
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div>
              <div className="text-lg font-black tabular-nums">{shortTime(offer.departure_time)}</div>
              <div className="text-[11px] text-white/60">Départ</div>
            </div>
            <div className="flex flex-col items-center text-white/60">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span className="text-[11px]">{formatDuration(offer.duration_minutes)}</span>
            </div>
            <div>
              <div className="text-lg font-black tabular-nums">{shortTime(offer.arrival_time)}</div>
              <div className="text-[11px] text-white/60">Arrivée</div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 px-6 py-5">
          {/* Détails */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Détails du voyage</h3>
            <ul className="space-y-1.5 text-sm text-[var(--ml-text-soft)] dark:text-white/70">
              <li className="flex items-center gap-2"><Briefcase className="h-4 w-4" aria-hidden="true" /> Bagages inclus : {offer.baggage_included_kg || 0} kg</li>
              <li className="flex items-center gap-2"><Info className="h-4 w-4" aria-hidden="true" /> Classe : {offer.seat_class}</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Voyageurs : {passengers}</li>
            </ul>
            {offer.services.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {offer.services.map((s) => (
                  <span key={s} className="rounded-md bg-[var(--ml-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ml-text-soft)] dark:bg-white/10 dark:text-white/70">{s}</span>
                ))}
              </div>
            )}
          </section>

          {/* Récapitulatif prix */}
          <section className="rounded-xl border border-[var(--ml-border)] bg-[var(--ml-soft)] p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between text-sm text-[var(--ml-text-soft)] dark:text-white/60">
              <span>Sous-total ({passengers} voyageur{passengers > 1 ? "s" : ""})</span>
              <span className="tabular-nums">{formatFCFA(offer.subtotal)}</span>
            </div>
            {offer.discount > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400">
                <span>Réduction</span>
                <span className="tabular-nums">- {formatFCFA(offer.discount)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-[var(--ml-border)] pt-2 dark:border-white/10">
              <span className="font-bold text-[var(--ml-blue)] dark:text-white">Total</span>
              <span className="text-lg font-black text-[var(--ml-gold-deep)] dark:text-yellow-400">{formatFCFA(offer.total)}</span>
            </div>
          </section>

          {/* Paiement — Wallet uniquement */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Paiement</h3>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl border-2 border-[var(--ml-blue)] bg-[var(--ml-blue)]/5 px-4 py-3 text-left dark:border-yellow-400/40 dark:bg-white/5"
            >
              <Wallet className="h-5 w-5 text-[var(--ml-blue)] dark:text-yellow-400" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-sm font-bold text-[var(--ml-blue)] dark:text-white">Wallet MaliLink</span>
                <span className="block text-xs text-[var(--ml-text-soft)] dark:text-white/50">Moteur financier unique</span>
              </span>
              <span className="rounded-full bg-[var(--ml-blue)] px-2 py-0.5 text-[10px] font-bold text-white">Recommandé</span>
            </button>

            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ml-text-soft)] dark:text-white/40">Bientôt disponibles</p>
            <div className="mt-1 space-y-2 opacity-60">
              {[
                { icon: Smartphone, label: "Orange Money" },
                { icon: Smartphone, label: "Wave" },
                { icon: CreditCard, label: "Carte bancaire" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-[var(--ml-border)] px-4 py-2.5 dark:border-white/10">
                  <Icon className="h-4 w-4 text-[var(--ml-text-soft)] dark:text-white/50" aria-hidden="true" />
                  <span className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Pied — action */}
        <div className="border-t border-[var(--ml-border)] bg-white p-4 dark:border-white/10 dark:bg-[#0d1730]">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="La réservation et le paiement ouvrent très bientôt (Lot 4B)"
            className="w-full cursor-not-allowed rounded-xl bg-[var(--ml-blue)]/50 px-5 py-3 text-sm font-bold text-white"
          >
            Payer {formatFCFA(offer.total)} avec le Wallet
          </button>
          <p className="mt-2 text-center text-[11px] text-[var(--ml-text-soft)] dark:text-white/50">
            Réservation & paiement Wallet disponibles très prochainement.
          </p>
        </div>
      </div>
    </div>
  );
}
