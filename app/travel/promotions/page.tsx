"use client";

import Link from "next/link";
import { ArrowLeft, Tag, Search } from "lucide-react";
import { EmptyState } from "../components/States";

/**
 * Promotions Voyage — offres spéciales, codes promo, dernière minute.
 * Les promotions publiées par les compagnies s'affichent directement dans
 * les résultats de recherche (badge -%). Une page dédiée listera bientôt
 * les offres mises en avant ; en attendant, état honnête sans données fictives.
 */
export default function PromotionsPage() {
  return (
    <div className="min-h-screen bg-[var(--ml-soft)] px-4 pb-16 pt-8 dark:bg-[#0a0f22] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/travel" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ml-blue)] transition hover:underline dark:text-white/80">
          <ArrowLeft className="h-4 w-4" /> Retour à MaliLink Voyage
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ml-gold)] text-[var(--ml-blue)]">
            <Tag className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-[var(--ml-blue)] dark:text-white">Promotions</h1>
            <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Offres spéciales, codes promo et dernière minute.</p>
          </div>
        </div>

        <EmptyState
          icon={<Tag className="h-7 w-7" />}
          title="Les promotions arrivent"
          message="Les réductions publiées par les compagnies partenaires apparaissent déjà directement dans les résultats de recherche (badge -%). Cette page réunira bientôt les meilleures offres du moment."
        >
          <Link
            href="/travel"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-gold)] px-5 py-2.5 text-sm font-black text-[var(--ml-blue)] transition hover:bg-[var(--ml-gold-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-blue)]"
          >
            <Search className="h-4 w-4" /> Voir les offres disponibles
          </Link>
        </EmptyState>
      </div>
    </div>
  );
}
