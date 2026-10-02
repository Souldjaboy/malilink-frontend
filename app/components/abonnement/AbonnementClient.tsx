"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CreditCard, Download, LifeBuoy, LogOut, ShieldAlert } from "lucide-react";
import { authFetch } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

/**
 * Abonnement de l'entreprise — écran de verrouillage ou page de gestion.
 *
 * Verrouillé : « Votre abonnement MaliLink a expiré », offre, montant dû,
 * période, date d'expiration, moyens de paiement (numéro, QR), déclaration
 * du paiement, factures, support, déconnexion. Les données sont conservées.
 *
 * Le montant n'est jamais saisi par le client : il vient des factures
 * ouvertes ou de la mensualité, calculé par le serveur.
 */

type Etat = {
  statut: string; verrouille: boolean; offre: { nom: string; mensualite: number; installation: number };
  subscription_start: string | null; subscription_end: string | null; fin_grace: string | null;
  next_due_date: string | null; montant_du: number; balance_due: number; factures_ouvertes: number;
  suspension: { motif: string } | null; company_name: string;
};
type Facture = { id: number; number: string; kind: string; status: string; issue_date: string; due_date: string | null; total: string; solde: string };
type Moyen = { code: string; label: string; account_number: string; account_name: string; instructions: string; qr_payload: string };

const date = (v?: string | null) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—");
const STATUTS: Record<string, string> = {
  actif: "Actif", essai: "Essai", grace: "Délai de grâce", expire: "Expiré", suspendu: "Suspendu", gratuit: "Gratuit",
};
const LIB_FACTURE: Record<string, string> = { emise: "À payer", partielle: "Partielle", payee: "Payée", annulee: "Annulée", brouillon: "Brouillon" };

async function telechargerPdf(chemin: string, nom: string) {
  const r = await authFetch(chemin);
  if (!r.ok) throw new Error("Téléchargement impossible.");
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function deconnecter() {
  ["token", "user", "business_token", "business_user", "admin_token"].forEach((k) => localStorage.removeItem(k));
  for (const c of ["triangle_token", "triangle_business_token", "triangle_super_admin", "triangle_subscription_status", "triangle_modules"]) {
    document.cookie = `${c}=; path=/; max-age=0`;
  }
  window.location.href = "/login";
}

export default function AbonnementClient({ modeVerrou }: { modeVerrou: boolean }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [factures, setFactures] = useState<Facture[] | null>(null);
  const [moyens, setMoyens] = useState<Moyen[]>([]);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [methode, setMethode] = useState("");
  const [reference, setReference] = useState("");
  const [factureChoisie, setFactureChoisie] = useState<number | "">("");
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const r = await authFetch("/abonnement/etat", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErreur(d.error || "État de l'abonnement indisponible.");
      return;
    }
    setEtat(d.etat);
    if (modeVerrou && !d.etat.verrouille) {
      // Paiement validé ou dérogation : on rouvre l'application.
      document.cookie = `triangle_subscription_status=active; path=/; max-age=86400; SameSite=Lax`;
      window.location.href = "/dashboard";
      return;
    }
    const [f, m] = await Promise.all([authFetch("/abonnement/factures", { cache: "no-store" }), authFetch("/abonnement/moyens-paiement")]);
    if (f.ok) {
      const liste: Facture[] = (await f.json()).factures || [];
      setFactures(liste);
      const ouverte = liste.find((x) => ["emise", "partielle"].includes(x.status) && x.kind !== "avoir");
      setFactureChoisie((v) => (v === "" && ouverte ? ouverte.id : v));
    } else {
      setFactures(null);
    }
    if (m.ok) {
      const ms: Moyen[] = (await m.json()).moyens || [];
      setMoyens(ms);
      setMethode((v) => v || ms[0]?.code || "");
    }
  }, [modeVerrou]);

  useEffect(() => {
    charger();
    if (!modeVerrou) return undefined;
    const t = setInterval(charger, 30000);
    return () => clearInterval(t);
  }, [charger, modeVerrou]);

  const declarer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur("");
    setMessage("");
    try {
      const r = await authFetch("/abonnement/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2)}` },
        body: JSON.stringify({ invoice_id: factureChoisie || null, method: methode, transaction_reference: reference.trim(), months: 1 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Déclaration refusée.");
      setMessage(d.message || "Paiement déclaré.");
      setReference("");
      await charger();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Déclaration impossible.");
    } finally {
      setEnvoi(false);
    }
  };

  if (!etat) {
    return <div className="p-8 text-black">{erreur || "Chargement de l'abonnement…"}</div>;
  }

  const ouvertes = (factures || []).filter((x) => ["emise", "partielle"].includes(x.status) && x.kind !== "avoir");
  const moyen = moyens.find((m) => m.code === methode);
  const montant = factureChoisie
    ? Number(ouvertes.find((x) => x.id === factureChoisie)?.solde || 0)
    : etat.offre.mensualite;

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-black">
      <section className={`rounded-3xl p-6 shadow-xl md:p-8 ${modeVerrou ? "bg-[var(--ml-blue-deep,#0a1330)] text-white" : "bg-white"}`}>
        {modeVerrou && (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--ml-gold,#d4a23c)] px-3 py-1 text-xs font-black uppercase text-[var(--ml-blue-deep,#0a1330)]">
            <ShieldAlert size={14} aria-hidden="true" /> Accès suspendu
          </p>
        )}
        <h1 className={`text-3xl font-black md:text-4xl ${modeVerrou ? "text-white" : ""}`}>
          {modeVerrou
            ? etat.statut === "suspendu" ? "Votre abonnement MaliLink est suspendu" : "Votre abonnement MaliLink a expiré"
            : "Mon abonnement"}
        </h1>
        <p className={`mt-2 ${modeVerrou ? "text-white/80" : "text-gray-600"}`}>
          {modeVerrou
            ? "Vos données sont conservées. Réglez votre abonnement pour retrouver l'accès à toutes vos fonctions."
            : etat.company_name}
          {etat.suspension?.motif ? ` Motif : ${etat.suspension.motif}.` : ""}
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Offre", etat.offre.nom || "—"],
            ["Statut", STATUTS[etat.statut] || etat.statut],
            ["Période", `${date(etat.subscription_start)} → ${date(etat.subscription_end)}`],
            ["Montant dû", formatFCFA(etat.montant_du)],
          ].map(([l, v]) => (
            <div key={l} className={`rounded-2xl p-4 ${modeVerrou ? "bg-white/10" : "bg-gray-50"}`}>
              <dt className={`text-xs font-bold uppercase ${modeVerrou ? "text-white/60" : "text-gray-500"}`}>{l}</dt>
              <dd className="mt-1 font-black">{v}</dd>
            </div>
          ))}
        </dl>
        {etat.statut === "grace" && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
            Échéance dépassée : accès maintenu jusqu&apos;au {date(etat.fin_grace)}. Réglez avant cette date pour éviter le verrouillage.
          </p>
        )}
        <p className={`mt-4 text-sm ${modeVerrou ? "text-white/70" : "text-gray-500"}`}>
          Mensualité : {formatFCFA(etat.offre.mensualite)} · prochaine échéance : {date(etat.next_due_date)}
        </p>
      </section>

      {message && <p role="status" className="rounded-xl bg-green-50 p-4 font-bold text-green-800">{message}</p>}
      {erreur && <p role="alert" className="rounded-xl bg-red-50 p-4 font-bold text-red-800">{erreur}</p>}

      {factures === null ? (
        <p className="rounded-2xl bg-white p-6 shadow">Le paiement et les factures sont gérés par la direction de votre entreprise.</p>
      ) : (
        <>
          <section className="rounded-2xl bg-white p-6 shadow" aria-labelledby="payer">
            <h2 id="payer" className="flex items-center gap-2 text-xl font-black"><CreditCard size={20} aria-hidden="true" /> Payer</h2>
            {moyens.length === 0 ? (
              <p className="mt-3 text-gray-600">Les moyens de paiement ne sont pas encore publiés : contactez le support MaliLink.</p>
            ) : (
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {moyens.map((m) => (
                      <button key={m.code} type="button" onClick={() => setMethode(m.code)} aria-pressed={methode === m.code}
                        className={`rounded-xl border px-4 py-2 font-bold ${methode === m.code ? "border-[var(--ml-blue-deep,#0a1330)] bg-[var(--ml-blue-deep,#0a1330)] text-white" : ""}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {moyen && (
                    <div className="mt-4 rounded-xl bg-gray-50 p-4">
                      <p className="text-sm text-gray-600">Envoyez <strong>{formatFCFA(montant)}</strong> à :</p>
                      <p className="mt-1 text-2xl font-black">{moyen.account_number}</p>
                      {moyen.account_name && <p className="text-sm text-gray-600">{moyen.account_name}</p>}
                      {moyen.instructions && <p className="mt-2 text-sm">{moyen.instructions}</p>}
                      {moyen.qr_payload && (
                        <div className="mt-3 inline-block rounded-xl bg-white p-3"><QRCodeSVG value={moyen.qr_payload} size={132} /></div>
                      )}
                    </div>
                  )}
                </div>
                <form onSubmit={declarer} className="space-y-3">
                  <p className="text-sm text-gray-600">Après le paiement, indiquez la référence reçue par SMS : MaliLink la vérifie puis rouvre votre accès.</p>
                  {ouvertes.length > 0 && (
                    <label className="block text-sm font-bold">Facture réglée
                      <select className="mt-1 w-full rounded-xl border p-3" value={factureChoisie}
                        onChange={(e) => setFactureChoisie(Number(e.target.value) || "")}>
                        {ouvertes.map((f) => <option key={f.id} value={f.id}>{f.number} — reste {formatFCFA(Number(f.solde))}</option>)}
                        <option value="">Une mensualité ({formatFCFA(etat.offre.mensualite)})</option>
                      </select>
                    </label>
                  )}
                  <label className="block text-sm font-bold">Référence de la transaction
                    <input className="mt-1 w-full rounded-xl border p-3" value={reference} onChange={(e) => setReference(e.target.value)}
                      placeholder="ex. PP231002.1530.A12345" required maxLength={120} />
                  </label>
                  <button type="submit" disabled={envoi || !methode || !reference.trim()}
                    className="w-full rounded-xl bg-[var(--ml-gold,#d4a23c)] py-3 font-black text-[var(--ml-blue-deep,#0a1330)] disabled:opacity-50">
                    {envoi ? "Envoi…" : `J'ai payé ${formatFCFA(montant)}`}
                  </button>
                </form>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow" aria-labelledby="factures">
            <h2 id="factures" className="text-xl font-black">Factures</h2>
            <ul className="mt-3 divide-y">
              {(factures || []).length === 0 && <li className="py-3 text-gray-500">Aucune facture.</li>}
              {(factures || []).map((f) => (
                <li key={f.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold">{f.number} <span className="text-sm font-normal text-gray-500">· {date(f.issue_date)}</span></p>
                    <p className="text-sm text-gray-600">{LIB_FACTURE[f.status] || f.status} · total {formatFCFA(Number(f.total))}
                      {Number(f.solde) > 0 ? ` · reste ${formatFCFA(Number(f.solde))}` : ""}</p>
                  </div>
                  <button type="button" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold"
                    onClick={() => telechargerPdf(`/abonnement/factures/${f.id}/pdf`, f.number).catch((e) => setErreur(e.message))}>
                    <Download size={16} aria-hidden="true" /> PDF
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <a href="/support" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border bg-white px-6 py-4 font-bold">
          <LifeBuoy size={18} aria-hidden="true" /> Contacter le support
        </a>
        {modeVerrou && (
          <button type="button" onClick={deconnecter} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border bg-white px-6 py-4 font-bold">
            <LogOut size={18} aria-hidden="true" /> Se déconnecter
          </button>
        )}
      </div>
    </div>
  );
}
