"use client";

/**
 * Caméras & Sécurité — inventaire par site.
 *
 * V1 volontairement sans lecteur vidéo : tant qu'aucun flux réel n'est
 * branché, afficher un cadre noir laisserait croire à un service qui
 * n'existe pas. L'état réseau reste « inconnu » tant qu'aucune sonde ne le
 * renseigne — on n'invente pas un « en ligne ».
 */

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "../lib/api";

type Camera = {
  id: number;
  code: string;
  name: string;
  location: string;
  camera_type: string;
  brand: string;
  model: string;
  status: string;
  online_status: string;
  warehouse_id: number | null;
  warehouse_name: string | null;
  recorder_name: string | null;
  observations: string;
  identifiants_configures: boolean;
};

type Resume = {
  total: number; actives: number;
  en_ligne: number; hors_ligne: number; etat_inconnu: number;
};

const ETAT_LIBELLE: Record<string, string> = {
  en_ligne: "En ligne",
  hors_ligne: "Hors ligne",
  inconnu: "État inconnu",
};

const ETAT_STYLE: Record<string, string> = {
  en_ligne: "bg-green-100 text-green-800",
  hors_ligne: "bg-red-100 text-red-800",
  inconnu: "bg-gray-100 text-gray-700",
};

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [siteFiltre, setSiteFiltre] = useState("");

  const [form, setForm] = useState({
    code: "", name: "", warehouse_id: "", location: "",
    camera_type: "", brand: "", model: "", observations: "",
  });

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const url = siteFiltre ? `/cameras?warehouse_id=${siteFiltre}` : "/cameras";
      const r = await authFetch(url, { cache: "no-store" });
      const d = await r.json();
      setCameras(Array.isArray(d.cameras) ? d.cameras : []);
      setResume(d.resume || null);
    } catch {
      setMessage("Impossible de charger les caméras.");
    } finally {
      setChargement(false);
    }
  }, [siteFiltre]);

  useEffect(() => {
    charger();
    authFetch("/warehouses", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSites(Array.isArray(d) ? d : d.warehouses || []))
      .catch(() => setSites([]));
  }, [charger]);

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const r = await authFetch("/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, warehouse_id: form.warehouse_id || null }),
      });
      const d = await r.json();
      if (!r.ok) { setMessage(d.error || "Enregistrement refusé."); return; }
      setForm({ code: "", name: "", warehouse_id: "", location: "", camera_type: "", brand: "", model: "", observations: "" });
      setFormulaireOuvert(false);
      charger();
    } catch {
      setMessage("Erreur réseau lors de l'enregistrement.");
    }
  };

  const supprimer = async (id: number, nom: string) => {
    if (!window.confirm(`Supprimer la caméra « ${nom} » ?`)) return;
    const r = await authFetch(`/cameras/${id}`, { method: "DELETE" });
    if (r.ok) charger();
    else setMessage("Suppression refusée.");
  };

  // Regroupement par site : c'est ainsi qu'on cherche une caméra sur le terrain.
  const parSite = cameras.reduce<Record<string, Camera[]>>((acc, c) => {
    const cle = c.warehouse_name || "Sans site rattaché";
    (acc[cle] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Caméras &amp; Sécurité</h1>
          <p className="text-sm text-gray-600 mt-1">
            Inventaire et organisation des caméras, par site.
          </p>
        </div>
        <button
          onClick={() => setFormulaireOuvert((v) => !v)}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {formulaireOuvert ? "Annuler" : "+ Ajouter une caméra"}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-900 text-sm">{message}</div>
      )}

      {resume && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            ["Caméras", resume.total],
            ["Actives", resume.actives],
            ["En ligne", resume.en_ligne],
            ["État inconnu", resume.etat_inconnu],
          ].map(([libelle, valeur]) => (
            <div key={String(libelle)} className="border rounded-lg p-3">
              <div className="text-xs text-gray-600">{libelle}</div>
              <div className="text-2xl font-bold mt-1">{valeur as number}</div>
            </div>
          ))}
        </div>
      )}

      {resume && resume.etat_inconnu === resume.total && resume.total > 0 && (
        <p className="mb-6 text-xs text-gray-600 border-l-2 border-gray-300 pl-3">
          Aucune sonde de supervision n&apos;est branchée : l&apos;état réseau reste « inconnu »
          plutôt que d&apos;afficher une disponibilité qui n&apos;a pas été vérifiée.
        </p>
      )}

      {formulaireOuvert && (
        <form onSubmit={enregistrer} className="border rounded-lg p-4 mb-6 grid gap-3 sm:grid-cols-2">
          <input required placeholder="Nom de la caméra *" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Code (ex. CAM-ENT-01)" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.warehouse_id}
            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">— Site de rattachement —</option>
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input placeholder="Emplacement (ex. Entrée principale)" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Type (dôme, bullet…)" value={form.camera_type}
            onChange={(e) => setForm({ ...form, camera_type: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Marque / modèle" value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Observations" value={form.observations}
            onChange={(e) => setForm({ ...form, observations: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" rows={2} />
          <button type="submit" className="bg-black text-white rounded-lg px-4 py-2 text-sm sm:col-span-2">
            Enregistrer
          </button>
        </form>
      )}

      <div className="mb-4">
        <select value={siteFiltre} onChange={(e) => setSiteFiltre(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto">
          <option value="">Tous les sites</option>
          {sites.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {chargement ? (
        <p className="text-sm text-gray-600">Chargement…</p>
      ) : cameras.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-gray-700 font-medium">Aucune donnée disponible pour le moment.</p>
          <p className="text-sm text-gray-600 mt-1">
            Ajoutez vos caméras pour les retrouver site par site.
          </p>
        </div>
      ) : (
        Object.entries(parSite).map(([site, liste]) => (
          <section key={site} className="mb-6">
            <h2 className="font-semibold mb-2">{site}</h2>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Caméra</th>
                    <th className="px-3 py-2 font-medium">Emplacement</th>
                    <th className="px-3 py-2 font-medium">État</th>
                    <th className="px-3 py-2 font-medium">Accès</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {liste.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{c.name}</div>
                        {c.code && <div className="text-xs text-gray-600">{c.code}</div>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{c.location || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${ETAT_STYLE[c.online_status] || ETAT_STYLE.inconnu}`}>
                          {ETAT_LIBELLE[c.online_status] || "État inconnu"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {c.identifiants_configures ? "Identifiants enregistrés" : "Non configurés"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => supprimer(c.id, c.name)}
                          className="text-red-700 text-xs hover:underline">
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
