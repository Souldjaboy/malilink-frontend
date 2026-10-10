"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../lib/api";
import { formatFCFA } from "../lib/format";
import AIChatWidget from "../components/AIChatWidget";
import AcademyAccess from "./AcademyAccess";

type Dashboard = {
  total_students: number;
  today: { presents: number; retards: number; absents: number };
  unpaid_total: number;
  top_students: { general_average: string; first_name: string; last_name: string; class_name: string | null }[];
};

const PARCOURS = [
  { href: "/education/inscriptions", label: "Inscription" },
  { href: "/education/classes", label: "Affectation" },
  { href: "/education/paiements", label: "Paiement" },
  { href: "/education/eleves", label: "Badge" },
  { href: "/education/presences", label: "Présence" },
  { href: "/education/notes", label: "Notes" },
  { href: "/education/notes", label: "Bulletin" },
];

const NAV = [
  { href: "/education/inscriptions", label: "Inscription", desc: "Nouvel élève ou réinscription : dossier, classe, frais, paiement", icon: "📝" },
  { href: "/education/eleves", label: "Élèves & badges", desc: "Dossiers, photos, matricules, badges QR", icon: "🎓" },
  { href: "/education/paiements", label: "Frais & paiements", desc: "Encaissements, échéances, impayés, reçus", icon: "💰" },
  { href: "/education/classes", label: "Classes & matières", desc: "Niveaux, coefficients, professeurs", icon: "🏫" },
  { href: "/education/professeurs", label: "Professeurs", desc: "Fiches, matricules, spécialités", icon: "👨‍🏫" },
  { href: "/education/affectations", label: "Affectations", desc: "Prof ↔ matière ↔ classe, coefficients", icon: "🔗" },
  { href: "/education/emploi-du-temps", label: "Emploi du temps", desc: "Horaires, salles, détection des conflits", icon: "📅" },
  { href: "/education/presences", label: "Présences", desc: "Scan QR, appel, retards, absences", icon: "✅" },
  { href: "/education/notes", label: "Notes & bulletins", desc: "Évaluations, moyennes, rangs", icon: "📊" },
  { href: "/education/cours", label: "Cours en ligne", desc: "Supports, leçons, liens vidéo/visio", icon: "📚" },
  { href: "/education/devoirs", label: "Devoirs & corrections", desc: "Devoirs à rendre, rendus, corrections notées", icon: "📗" },
  { href: "/education/parametres", label: "Paramètres", desc: "Établissement, années, périodes", icon: "⚙️" },
  { href: "/education/parent", label: "Espace parent", desc: "Suivi de mes enfants", icon: "👨‍👩‍👧" },
];

export default function EducationHomePage() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [isParentOnly, setIsParentOnly] = useState(false);

  useEffect(() => {
    authFetch("/education/dashboard").then(async (res) => {
      if (res.ok) setDash(await res.json());
      else if (res.status === 403) setIsParentOnly(true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow">
          <h1 className="text-3xl font-black text-white">MaliLink Éducation</h1>
          <p className="mt-1 text-white/70">Gestion complète de votre établissement scolaire</p>

          {dash && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-center md:grid-cols-4">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-2xl font-black">{dash.total_students}</p>
                <p className="text-sm text-white/70">Élèves actifs</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-2xl font-black text-green-400">{dash.today.presents}</p>
                <p className="text-sm text-white/70">Présents aujourd&apos;hui</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-2xl font-black text-orange-400">{dash.today.retards}</p>
                <p className="text-sm text-white/70">Retards</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-2xl font-black text-red-400">{dash.today.absents}</p>
                <p className="text-sm text-white/70">Absents</p>
              </div>
            </div>
          )}
          {dash && dash.unpaid_total > 0 && (
            <Link href="/education/paiements" className="mt-3 block rounded-xl bg-amber-400/15 p-3 font-semibold text-amber-100 hover:bg-amber-400/25">
              Reste à encaisser (scolarité) : {formatFCFA(dash.unpaid_total)} →
            </Link>
          )}
        </div>

        {!isParentOnly && (
          <nav aria-label="Parcours de l'élève" className="rounded-2xl bg-white p-4 shadow">
            <p className="text-sm font-black text-gray-900">Parcours de l&apos;élève</p>
            <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm font-bold">
              {PARCOURS.map((p, i) => (
                <li key={p.label} className="flex items-center gap-1">
                  <Link href={p.href} className={`rounded-full px-3 py-1.5 ${i === 0 ? "bg-yellow-500 text-black" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}>
                    {i + 1}. {p.label}
                  </Link>
                  {i < PARCOURS.length - 1 && <span aria-hidden="true" className="text-gray-400">→</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {isParentOnly && (
          <p className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-800">
            Bienvenue ! Accédez à l&apos;espace parent pour suivre vos enfants.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <AcademyAccess />
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-2xl bg-white p-5 shadow transition hover:shadow-lg">
              <p className="text-3xl">{n.icon}</p>
              <p className="mt-2 text-lg font-black text-gray-900">{n.label}</p>
              <p className="text-sm text-gray-500">{n.desc}</p>
            </Link>
          ))}
        </div>

        {dash && dash.top_students.length > 0 && (
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-black text-gray-900">Meilleures moyennes</h2>
            <div className="mt-3 space-y-2">
              {dash.top_students.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <p className="font-semibold text-gray-800">
                    {i + 1}. {s.first_name} {s.last_name} {s.class_name ? `(${s.class_name})` : ""}
                  </p>
                  <p className="font-black text-gray-900">{Number(s.general_average).toFixed(2)}/20</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <AIChatWidget
        space="education"
        suggestions={[
          "Aide-moi à gérer mon école",
          "Combien d’élèves sont présents aujourd’hui ?",
          "Explique-moi le module Éducation",
        ]}
      />
    </div>
  );
}
