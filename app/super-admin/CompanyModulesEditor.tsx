"use client";

/**
 * Modules d'une société, pilotés par le super-admin.
 *
 * L'ancienne matrice ne proposait que 12 modules (POS, ventes, IA…) : aucune
 * verticale. Il était impossible de retirer Restaurant ou Éducation à une
 * boutique. Ici, tout le catalogue, groupé, avec pour chaque module la raison
 * de son état : profil métier, offre, ou décision du super-admin.
 *
 * Une décision enregistrée ici prime sur l'offre (Starter + Caméras pour une
 * société précise) sans modifier l'offre des autres clients, et n'est jamais
 * recalculée automatiquement.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/api";

type ModuleRow = {
  key: string;
  label: string;
  vertical: boolean;
  stored: { enabled: boolean; source: string } | null;
  effective: boolean;
  reason: string;
  in_profile: boolean;
  plan_allows: boolean;
};
type Group = { key: string; label: string; modules: ModuleRow[] };
type Detail = {
  company: {
    id: number; name: string; business_type: string; business_profile: string;
    business_profile_label: string; plan_name: string | null; plan_excluded_modules: string[];
  };
  groups: Group[];
};

const RAISONS: Record<string, string> = {
  accorde_super_admin: "Accordé par le super-admin",
  retire_super_admin: "Retiré par le super-admin",
  desactive_societe: "Désactivé pour la société",
  hors_plan: "Non inclus dans l'offre",
  active_societe: "Activé",
  profil_metier: "Profil métier",
  hors_profil: "Hors profil métier",
  defaut: "Activé par défaut",
  academy_non_active: "Academy non activée pour cette école",
  sous_module_desactive: "Sous-module désactivé",
};

export default function CompanyModulesEditor({ companies }: { companies: Array<{ id: number; name: string }> }) {
  const [companyId, setCompanyId] = useState<string>("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [brouillon, setBrouillon] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const charger = useCallback(async (id: string) => {
    setMessage("");
    const r = await authFetch(`/super-admin/companies/${id}/modules`, { cache: "no-store" });
    if (!r.ok) {
      setDetail(null);
      setMessage("Impossible de charger les modules de cette société.");
      return;
    }
    const d = (await r.json()) as Detail;
    setDetail(d);
    const initial: Record<string, boolean> = {};
    for (const g of d.groups) for (const m of g.modules) initial[m.key] = m.effective;
    setBrouillon(initial);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    let annule = false;
    (async () => {
      if (!annule) await charger(companyId);
    })();
    return () => {
      annule = true;
    };
  }, [companyId, charger]);

  const modifies = useMemo(() => {
    if (!detail) return {} as Record<string, boolean>;
    const out: Record<string, boolean> = {};
    for (const g of detail.groups) {
      for (const m of g.modules) if (brouillon[m.key] !== m.effective) out[m.key] = brouillon[m.key];
    }
    return out;
  }, [detail, brouillon]);

  const appliquerProfil = () => {
    if (!detail) return;
    const cible: Record<string, boolean> = {};
    for (const g of detail.groups) for (const m of g.modules) cible[m.key] = m.in_profile && m.plan_allows;
    setBrouillon(cible);
    setMessage("Sélection du profil métier appliquée au brouillon. Vérifiez puis enregistrez.");
  };

  const enregistrer = async () => {
    if (!detail || Object.keys(modifies).length === 0) return;
    setEnregistrement(true);
    setMessage("");
    const r = await authFetch(`/super-admin/companies/${detail.company.id}/modules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: modifies }),
    });
    const d = await r.json().catch(() => ({}));
    setEnregistrement(false);
    if (!r.ok) {
      setMessage(d?.error || "Enregistrement refusé.");
      return;
    }
    setMessage(`✅ ${d.saved?.length || 0} module(s) enregistré(s). Effet immédiat pour ${detail.company.name}.`);
    await charger(String(detail.company.id));
  };

  return (
    <div id="modules-entreprise" className="scroll-mt-24 bg-white rounded-2xl shadow p-4 sm:p-6 mb-10">
      <h2 className="text-2xl font-bold text-black mb-2">Modules par entreprise</h2>
      <p className="mb-3 text-slate-700">Pour une école : activez Éducation, puis MaliLink Academy. Les droits des utilisateurs se règlent séparément dans Droits &amp; permissions → Éducation → MaliLink Academy.</p>
      <p className="text-gray-500 mb-4">
        Le type d&apos;activité fixe la sélection de départ. Une décision prise ici prime sur l&apos;offre
        et ne change que cette entreprise. Désactiver masque et interdit l&apos;usage : aucune donnée n&apos;est supprimée.
      </p>

      <select
        value={companyId}
        onChange={(e) => setCompanyId(e.target.value)}
        className="w-full sm:w-96 max-w-full border rounded-xl p-3 text-black mb-4"
      >
        <option value="">Choisir une entreprise…</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {message && <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">{message}</div>}

      {detail && (
        <>
          <div className="mb-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Type d&apos;activité</div>
              <div className="font-bold text-black">{detail.company.business_profile_label}</div>
              <div className="text-xs text-gray-500">« {detail.company.business_type || "non renseigné"} »</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Offre</div>
              <div className="font-bold text-black">{detail.company.plan_name || "Aucune"}</div>
              {detail.company.plan_excluded_modules.length > 0 && (
                <div className="text-xs text-gray-500">N&apos;inclut pas : {detail.company.plan_excluded_modules.join(", ")}</div>
              )}
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Modifications en attente</div>
              <div className="font-bold text-black">{Object.keys(modifies).length}</div>
            </div>
          </div>

          <div className="space-y-5">
            {detail.groups.map((g) => (
              <section key={g.key}>
                <h3 className="font-bold text-black mb-2">{g.label}</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {g.modules.map((m) => {
                    const coche = brouillon[m.key] === true;
                    const change = brouillon[m.key] !== m.effective;
                    return (
                      <label
                        key={m.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                          change ? "border-blue-500 bg-blue-50" : coche ? "border-yellow-400 bg-yellow-50" : "border-gray-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={coche}
                          onChange={(e) => setBrouillon({ ...brouillon, [m.key]: e.target.checked })}
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-black">{m.label}</span>
                          <span className="block text-xs text-gray-500">
                            {RAISONS[m.reason] || m.reason}
                            {!m.plan_allows && m.reason !== "hors_plan" ? " · hors offre" : ""}
                            {m.in_profile ? " · profil" : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={enregistrer}
              disabled={enregistrement || Object.keys(modifies).length === 0}
              className="rounded-xl bg-yellow-500 px-6 py-3 font-black text-black disabled:opacity-50"
            >
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button onClick={appliquerProfil} className="rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700">
              Appliquer le profil métier
            </button>
            <button onClick={() => charger(String(detail.company.id))} className="rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700">
              Annuler les modifications
            </button>
          </div>
        </>
      )}
    </div>
  );
}
