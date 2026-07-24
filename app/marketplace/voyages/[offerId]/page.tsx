"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Users, Briefcase, Phone, MapPin, Star, ArrowRight, Loader2, Ban } from "lucide-react";
import { formatFCFA } from "../../../lib/format";
import { fetchOfferDetail, formatDuration, shortTime, MODE_EMOJI, type OfferDetail } from "../../../travel/lib/travelApi";

export default function OfferDetailPage() {
  const params = useParams();
  const offerId = String(params.offerId || "");
  const [data, setData] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!offerId) return;
    fetchOfferDetail(offerId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Offre introuvable."))
      .finally(() => setLoading(false));
  }, [offerId]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[var(--ml-soft)] dark:bg-[#0a0f22]"><Loader2 className="h-8 w-8 animate-spin text-[var(--ml-blue)] dark:text-yellow-400" /></div>;
  if (error || !data) return (
    <div className="min-h-screen bg-[var(--ml-soft)] px-4 pt-10 dark:bg-[#0a0f22]">
      <div className="mx-auto max-w-2xl text-center">
        <Ban className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-3 text-xl font-black text-[var(--ml-blue)] dark:text-white">Offre indisponible</h1>
        <p className="mt-1 text-sm text-[var(--ml-text-soft)] dark:text-white/60">{error || "Cette offre n'est plus disponible."}</p>
        <Link href="/marketplace/voyages" className="mt-4 inline-block rounded-xl bg-[var(--ml-blue)] px-5 py-2.5 text-sm font-bold text-white">Retour aux voyages</Link>
      </div>
    </div>
  );

  const { offer, route, departures } = data;
  const nextDep = departures[0];
  const seatsLeft = nextDep ? Math.max(0, Number(nextDep.seats_available)) : offer.availability || 0;
  const hasCoords = route.origin_lat != null && route.dest_lat != null;
  const bbox = hasCoords
    ? `${Math.min(route.origin_lng!, route.dest_lng!) - 0.5},${Math.min(route.origin_lat!, route.dest_lat!) - 0.5},${Math.max(route.origin_lng!, route.dest_lng!) + 0.5},${Math.max(route.origin_lat!, route.dest_lat!) + 0.5}`
    : "";

  return (
    <div className="min-h-screen bg-[var(--ml-soft)] px-4 pb-16 pt-6 dark:bg-[#0a0f22] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/marketplace/voyages" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ml-blue)] transition hover:underline dark:text-white/80">
          <ArrowLeft className="h-4 w-4" /> Retour aux voyages
        </Link>

        {/* En-tête offre */}
        <div className="rounded-2xl bg-gradient-to-br from-[var(--ml-blue)] to-[var(--ml-blue-2)] p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">{MODE_EMOJI[offer.subcategory] || "🧳"}</span>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#fff" }}>{route.origin} → {route.destination}</h1>
              <p className="text-sm text-white/75">{route.company_name}{route.origin_country && route.dest_country ? ` · ${route.origin_country} → ${route.dest_country}` : ""}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {Number(route.rating).toFixed(1)} ({route.rating_count})</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {formatDuration(route.duration_minutes)}</span>
            {route.distance_km ? <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {route.distance_km} km</span> : null}
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {seatsLeft} places restantes</span>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {/* Départs */}
            <section className="rounded-2xl border border-[var(--ml-border)] bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="mb-3 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Départs & horaires</h2>
              {departures.length === 0 ? (
                <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Aucun départ programmé pour le moment.</p>
              ) : (
                <ul className="space-y-2">
                  {departures.map((d) => (
                    <li key={d.schedule_id} className="flex items-center justify-between rounded-xl bg-[var(--ml-soft)] px-4 py-2.5 dark:bg-white/5">
                      <span className="flex items-center gap-3 text-sm text-[var(--ml-text)] dark:text-white/80">
                        <span className="font-bold tabular-nums">{shortTime(d.departure_time)}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--ml-text-soft)]" />
                        <span className="font-bold tabular-nums">{shortTime(d.arrival_time)}</span>
                        <span className="text-xs text-[var(--ml-text-soft)]">· {Math.max(0, Number(d.seats_available))} places</span>
                      </span>
                      {d.base_price != null && <span className="font-black text-[var(--ml-gold-deep)] dark:text-yellow-400">{formatFCFA(d.base_price)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Carte du trajet (OpenStreetMap, sans clé) */}
            <section className="rounded-2xl border border-[var(--ml-border)] bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="mb-3 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Carte du trajet</h2>
              {hasCoords ? (
                <>
                  <iframe
                    title="Carte du trajet"
                    className="h-64 w-full rounded-xl border border-[var(--ml-border)] dark:border-white/10"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${route.origin_lat},${route.origin_lng}`}
                    loading="lazy"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-[var(--ml-text-soft)] dark:text-white/50">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {route.origin} → {route.destination}</span>
                    <a href={`https://www.openstreetmap.org/directions?from=${route.origin_lat},${route.origin_lng}&to=${route.dest_lat},${route.dest_lng}`} target="_blank" rel="noreferrer" className="font-semibold text-[var(--ml-blue)] underline dark:text-yellow-400">Itinéraire complet</a>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Coordonnées géographiques non disponibles pour ce trajet.</p>
              )}
            </section>

            {/* Conditions */}
            <section className="rounded-2xl border border-[var(--ml-border)] bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="mb-3 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Informations & conditions</h2>
              <ul className="space-y-2 text-sm text-[var(--ml-text-soft)] dark:text-white/70">
                <li className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Bagages : {route.baggage_policy || "Selon la compagnie"}</li>
                <li className="flex items-center gap-2"><Ban className="h-4 w-4" /> Annulation : {route.cancellation_policy || "Selon les conditions de la compagnie"}</li>
                {route.company_phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> Contact : {route.company_phone}</li>}
                {route.services.length > 0 && <li className="flex flex-wrap gap-1.5 pt-1">{route.services.map((s) => <span key={s} className="rounded-md bg-[var(--ml-soft)] px-2 py-0.5 text-[11px] font-medium dark:bg-white/10">{s}</span>)}</li>}
              </ul>
            </section>
          </div>

          {/* Résumé + CTA */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-[var(--ml-border)] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-wide text-[var(--ml-text-soft)] dark:text-white/50">Prix par voyageur</p>
              <p className="text-2xl font-black text-[var(--ml-gold-deep)] dark:text-yellow-400">{offer.price != null ? formatFCFA(offer.price) : "—"}</p>
              <Link
                href={`/marketplace/voyages/${offerId}/checkout`}
                aria-disabled={seatsLeft === 0}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition ${seatsLeft === 0 ? "pointer-events-none bg-[var(--ml-border)] text-[var(--ml-text-soft)]" : "bg-[var(--ml-gold)] text-[var(--ml-blue)] hover:bg-[var(--ml-gold-light)]"}`}
              >
                {seatsLeft === 0 ? "Complet" : "Continuer la réservation"} <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-center text-[11px] text-[var(--ml-text-soft)] dark:text-white/50">Paiement sécurisé via le Wallet MaliLink.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
