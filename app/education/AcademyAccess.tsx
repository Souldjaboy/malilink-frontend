"use client";

import Link from "next/link";
import { usePermissions } from "../lib/permissions";

/** Management visibility never grants access to school data. */
export default function AcademyAccess({ managementOnly = false }: { managementOnly?: boolean }) {
  const { me, loading, can } = usePermissions();
  if (loading || !me) return null;
  const superAdmin = me.is_super_admin === true;
  if (managementOnly && !superAdmin) return null;
  if (!superAdmin && (me.effective?.["education.learning"]?.view !== true || !can("education.learning", "view"))) return null;

  return <section aria-label="MaliLink Academy" className="min-w-0 rounded-2xl bg-slate-900 p-5 text-white shadow">
    <h2 className="text-xl font-bold text-white">MaliLink Academy</h2>
    <p className="mt-2 text-sm text-slate-200">Parcours pédagogiques, leçons, quiz et suivi des élèves.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      {!managementOnly && <Link href="/education/academy" className="rounded-xl bg-white px-4 py-3 font-semibold text-slate-900">Ouvrir Academy</Link>}
      {superAdmin && <Link href="/super-admin#modules-entreprise" className="rounded-xl bg-amber-300 px-4 py-3 font-semibold text-slate-900">Activer / désactiver par école</Link>}
    </div>
    {superAdmin && <p className="mt-3 text-sm text-slate-200">Administration Super Admin : choisissez une école dans « Modules par entreprise », puis réglez Éducation et MaliLink Academy. L’accès aux parcours reste soumis à l’activation de cette école.</p>}
  </section>;
}
