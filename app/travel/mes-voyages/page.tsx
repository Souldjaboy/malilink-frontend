"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ticket, Search, Loader2, QrCode, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { formatFCFA } from "../../lib/format";
import { fetchMyTrips, type TravelBooking } from "../lib/travelApi";
import { EmptyState } from "../components/States";

type Trip = TravelBooking & { ticket_number?: string; verification_code?: string; qr_payload?: string; ticket_status?: string };

const TABS = [
  { key: "avenir", label: "À venir" },
  { key: "passes", label: "Passés" },
  { key: "annules", label: "Annulés" },
] as const;

const BADGE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export default function MesVoyagesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("avenir");
  const [query, setQuery] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<Trip | null>(null);

  useEffect(() => { fetchMyTrips().then(setTrips).catch(() => setTrips([])).finally(() => setLoading(false)); }, []);

  const filtered = useMemo(() => {
    const today = new Date(new Date().toDateString());
    return trips.filter((t) => {
      if (query && !`${t.reference} ${t.origin} ${t.destination} ${t.company_name}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (tab === "annules") return t.status === "cancelled";
      if (tab === "passes") return t.status !== "cancelled" && t.travel_date && new Date(t.travel_date) < today;
      return t.status !== "cancelled" && (!t.travel_date || new Date(t.travel_date) >= today);
    });
  }, [trips, tab, query]);

  return (
    <div className="min-h-screen bg-[var(--ml-soft)] px-4 pb-16 pt-8 dark:bg-[#0a0f22] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/travel" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ml-blue)] transition hover:underline dark:text-white/80">
          <ArrowLeft className="h-4 w-4" /> Retour à MaliLink Voyage
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ml-blue)] text-yellow-400"><Ticket className="h-6 w-6" aria-hidden="true" /></span>
          <div>
            <h1 className="text-2xl font-black text-[var(--ml-blue)] dark:text-white">Mes voyages</h1>
            <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Historique, billets et réservations.</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
          <Search className="h-4 w-4 text-[var(--ml-text-soft)] dark:text-white/40" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une réservation…" className="w-full bg-transparent text-sm text-[var(--ml-text)] outline-none placeholder:text-[var(--ml-text-soft)]/60 dark:text-white" />
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filtre des voyages">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === t.key ? "bg-[var(--ml-blue)] text-white" : "bg-white text-[var(--ml-text)] hover:bg-[var(--ml-blue)]/10 dark:bg-white/5 dark:text-white/80"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-[var(--ml-text-soft)]"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Ticket className="h-7 w-7" />} title="Aucun voyage ici" message="Vos réservations et billets électroniques apparaîtront ici.">
            <Link href="/travel" className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-gold)] px-5 py-2.5 text-sm font-black text-[var(--ml-blue)] transition hover:bg-[var(--ml-gold-light)]">
              <Search className="h-4 w-4" /> Rechercher un voyage
            </Link>
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div key={t.reference} className="rounded-2xl border border-[var(--ml-border)] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--ml-blue)] dark:text-white">{t.origin} → {t.destination}</p>
                    <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">{t.company_name} · {t.travel_date}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--ml-text-soft)] dark:text-white/40">{t.reference}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${BADGE[t.payment_status] || BADGE.pending}`}>{t.payment_status === "paid" ? "Payé" : t.status === "cancelled" ? "Annulé" : "À payer"}</span>
                    <p className="mt-1 font-black text-[var(--ml-gold-deep)] dark:text-yellow-400">{formatFCFA(t.total)}</p>
                  </div>
                </div>
                {t.qr_payload && t.payment_status === "paid" && (
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--ml-border)] pt-3 dark:border-white/10">
                    <div>
                      <p className="text-[11px] uppercase text-[var(--ml-text-soft)] dark:text-white/40">Code du billet</p>
                      <p className="font-mono font-bold text-[var(--ml-blue)] dark:text-white">{t.verification_code}</p>
                    </div>
                    <button type="button" onClick={() => setQr(t)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-blue)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--ml-blue-2)]">
                      <QrCode className="h-4 w-4" /> Afficher le billet
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {qr && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={() => setQr(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-[#101a36]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-black text-[var(--ml-blue)] dark:text-white">Billet MaliLink</h3>
              <button type="button" onClick={() => setQr(null)} aria-label="Fermer" className="text-[var(--ml-text-soft)]"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">{qr.origin} → {qr.destination}</p>
            <div className="mx-auto mt-3 w-fit rounded-xl bg-white p-3 ring-1 ring-[var(--ml-border)]">
              <QRCodeCanvas value={qr.qr_payload || ""} size={180} level="M" />
            </div>
            <p className="mt-3 font-mono text-lg font-black text-[var(--ml-blue)] dark:text-yellow-400">{qr.verification_code}</p>
            <p className="text-xs text-[var(--ml-text-soft)] dark:text-white/40">{qr.ticket_number}</p>
          </div>
        </div>
      )}
    </div>
  );
}
