"use client";

/**
 * Réseaux sociaux — comptes, publications et calendrier éditorial.
 *
 * Aucun connecteur officiel n'est configuré : rien n'est publié
 * automatiquement. L'écran le dit explicitement plutôt que d'afficher un
 * bouton « Publier » qui ne publierait nulle part.
 */

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "../lib/api";

type Compte = {
  id: number; network: string; display_name: string; handle: string;
  status: string; jeton_configure: boolean;
};

type Publication = {
  id: number; title: string; body: string; network: string; status: string;
  scheduled_for: string | null; published_at: string | null;
  account_name: string | null;
};

const RESEAUX = [
  { cle: "facebook", nom: "Facebook" },
  { cle: "instagram", nom: "Instagram" },
  { cle: "tiktok", nom: "TikTok" },
  { cle: "whatsapp", nom: "WhatsApp Business" },
  { cle: "linkedin", nom: "LinkedIn" },
  { cle: "x", nom: "X" },
];

const NOM_RESEAU = Object.fromEntries(RESEAUX.map((r) => [r.cle, r.nom]));

const STATUT_LIBELLE: Record<string, string> = {
  brouillon: "Brouillon",
  programme: "Programmée",
  publie: "Publiée",
  echoue: "Échouée",
};

const STATUT_STYLE: Record<string, string> = {
  brouillon: "bg-gray-100 text-gray-700",
  programme: "bg-blue-100 text-blue-800",
  publie: "bg-green-100 text-green-800",
  echoue: "bg-red-100 text-red-800",
};

export default function MarketingPage() {
  const [onglet, setOnglet] = useState<"publications" | "comptes">("publications");
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [tableau, setTableau] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);

  const [formPost, setFormPost] = useState({ title: "", body: "", account_id: "", scheduled_for: "" });
  const [formCompte, setFormCompte] = useState({ network: "facebook", display_name: "", handle: "" });
  const [postOuvert, setPostOuvert] = useState(false);
  const [compteOuvert, setCompteOuvert] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [rc, rp, rt] = await Promise.all([
        authFetch("/marketing/comptes", { cache: "no-store" }),
        authFetch("/marketing/publications", { cache: "no-store" }),
        authFetch("/marketing/tableau-de-bord", { cache: "no-store" }),
      ]);
      const [dc, dp, dt] = await Promise.all([rc.json(), rp.json(), rt.json()]);
      setComptes(Array.isArray(dc.comptes) ? dc.comptes : []);
      setPublications(Array.isArray(dp.publications) ? dp.publications : []);
      setTableau(dt || null);
    } catch {
      setMessage("Impossible de charger le module.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const creerPublication = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const r = await authFetch("/marketing/publications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formPost,
        account_id: formPost.account_id || null,
        scheduled_for: formPost.scheduled_for || null,
        status: formPost.scheduled_for ? "programme" : "brouillon",
      }),
    });
    const d = await r.json();
    if (!r.ok) { setMessage(d.error || "Création refusée."); return; }
    setFormPost({ title: "", body: "", account_id: "", scheduled_for: "" });
    setPostOuvert(false);
    charger();
  };

  const creerCompte = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const r = await authFetch("/marketing/comptes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formCompte),
    });
    const d = await r.json();
    if (!r.ok) { setMessage(d.error || "Création refusée."); return; }
    setFormCompte({ network: "facebook", display_name: "", handle: "" });
    setCompteOuvert(false);
    charger();
  };

  const supprimerPublication = async (id: number) => {
    if (!window.confirm("Supprimer cette publication ?")) return;
    const r = await authFetch(`/marketing/publications/${id}`, { method: "DELETE" });
    if (r.ok) charger(); else setMessage("Suppression refusée.");
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Marketing &amp; Réseaux sociaux</h1>
      <p className="text-sm text-gray-600 mt-1 mb-6">
        Comptes, publications et calendrier éditorial de l&apos;entreprise.
      </p>

      {tableau && tableau.connecteurs_actifs === false && (
        <div className="mb-6 p-3 rounded-lg bg-blue-50 text-blue-900 text-sm">
          {tableau.message_connecteurs}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-900 text-sm">{message}</div>
      )}

      {tableau && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            ["Comptes", tableau.comptes?.total ?? 0],
            ["Brouillons", tableau.publications?.brouillons ?? 0],
            ["Programmées", tableau.publications?.programmes ?? 0],
            ["Publiées", tableau.publications?.publies ?? 0],
          ].map(([libelle, valeur]) => (
            <div key={String(libelle)} className="border rounded-lg p-3">
              <div className="text-xs text-gray-600">{libelle}</div>
              <div className="text-2xl font-bold mt-1">{valeur as number}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b overflow-x-auto">
        {([["publications", "Publications"], ["comptes", "Comptes"]] as const).map(([cle, nom]) => (
          <button key={cle} onClick={() => setOnglet(cle)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
              onglet === cle ? "border-black" : "border-transparent text-gray-600"
            }`}>
            {nom}
          </button>
        ))}
      </div>

      {onglet === "publications" && (
        <>
          <button onClick={() => setPostOuvert((v) => !v)}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium mb-4">
            {postOuvert ? "Annuler" : "+ Nouvelle publication"}
          </button>

          {postOuvert && (
            <form onSubmit={creerPublication} className="border rounded-lg p-4 mb-6 grid gap-3">
              <input placeholder="Titre interne (facultatif)" value={formPost.title}
                onChange={(e) => setFormPost({ ...formPost, title: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm" />
              <textarea required rows={4} placeholder="Texte de la publication *" value={formPost.body}
                onChange={(e) => setFormPost({ ...formPost, body: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={formPost.account_id}
                  onChange={(e) => setFormPost({ ...formPost, account_id: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">— Compte cible —</option>
                  {comptes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {NOM_RESEAU[c.network] || c.network} — {c.display_name}
                    </option>
                  ))}
                </select>
                <input type="datetime-local" value={formPost.scheduled_for}
                  onChange={(e) => setFormPost({ ...formPost, scheduled_for: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <p className="text-xs text-gray-600">
                Sans date, la publication est enregistrée en brouillon. Avec une date, elle est
                programmée dans le calendrier — la publication sur le réseau reste manuelle
                tant qu&apos;aucun connecteur officiel n&apos;est branché.
              </p>
              <button type="submit" className="bg-black text-white rounded-lg px-4 py-2 text-sm">
                Enregistrer
              </button>
            </form>
          )}

          {chargement ? (
            <p className="text-sm text-gray-600">Chargement…</p>
          ) : publications.length === 0 ? (
            <div className="border rounded-lg p-8 text-center">
              <p className="text-gray-700 font-medium">Aucune donnée disponible pour le moment.</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {publications.map((p) => (
                <li key={p.id} className="border rounded-lg p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{p.title || "Sans titre"}</div>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">{p.body}</p>
                      <div className="text-xs text-gray-600 mt-2">
                        {NOM_RESEAU[p.network] || p.network || "Réseau non défini"}
                        {p.account_name ? ` · ${p.account_name}` : ""}
                        {p.scheduled_for ? ` · ${new Date(p.scheduled_for).toLocaleString("fr-FR")}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 rounded text-xs ${STATUT_STYLE[p.status] || ""}`}>
                        {STATUT_LIBELLE[p.status] || p.status}
                      </span>
                      <button onClick={() => supprimerPublication(p.id)}
                        className="text-red-700 text-xs hover:underline">
                        Supprimer
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {onglet === "comptes" && (
        <>
          <button onClick={() => setCompteOuvert((v) => !v)}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium mb-4">
            {compteOuvert ? "Annuler" : "+ Ajouter un compte"}
          </button>

          {compteOuvert && (
            <form onSubmit={creerCompte} className="border rounded-lg p-4 mb-6 grid gap-3 sm:grid-cols-2">
              <select value={formCompte.network}
                onChange={(e) => setFormCompte({ ...formCompte, network: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm">
                {RESEAUX.map((r) => <option key={r.cle} value={r.cle}>{r.nom}</option>)}
              </select>
              <input required placeholder="Nom affiché *" value={formCompte.display_name}
                onChange={(e) => setFormCompte({ ...formCompte, display_name: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Identifiant (@…)" value={formCompte.handle}
                onChange={(e) => setFormCompte({ ...formCompte, handle: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
              <button type="submit" className="bg-black text-white rounded-lg px-4 py-2 text-sm sm:col-span-2">
                Enregistrer
              </button>
            </form>
          )}

          {comptes.length === 0 ? (
            <div className="border rounded-lg p-8 text-center">
              <p className="text-gray-700 font-medium">Aucune donnée disponible pour le moment.</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {comptes.map((c) => (
                <li key={c.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{c.display_name}</div>
                    <div className="text-xs text-gray-600">
                      {NOM_RESEAU[c.network] || c.network}{c.handle ? ` · ${c.handle}` : ""}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                    {c.status === "connecte" ? "Connecté" : "Non connecté"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
