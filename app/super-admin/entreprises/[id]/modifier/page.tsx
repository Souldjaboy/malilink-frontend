"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Copy, KeyRound, Loader2, Mail, Save, ShieldCheck } from "lucide-react";
import { authFetch } from "../../../../lib/api";

/* Super Admin › Entreprises › Modifier. Données de l'entreprise et données
   de ses administrateurs séparées. L'email ne change qu'après confirmation
   par la nouvelle adresse ; le mot de passe actuel n'est jamais lisible :
   seul un mot de passe temporaire, montré une fois, peut être créé. */

type Admin = {
  id: number; fullname: string; email: string; phone: string; role: string; is_active: boolean; account_status: string;
  email_verified: boolean; verification_required: boolean; force_password_change: boolean; admin_validated_at: string | null;
};
type Fiche = {
  entreprise: {
    id: number; name: string; business_type: string; responsible_name: string; email: string; phone: string; address: string;
    status: string; account_status: string; subscription_status: string; email_verified: boolean; tenant_id: string; admin_validated_at: string | null;
  };
  reglages: Record<string, string>;
  administrateurs: Admin[];
  changements_email_en_attente: { subject_type: string; subject_id: number; new_email: string; expires_at: string }[];
};
type Journal = { id: number; action: string; user_email: string; created_at: string; details: Record<string, unknown> };

const champ = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900";
const etiquette = "mb-1 block text-sm font-semibold text-gray-700";
const LIBELLES: Record<string, string> = {
  super_admin_company_update: "Entreprise modifiée", super_admin_company_email_change_requested: "Changement d'email de l'entreprise demandé",
  super_admin_admin_update: "Administrateur modifié", super_admin_admin_email_change_requested: "Changement d'email d'un administrateur demandé",
  reset_password: "Mot de passe temporaire créé", admin_account_validation: "Validation administrative", email_change_confirmed: "Nouvel email confirmé",
};
const CHAMPS_REGLAGES: [string, string][] = [["city", "Ville"], ["country", "Pays"], ["website", "Site internet"], ["whatsapp_number", "WhatsApp"],
  ["slogan", "Slogan"], ["currency", "Devise"], ["language", "Langue"]];

async function json(r: Response | null) {
  const d = await r?.json().catch(() => null);
  return { ok: Boolean(r?.ok), status: r?.status || 0, d: d || {} };
}

function CarteAdmin({ companyId, admin, enAttente, onChange }: { companyId: number; admin: Admin; enAttente?: string; onChange: () => void }) {
  const [f, setF] = useState({ fullname: admin.fullname || "", phone: admin.phone || "" });
  const [email, setEmail] = useState("");
  const [motif, setMotif] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [temporaire, setTemporaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const base = `/super-admin/entreprises/${companyId}/administrateurs/${admin.id}`;

  const action = async (fn: () => Promise<{ ok: boolean; d: Record<string, unknown> }>, succes?: string) => {
    setEnvoi(true);
    setMessage(null);
    const r = await fn();
    setEnvoi(false);
    setMessage({ ok: r.ok, texte: String(r.d.message || r.d.error || (r.ok ? succes || "Enregistré." : "Action impossible.")) });
    if (r.ok) onChange();
    return r;
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-black text-gray-900">#{admin.id} · {admin.role}</p>
        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
          <span className={`rounded-full px-2 py-0.5 ${admin.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{admin.is_active ? "Actif" : "Désactivé"}</span>
          <span className={`rounded-full px-2 py-0.5 ${admin.email_verified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>Email {admin.email_verified ? "vérifié" : "non vérifié"}</span>
          {admin.admin_validated_at && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">Validé par le Super Admin</span>}
          {admin.force_password_change && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">Changement de mot de passe exigé</span>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className={etiquette}>Nom complet</span><input value={f.fullname} onChange={(e) => setF({ ...f, fullname: e.target.value })} className={champ} /></label>
        <label><span className={etiquette}>Téléphone</span><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={champ} inputMode="tel" /></label>
      </div>
      <button type="button" disabled={envoi} onClick={() => action(async () => json(await authFetch(base, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
      }).catch(() => null)), "Administrateur modifié.")} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white">
        <Save size={16} /> Enregistrer l&apos;administrateur
      </button>

      <div className="rounded-xl bg-gray-50 p-3">
        <p className="text-sm font-bold text-gray-900">Email de connexion : {admin.email}</p>
        {enAttente && <p className="text-xs text-amber-800">Changement en attente de confirmation vers {enAttente}.</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nouvelle adresse" type="email" className={`${champ} max-w-xs`} />
          <button type="button" disabled={envoi || !email.trim()} onClick={() => action(async () => json(await authFetch(`${base}/email`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
          }).catch(() => null)))} className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            <Mail size={16} /> Envoyer la vérification
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">L&apos;adresse ne change qu&apos;après confirmation par la nouvelle boîte ; les sessions ouvertes sont alors fermées.</p>
      </div>

      <div className="rounded-xl bg-gray-50 p-3">
        <p className="text-sm font-bold text-gray-900">Mot de passe</p>
        <p className="text-xs text-gray-500">Le mot de passe actuel n&apos;est jamais affiché. Un mot de passe temporaire est créé, les sessions ouvertes sont fermées et un nouveau mot de passe est exigé à la connexion.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[false, true].map((parEmail) => (
            <button key={String(parEmail)} type="button" disabled={envoi} onClick={async () => {
              if (!window.confirm(`Créer un mot de passe temporaire pour ${admin.fullname || admin.email} ? Ses sessions seront fermées.`)) return;
              const r = await action(async () => json(await authFetch(`${base}/mot-de-passe`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ envoyer_email: parEmail }),
              }).catch(() => null)));
              if (r.ok) setTemporaire(String(r.d.mot_de_passe_temporaire || ""));
            }} className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white">
              <KeyRound size={16} /> {parEmail ? "Réinitialiser et envoyer par email" : "Réinitialiser (je le transmets)"}
            </button>
          ))}
        </div>
        {temporaire && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
            <span className="text-sm text-orange-900">Mot de passe temporaire (affiché une seule fois) :</span>
            <code className="rounded bg-white px-2 py-1 font-mono font-bold text-gray-900">{temporaire}</code>
            <button type="button" onClick={() => navigator.clipboard?.writeText(temporaire)} className="flex items-center gap-1 text-sm font-bold text-orange-900"><Copy size={14} /> Copier</button>
          </div>
        )}
      </div>

      {!admin.admin_validated_at && (admin.verification_required || !admin.email_verified) && (
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-sm font-bold text-blue-900">Validation administrative</p>
          <p className="text-xs text-blue-900/80">Ouvre la connexion sans prétendre que l&apos;email a été prouvé (il reste « non vérifié »). Action journalisée avec son motif.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif (obligatoire)" className={`${champ} max-w-sm`} />
            <button type="button" disabled={envoi || motif.trim().length < 5} onClick={() => action(async () => json(await authFetch(`${base}/validation`, {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motif }),
            }).catch(() => null)))} className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <ShieldCheck size={16} /> Valider le compte
            </button>
          </div>
        </div>
      )}
      {message && <p className={`rounded-xl p-3 text-sm font-semibold ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message.texte}</p>}
    </div>
  );
}

export default function ModifierEntreprisePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [journal, setJournal] = useState<Journal[]>([]);
  const [emailEntreprise, setEmailEntreprise] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const [r, j] = await Promise.all([authFetch(`/super-admin/entreprises/${id}`).catch(() => null), authFetch(`/super-admin/entreprises/${id}/journal`).catch(() => null)]);
    const d = await json(r);
    if (!d.ok) { setErreur(String(d.d.error || "Entreprise inaccessible.")); return; }
    const fi = d.d as unknown as Fiche;
    setFiche(fi);
    setF({ name: fi.entreprise.name || "", responsible_name: fi.entreprise.responsible_name || "", phone: fi.entreprise.phone || "", address: fi.entreprise.address || "", ...fi.reglages });
    if (j?.ok) setJournal(await j.json());
  }, [id]);
  useEffect(() => { queueMicrotask(charger); }, [charger]);

  const enregistrer = async () => {
    setEnvoi(true);
    setMessage(null);
    const r = await json(await authFetch(`/super-admin/entreprises/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    }).catch(() => null));
    setEnvoi(false);
    setMessage({ ok: r.ok, texte: r.ok ? `Enregistré${(r.d.modifications as string[])?.length ? ` (${(r.d.modifications as string[]).length} modification(s) journalisée(s))` : " (aucune modification)"}.` : String(r.d.error || "Erreur.") });
    if (r.ok) charger();
  };

  const changerEmailEntreprise = async () => {
    setEnvoi(true);
    const r = await json(await authFetch(`/super-admin/entreprises/${id}/email`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: emailEntreprise }),
    }).catch(() => null));
    setEnvoi(false);
    setMessage({ ok: r.ok, texte: String(r.d.message || r.d.error || "") });
    if (r.ok) charger();
  };

  if (erreur) return <main className="min-h-screen bg-gray-100 p-6"><p className="mx-auto max-w-xl rounded-2xl bg-white p-6 font-semibold text-red-700">{erreur}</p></main>;
  if (!fiche) return <main className="flex min-h-screen items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-gray-400" /></main>;
  const e = fiche.entreprise;
  const attente = (type: string, sid: number) => fiche.changements_email_en_attente.find((c) => c.subject_type === type && c.subject_id === sid)?.new_email;

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <Link href="/super-admin" className="text-sm font-bold text-blue-700">← Super Admin</Link>
          <h1 className="text-2xl font-black text-gray-900 md:text-3xl">Modifier l&apos;entreprise #{e.id}</h1>
          <p className="text-sm text-gray-600">{e.business_type} · tenant {e.tenant_id || "—"} · statut {e.status || "—"} · abonnement {e.subscription_status || "—"}
            {e.admin_validated_at ? " · validée par le Super Admin" : ""}</p>
        </div>

        <section className="space-y-4 rounded-2xl bg-white p-5 shadow">
          <h2 className="font-black text-gray-900">Entreprise</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["name", "Nom"], ["responsible_name", "Responsable"], ["phone", "Téléphone"], ["address", "Adresse"], ...CHAMPS_REGLAGES].map(([k, l]) => (
              <label key={k}><span className={etiquette}>{l}</span><input value={f[k] || ""} onChange={(ev) => setF({ ...f, [k]: ev.target.value })} className={champ} /></label>
            ))}
          </div>
          <button type="button" onClick={enregistrer} disabled={envoi} className="flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-2.5 font-black text-black disabled:opacity-60">
            <Save size={18} /> Enregistrer l&apos;entreprise
          </button>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-sm font-bold text-gray-900">Email de l&apos;entreprise : {e.email || "—"} {e.email_verified ? <BadgeCheck size={14} className="inline text-green-600" /> : <span className="text-xs text-amber-700">(non vérifié)</span>}</p>
            {attente("company", e.id) && <p className="text-xs text-amber-800">Changement en attente vers {attente("company", e.id)}.</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <input value={emailEntreprise} onChange={(ev) => setEmailEntreprise(ev.target.value)} placeholder="Nouvelle adresse" type="email" className={`${champ} max-w-xs`} />
              <button type="button" onClick={changerEmailEntreprise} disabled={envoi || !emailEntreprise.trim()} className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                <Mail size={16} /> Envoyer la vérification
              </button>
            </div>
          </div>
          {message && <p className={`rounded-xl p-3 text-sm font-semibold ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message.texte}</p>}
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-5 shadow">
          <h2 className="font-black text-gray-900">Administrateurs</h2>
          {fiche.administrateurs.length === 0 ? <p className="text-sm text-gray-500">Aucun administrateur.</p>
            : fiche.administrateurs.map((a) => <CarteAdmin key={a.id} companyId={e.id} admin={a} enAttente={attente("user", a.id)} onChange={charger} />)}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="font-black text-gray-900">Journal</h2>
          {journal.length === 0 ? <p className="mt-2 text-sm text-gray-500">Aucune action sensible enregistrée.</p> : (
            <ul className="mt-2 divide-y divide-gray-100 text-sm">
              {journal.map((j) => (
                <li key={j.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="font-semibold text-gray-900">{LIBELLES[j.action] || j.action}</span>
                  <span className="text-gray-500">{new Date(j.created_at).toLocaleString("fr-FR")} · {j.user_email || "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
