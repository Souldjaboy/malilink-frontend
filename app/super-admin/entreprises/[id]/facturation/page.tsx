"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FilePlus2, HandCoins, History, ReceiptText, Send, ShieldAlert } from "lucide-react";
import { authFetch } from "../../../../lib/api";
import { api, avecValidation } from "../../../../lib/biometrie";
import { formatFCFA } from "../../../../lib/format";

/**
 * SUPER-ADMIN → ENTREPRISE → FACTURATION.
 *
 * Toutes les valeurs affichées viennent du serveur ; les aperçus de total du
 * formulaire ne sont qu'indicatifs (le serveur recalcule tout, prix standard
 * compris). Les corrections passent par annulation, avoir ou remboursement,
 * jamais par modification d'une facture émise.
 */

type Facture = { id: number; number: string; kind: string; status: string; issue_date: string; due_date: string | null;
  total: string; amount_paid: string; solde: string; discount_total: string; subtotal_standard: string; credited_invoice_id: number | null };
type Paiement = { id: number; amount: string; method: string; transaction_reference: string; status: string; source: string;
  invoice_number: string | null; receipt_number: string | null; created_at: string; paid_at: string | null; status_reason: string };
type Evenement = { id: number; event_type: string; amount: string | null; details: any; created_at: string; performed_by_name: string | null };

const date = (v?: string | null) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—");
const STATUT_FACTURE: Record<string, string> = { emise: "À payer", partielle: "Partielle", payee: "Payée", annulee: "Annulée", brouillon: "Brouillon" };
const STATUT_PAIEMENT: Record<string, string> = { pending: "En attente", confirmed: "Confirmé", failed: "Refusé", cancelled: "Annulé", refunded: "Remboursé" };
const METHODES: Record<string, string> = { orange_money: "Orange Money", wave: "Wave", moov_money: "Moov Money", virement: "Virement", especes: "Espèces", carte: "Carte", autre: "Autre" };
const cle = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function pdf(chemin: string, nom: string) {
  const r = await authFetch(chemin);
  if (!r.ok) throw new Error("PDF indisponible.");
  const url = URL.createObjectURL(await r.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return nom;
}

export default function FacturationEntreprisePage() {
  const { id } = useParams<{ id: string }>();
  const base = `/super-admin/companies/${id}`;
  const [donnees, setDonnees] = useState<{ etat: any; factures: Facture[]; paiements: Paiement[]; historique: Evenement[] } | null>(null);
  const [onglet, setOnglet] = useState<"factures" | "paiements" | "historique">("factures");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [nouvelleFacture, setNouvelleFacture] = useState(false);
  const [paiement, setPaiement] = useState<{ facture?: Facture; solde?: number } | null>(null);

  const charger = useCallback(async () => {
    const r = await api(`${base}/billing`);
    if (r.ok) setDonnees(r.data);
    else setMessage({ ok: false, texte: r.data?.error || "Facturation indisponible." });
  }, [base]);

  useEffect(() => { charger(); }, [charger]);

  const executer = async (fn: () => Promise<string>) => {
    setOccupe(true);
    setMessage(null);
    try {
      setMessage({ ok: true, texte: await fn() });
      await charger();
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Action impossible." });
    } finally {
      setOccupe(false);
    }
  };

  const appelMotif = (titre: string, chemin: string, scope: string | null, extra: Record<string, unknown> = {}, succes = "Fait.") => {
    const raison = window.prompt(`${titre}\nMotif (obligatoire) :`);
    if (!raison) return;
    executer(async () => {
      const options = { method: "POST", body: JSON.stringify({ reason: raison, ...extra }) };
      const r = scope ? await avecValidation(chemin, options, scope) : await api(chemin, options);
      if (!r.ok) throw new Error(r.data?.error || "Refusé.");
      return succes;
    });
  };

  if (!donnees) {
    return <div className="min-h-screen bg-gray-100 p-8 text-black">{message?.texte || "Chargement…"}</div>;
  }
  const e = donnees.etat;

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm text-gray-600"><Link href="/super-admin" className="underline">Super Admin</Link> › Entreprises › Facturation</p>
          <h1 className="text-3xl font-black md:text-4xl">{e.company_name}</h1>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Offre", `${e.offre.nom || "—"} · ${formatFCFA(e.offre.mensualite)}/mois`],
            ["État", `${e.statut}${e.verrouille ? " — verrouillé" : ""}${e.deverrouillage_force ? " (dérogation)" : ""}`],
            ["Fin de période", date(e.subscription_end)],
            ["Prochaine échéance", date(e.next_due_date)],
            ["Solde dû", formatFCFA(e.balance_due)],
          ].map(([l, v]) => (
            <div key={l} className={`rounded-2xl p-4 shadow ${l === "État" && e.verrouille ? "bg-red-50" : "bg-white"}`}>
              <p className="text-xs font-bold uppercase text-gray-500">{l}</p>
              <p className="mt-1 font-black">{v}</p>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setNouvelleFacture(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-blue-deep,#0a1330)] px-4 py-2 font-bold text-white">
            <FilePlus2 size={16} aria-hidden="true" /> Nouvelle facture</button>
          <button type="button" onClick={() => setPaiement({})} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-bold">
            <HandCoins size={16} aria-hidden="true" /> Enregistrer un paiement</button>
          <button type="button" disabled={occupe} className="rounded-xl border bg-white px-4 py-2 font-bold" onClick={() => {
            const mois = window.prompt("Prolonger de combien de mois ?", "1");
            if (mois) appelMotif("Prolonger l'abonnement", `${base}/subscription/extend`, null, { months: Number(mois) }, "Abonnement prolongé.");
          }}>Prolonger</button>
          <button type="button" disabled={occupe} className="rounded-xl border bg-white px-4 py-2 font-bold" onClick={() => {
            const jours = window.prompt("Période gratuite : combien de jours ?", "15");
            if (jours) appelMotif("Ajouter une période gratuite", `${base}/subscription/extend`, null, { days: Number(jours), free: true }, "Période gratuite ajoutée.");
          }}>Période gratuite</button>
          {e.statut === "suspendu"
            ? <button type="button" disabled={occupe} className="rounded-xl border bg-white px-4 py-2 font-bold" onClick={() => appelMotif("Réactiver", `${base}/subscription/reactivate`, null, {}, "Abonnement réactivé.")}>Réactiver</button>
            : <button type="button" disabled={occupe} className="rounded-xl border bg-white px-4 py-2 font-bold text-red-700" onClick={() => appelMotif("Suspendre l'abonnement", `${base}/subscription/suspend`, null, {}, "Abonnement suspendu.")}>Suspendre</button>}
          {e.deverrouillage_force
            ? <button type="button" disabled={occupe} className="rounded-xl border bg-white px-4 py-2 font-bold" onClick={() => appelMotif("Lever la dérogation", `${base}/subscription/remove-override`, null, {}, "Dérogation levée.")}>Lever la dérogation</button>
            : <button type="button" disabled={occupe} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-bold" onClick={() => {
              const jusqua = window.prompt("Déverrouiller jusqu'au (AAAA-MM-JJ, vide = sans limite) :", "");
              appelMotif("Forcer le déverrouillage", `${base}/subscription/force-unlock`, "facturation.deverrouillage",
                jusqua ? { until: jusqua } : {}, "Déverrouillage forcé (audité).");
            }}><ShieldAlert size={16} aria-hidden="true" /> Forcer le déverrouillage</button>}
        </div>

        {message && (
          <p role={message.ok ? "status" : "alert"} className={`rounded-xl p-4 font-bold ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message.texte}</p>
        )}

        <nav className="flex gap-2" aria-label="Sections">
          {([["factures", "Factures", ReceiptText], ["paiements", "Paiements", HandCoins], ["historique", "Historique", History]] as const).map(([k, l, I]) => (
            <button key={k} type="button" onClick={() => setOnglet(k)} aria-pressed={onglet === k}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold ${onglet === k ? "bg-[var(--ml-blue-deep,#0a1330)] text-white" : "bg-white"}`}>
              <I size={16} aria-hidden="true" /> {l}</button>
          ))}
        </nav>

        {onglet === "factures" && (
          <section className="overflow-x-auto rounded-2xl bg-white p-4 shadow">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead><tr className="border-b text-gray-500"><th className="py-2">Numéro</th><th>Date</th><th>Nature</th><th>Standard</th><th>Remise</th><th>Net</th><th>Reste</th><th>Statut</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {donnees.factures.length === 0 && <tr><td colSpan={9} className="py-4 text-gray-500">Aucune facture.</td></tr>}
                {donnees.factures.map((f) => (
                  <tr key={f.id} className="border-b align-top">
                    <td className="py-2 font-bold">{f.number}</td>
                    <td>{date(f.issue_date)}</td>
                    <td>{f.kind}</td>
                    <td className={Number(f.discount_total) > 0 ? "text-gray-400 line-through" : ""}>{formatFCFA(Number(f.subtotal_standard))}</td>
                    <td className="text-red-700">{Number(f.discount_total) > 0 ? `-${formatFCFA(Number(f.discount_total))}` : ""}</td>
                    <td className="font-bold">{formatFCFA(Number(f.total))}</td>
                    <td>{formatFCFA(Number(f.solde))}</td>
                    <td>{STATUT_FACTURE[f.status] || f.status}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-2 py-1" onClick={() => executer(() => pdf(`${base}/invoices/${f.id}/pdf`, f.number).then((n) => `PDF ${n} ouvert.`))}>
                          <Download size={14} aria-hidden="true" /> PDF</button>
                        {["emise", "partielle"].includes(f.status) && f.kind !== "avoir" && (
                          <>
                            <button type="button" className="rounded-lg border px-2 py-1 font-bold text-green-800" onClick={() => setPaiement({ facture: f, solde: Number(f.solde) })}>Marquer payée</button>
                            <button type="button" className="rounded-lg border px-2 py-1" onClick={() => setPaiement({ facture: f, solde: undefined })}>Partielle</button>
                          </>
                        )}
                        {f.status === "emise" && Number(f.amount_paid) === 0 && (
                          <button type="button" className="rounded-lg border px-2 py-1 text-red-700" onClick={() => appelMotif(`Annuler ${f.number}`, `${base}/invoices/${f.id}/cancel`, "facturation.correction", {}, "Facture annulée.")}>Annuler</button>
                        )}
                        {["payee", "partielle"].includes(f.status) && f.kind !== "avoir" && (
                          <button type="button" className="rounded-lg border px-2 py-1" onClick={() => {
                            const m = window.prompt("Montant de l'avoir (FCFA) :", String(Number(f.amount_paid)));
                            if (m) appelMotif(`Avoir sur ${f.number}`, `${base}/invoices/${f.id}/avoir`, "facturation.correction", { amount: Number(m) }, "Avoir émis.");
                          }}>Avoir</button>
                        )}
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-2 py-1" onClick={() => executer(async () => {
                          const r = await api(`${base}/invoices/${f.id}/send`, { method: "POST", body: "{}" });
                          if (!r.ok) throw new Error(r.data?.error || "Envoi impossible.");
                          return `Facture envoyée à ${r.data.envoye_a}.`;
                        })}><Send size={14} aria-hidden="true" /> Envoyer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {onglet === "paiements" && (
          <section className="overflow-x-auto rounded-2xl bg-white p-4 shadow">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead><tr className="border-b text-gray-500"><th className="py-2">Date</th><th>Montant</th><th>Moyen</th><th>Référence</th><th>Facture</th><th>Origine</th><th>Statut</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {donnees.paiements.length === 0 && <tr><td colSpan={8} className="py-4 text-gray-500">Aucun paiement.</td></tr>}
                {donnees.paiements.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">{date(p.paid_at || p.created_at)}</td>
                    <td className="font-bold">{formatFCFA(Number(p.amount))}</td>
                    <td>{METHODES[p.method] || p.method}</td>
                    <td className="font-mono text-xs">{p.transaction_reference || "—"}</td>
                    <td>{p.invoice_number || "—"}</td>
                    <td>{p.source === "declaration_client" ? "Déclaré par le client" : p.source}</td>
                    <td>{STATUT_PAIEMENT[p.status] || p.status}{p.status_reason ? ` — ${p.status_reason}` : ""}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        {p.status === "pending" && (
                          <>
                            <button type="button" className="rounded-lg border px-2 py-1 font-bold text-green-800" disabled={occupe} onClick={() => executer(async () => {
                              const r = await api(`${base}/payments/${p.id}/confirm`, { method: "POST", body: "{}" });
                              if (!r.ok) throw new Error(r.data?.error);
                              return r.data?.prolongation ? `Paiement validé, abonnement prolongé de ${r.data.prolongation.mois} mois.` : "Paiement validé.";
                            })}>Valider</button>
                            <button type="button" className="rounded-lg border px-2 py-1 text-red-700" onClick={() => appelMotif("Refuser ce paiement", `${base}/payments/${p.id}/refuse`, null, {}, "Paiement refusé.")}>Refuser</button>
                          </>
                        )}
                        {p.status === "confirmed" && (
                          <>
                            <button type="button" className="rounded-lg border px-2 py-1" onClick={() => executer(() => pdf(`${base}/payments/${p.id}/recu`, String(p.receipt_number)).then(() => "Reçu ouvert."))}>Reçu</button>
                            <button type="button" className="rounded-lg border px-2 py-1 text-red-700" onClick={() => appelMotif("Rembourser ce paiement", `${base}/payments/${p.id}/refund`, "facturation.correction", {}, "Remboursement enregistré.")}>Rembourser</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {onglet === "historique" && (
          <section className="rounded-2xl bg-white p-4 shadow">
            <ul className="divide-y text-sm">
              {donnees.historique.map((h) => (
                <li key={h.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between">
                  <span><strong>{h.event_type.replace(/_/g, " ")}</strong>{h.amount !== null ? ` · ${formatFCFA(Number(h.amount))}` : ""}
                    {h.details?.numero ? ` · ${h.details.numero}` : ""}{h.details?.motif ? ` · ${h.details.motif}` : ""}</span>
                  <span className="text-gray-500">{new Date(h.created_at).toLocaleString("fr-FR")}{h.performed_by_name ? ` · ${h.performed_by_name}` : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {nouvelleFacture && (
        <NouvelleFacture offre={e.offre} base={base} onFermer={() => setNouvelleFacture(false)}
          onCree={(n) => { setNouvelleFacture(false); setMessage({ ok: true, texte: `Facture ${n} émise.` }); charger(); }} />
      )}
      {paiement && (
        <SaisiePaiement base={base} facture={paiement.facture} soldeComplet={paiement.solde} factures={donnees.factures}
          onFermer={() => setPaiement(null)}
          onFait={(t) => { setPaiement(null); setMessage({ ok: true, texte: t }); charger(); }} />
      )}
    </div>
  );
}

type Ligne = { kind: "installation" | "abonnement" | "personnalise"; months: number; label: string; quantity: number;
  unit_price_standard: string; unit_price: string; discount_label: string };

function NouvelleFacture({ offre, base, onFermer, onCree }: {
  offre: { nom: string; mensualite: number; installation: number }; base: string; onFermer: () => void; onCree: (n: string) => void;
}) {
  const vide = (kind: Ligne["kind"]): Ligne => ({ kind, months: 1, label: "", quantity: 1,
    unit_price_standard: "", unit_price: "", discount_label: "Réduction exceptionnelle" });
  const [lignes, setLignes] = useState<Ligne[]>([vide("installation")]);
  const [echeance, setEcheance] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const avecAbonnement = lignes.some((l) => l.kind === "abonnement");

  const standardDe = (l: Ligne) => (l.kind === "installation" ? offre.installation
    : l.kind === "abonnement" ? offre.mensualite : Number(l.unit_price_standard || l.unit_price || 0));
  const quantiteDe = (l: Ligne) => (l.kind === "abonnement" ? l.months : l.kind === "personnalise" ? l.quantity : 1);
  const factureDe = (l: Ligne) => (l.unit_price === "" ? standardDe(l) : Number(l.unit_price));
  const apercu = useMemo(() => {
    const standard = lignes.reduce((t, l) => t + standardDe(l) * quantiteDe(l), 0);
    const net = lignes.reduce((t, l) => t + factureDe(l) * quantiteDe(l), 0);
    return { standard, net, remise: standard - net };
  }, [lignes]);

  const maj = (i: number, patch: Partial<Ligne>) => setLignes(lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const envoyer = async () => {
    setEnvoi(true);
    setErreur("");
    try {
      const r = await api(`${base}/invoices`, { method: "POST", body: JSON.stringify({
        lines: lignes.map((l) => ({
          kind: l.kind, months: l.months, label: l.label || undefined, quantity: l.quantity,
          unit_price_standard: l.kind === "personnalise" ? Number(l.unit_price_standard || l.unit_price || 0) : undefined,
          unit_price: l.unit_price === "" ? undefined : Number(l.unit_price), discount_label: l.discount_label,
        })),
        due_date: echeance || null, reference, notes,
      }) });
      if (!r.ok) throw new Error(r.data?.error || "Facture refusée.");
      onCree(r.data.facture.number);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Facture refusée.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Nouvelle facture">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-5 text-black">
        <h2 className="text-xl font-black">Nouvelle facture — {offre.nom}</h2>
        {erreur && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-800">{erreur}</p>}
        <div className="mt-4 space-y-3">
          {lignes.map((l, i) => {
            const standard = standardDe(l);
            const facture = factureDe(l);
            const q = quantiteDe(l);
            return (
              <div key={i} className="rounded-xl border p-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <select className="rounded-lg border p-2" value={l.kind} onChange={(e) => maj(i, { ...vide(e.target.value as Ligne["kind"]) })} aria-label="Type de ligne">
                    <option value="installation">Installation</option>
                    <option value="abonnement">Abonnement</option>
                    <option value="personnalise">Personnalisée</option>
                  </select>
                  {l.kind === "abonnement" && (
                    <label className="text-sm">Mois<input type="number" min={1} max={36} className="w-full rounded-lg border p-2" value={l.months}
                      onChange={(e) => maj(i, { months: Number(e.target.value) })} /></label>
                  )}
                  {l.kind === "personnalise" && (
                    <>
                      <input className="rounded-lg border p-2" placeholder="Libellé" value={l.label} onChange={(e) => maj(i, { label: e.target.value })} aria-label="Libellé" />
                      <label className="text-sm">Prix standard<input type="number" min={0} className="w-full rounded-lg border p-2" value={l.unit_price_standard}
                        onChange={(e) => maj(i, { unit_price_standard: e.target.value })} /></label>
                    </>
                  )}
                  <label className="text-sm">Prix facturé (unitaire)
                    <input type="number" min={0} className="w-full rounded-lg border p-2" placeholder={String(standard)} value={l.unit_price}
                      onChange={(e) => maj(i, { unit_price: e.target.value })} /></label>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    Prix standard :{" "}
                    <span className={facture < standard ? "text-gray-400 line-through" : "font-bold"}>{formatFCFA(standard * q)}</span>
                    {facture < standard && <> → <strong>{formatFCFA(facture * q)}</strong>{" "}
                      <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-800">Économie : {formatFCFA((standard - facture) * q)}</span></>}
                  </span>
                  {facture < standard && (
                    <input className="rounded-lg border p-1 text-sm" value={l.discount_label} onChange={(e) => maj(i, { discount_label: e.target.value })} aria-label="Libellé de la remise" />
                  )}
                  {lignes.length > 1 && <button type="button" className="text-red-700 underline" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>Retirer</button>}
                </div>
                {facture > standard && <p className="mt-1 text-xs font-bold text-red-700">Le prix facturé ne peut pas dépasser le prix standard.</p>}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-lg border px-3 py-2 font-bold" onClick={() => setLignes([...lignes, vide("personnalise")])}>+ Ligne</button>
            <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold">
              <input type="checkbox" checked={avecAbonnement}
                onChange={(e) => setLignes(e.target.checked ? [...lignes, vide("abonnement")] : lignes.filter((l) => l.kind !== "abonnement"))} />
              Inclure l&apos;abonnement mensuel ({formatFCFA(offre.mensualite)}/mois)
            </label>
          </div>
          {!avecAbonnement && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Abonnement mensuel non inclus dans la présente facture — il sera rappelé pour information ({formatFCFA(offre.mensualite)} / mois), hors total.
            </p>
          )}
          <div className="grid gap-2 md:grid-cols-3">
            <label className="text-sm">Échéance<input type="date" className="w-full rounded-lg border p-2" value={echeance} onChange={(e) => setEcheance(e.target.value)} /></label>
            <label className="text-sm">Référence<input className="w-full rounded-lg border p-2" value={reference} onChange={(e) => setReference(e.target.value)} /></label>
            <label className="text-sm">Notes<input className="w-full rounded-lg border p-2" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-sm">
            <p>Total au prix standard : <span className={apercu.remise > 0 ? "line-through" : ""}>{formatFCFA(apercu.standard)}</span></p>
            {apercu.remise > 0 && <p className="text-red-700">Remises : -{formatFCFA(apercu.remise)}</p>}
            <p className="text-lg font-black">Net à payer : {formatFCFA(apercu.net)}</p>
            <p className="text-xs text-gray-500">Aperçu indicatif : le serveur recalcule tout à l&apos;émission.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onFermer} className="rounded-xl border py-3 font-bold">Annuler</button>
          <button type="button" onClick={envoyer} disabled={envoi} className="rounded-xl bg-[var(--ml-blue-deep,#0a1330)] py-3 font-bold text-white">
            {envoi ? "Émission…" : "Émettre la facture"}</button>
        </div>
      </div>
    </div>
  );
}

function SaisiePaiement({ base, facture, soldeComplet, factures, onFermer, onFait }: {
  base: string; facture?: Facture; soldeComplet?: number; factures: Facture[]; onFermer: () => void; onFait: (t: string) => void;
}) {
  const ouvertes = factures.filter((f) => ["emise", "partielle"].includes(f.status) && f.kind !== "avoir");
  const [factureId, setFactureId] = useState<number | "">(facture?.id || ouvertes[0]?.id || "");
  const [montant, setMontant] = useState(soldeComplet !== undefined ? String(soldeComplet) : "");
  const [mois, setMois] = useState(1);
  const [methode, setMethode] = useState("orange_money");
  const [reference, setReference] = useState("");
  const [payeLe, setPayeLe] = useState(new Date().toISOString().slice(0, 10));
  const [erreur, setErreur] = useState("");
  const [cleIdem] = useState(cle);
  const envoyer = async () => {
    setErreur("");
    const r = await api(`${base}/payments`, {
      method: "POST", headers: { "Idempotency-Key": cleIdem },
      body: JSON.stringify({ invoice_id: factureId || null, amount: factureId ? Number(montant) : undefined, months: factureId ? undefined : mois,
        method: methode, transaction_reference: reference, paid_at: payeLe, confirm: true }),
    });
    if (!r.ok) return setErreur(r.data?.error || "Paiement refusé.");
    onFait(r.data?.confirmation?.prolongation ? `Paiement confirmé, abonnement prolongé de ${r.data.confirmation.prolongation.mois} mois.` : "Paiement confirmé.");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Enregistrer un paiement">
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 text-black">
        <h2 className="text-xl font-black">Enregistrer un paiement</h2>
        {erreur && <p role="alert" className="rounded-xl bg-red-50 p-3 font-bold text-red-800">{erreur}</p>}
        <label className="block text-sm font-bold">Facture
          <select className="w-full rounded-lg border p-2" value={factureId} onChange={(e) => setFactureId(Number(e.target.value) || "")}>
            {ouvertes.map((f) => <option key={f.id} value={f.id}>{f.number} — reste {formatFCFA(Number(f.solde))}</option>)}
            <option value="">Sans facture : mensualité(s) (facture générée)</option>
          </select></label>
        {factureId ? (
          <label className="block text-sm font-bold">Montant (≤ solde)
            <input type="number" min={1} className="w-full rounded-lg border p-2" value={montant} onChange={(e) => setMontant(e.target.value)} /></label>
        ) : (
          <label className="block text-sm font-bold">Nombre de mois
            <input type="number" min={1} max={36} className="w-full rounded-lg border p-2" value={mois} onChange={(e) => setMois(Number(e.target.value))} /></label>
        )}
        <label className="block text-sm font-bold">Moyen
          <select className="w-full rounded-lg border p-2" value={methode} onChange={(e) => setMethode(e.target.value)}>
            {Object.entries(METHODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label className="block text-sm font-bold">Référence de transaction
          <input className="w-full rounded-lg border p-2" value={reference} onChange={(e) => setReference(e.target.value)} /></label>
        <label className="block text-sm font-bold">Payé le
          <input type="date" className="w-full rounded-lg border p-2" value={payeLe} onChange={(e) => setPayeLe(e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onFermer} className="rounded-xl border py-3 font-bold">Annuler</button>
          <button type="button" onClick={envoyer} className="rounded-xl bg-[var(--ml-blue-deep,#0a1330)] py-3 font-bold text-white">Confirmer</button>
        </div>
      </div>
    </div>
  );
}
