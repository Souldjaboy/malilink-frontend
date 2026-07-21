"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ticket, Search } from "lucide-react";
import { EmptyState } from "../components/States";

const TABS = [
  { key: "avenir", label: "À venir" },
  { key: "passes", label: "Passés" },
  { key: "annules", label: "Annulés" },
  { key: "termines", label: "Terminés" },
] as const;

/**
 * Mes voyages — historique des réservations.
 * L'API de réservation ouvre au Lot 4B : en attendant, la page affiche un
 * état vide honnête (aucune donnée fictive).
 */
export default function MesVoyagesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("avenir");
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-[var(--ml-soft)] px-4 pb-16 pt-8 dark:bg-[#0a0f22] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/travel" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ml-blue)] transition hover:underline dark:text-white/80">
          <ArrowLeft className="h-4 w-4" /> Retour à MaliLink Voyage
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ml-blue)] text-yellow-400">
            <Ticket className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-[var(--ml-blue)] dark:text-white">Mes voyages</h1>
            <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Historique, billets et réservations.</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
          <Search className="h-4 w-4 text-[var(--ml-text-soft)] dark:text-white/40" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une réservation…"
            className="w-full bg-transparent text-sm text-[var(--ml-text)] outline-none placeholder:text-[var(--ml-text-soft)]/60 dark:text-white"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filtre des voyages">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-[var(--ml-blue)] text-white"
                  : "bg-white text-[var(--ml-text)] hover:bg-[var(--ml-blue)]/10 dark:bg-white/5 dark:text-white/80"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <EmptyState
          icon={<Ticket className="h-7 w-7" />}
          title="Aucun voyage pour l'instant"
          message="Vos réservations et billets électroniques apparaîtront ici. La réservation et le paiement via le Wallet MaliLink ouvrent très prochainement."
        >
          <Link
            href="/travel"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-gold)] px-5 py-2.5 text-sm font-black text-[var(--ml-blue)] transition hover:bg-[var(--ml-gold-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-blue)]"
          >
            <Search className="h-4 w-4" /> Rechercher un voyage
          </Link>
        </EmptyState>
      </div>
    </div>
  );
}
