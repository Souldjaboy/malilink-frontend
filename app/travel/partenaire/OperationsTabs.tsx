"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Store, Upload, Loader2, ScanLine, CheckCircle2,
  XCircle, Search, TrendingUp,
} from "lucide-react";
import { formatFCFA } from "../../lib/format";
import {
  fetchPartnerStats, fetchPartnerBookings, fetchPartnerPayments,
  scanTicket, posSell, createVehicle,
  type PartnerStats, type PartnerBooking,
} from "../lib/travelApi";

const cardCls = "rounded-2xl border border-[var(--ml-border)] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5";
const inputCls = "w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] focus:ring-2 focus:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5 dark:text-white";

function Spinner() {
  return <div className="flex justify-center py-16 text-[var(--ml-text-soft)] dark:text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>;
}

/* ═══════════════ Statistiques (données réelles) ═══════════════ */
export function StatsTab() {
  const [s, setS] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchPartnerStats().then(setS).catch(() => setS(null)).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;
  const kpi = [
    { label: "Chiffre d'affaires", value: formatFCFA(s?.revenue || 0), accent: true },
    { label: "Commission MaliLink", value: formatFCFA(s?.commission || 0) },
    { label: "Net transporteur", value: formatFCFA(s?.vendor_net || 0) },
    { label: "Réservations payées", value: String(s?.bookings_paid || 0) },
    { label: "Places vendues", value: String(s?.seats_sold || 0) },
    { label: "Taux de remplissage", value: `${s?.fill_rate || 0}%` },
    { label: "Lignes", value: String(s?.routes || 0) },
    { label: "Départs programmés", value: String(s?.schedules || 0) },
    { label: "Véhicules", value: String(s?.vehicles || 0) },
  ];
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-[var(--ml-blue)] dark:text-white">Statistiques</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {kpi.map((k) => (
          <div key={k.label} className={cardCls}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ml-text-soft)] dark:text-white/50">{k.label}</p>
            <p className={`mt-1 text-xl font-black tabular-nums ${k.accent ? "text-[var(--ml-gold-deep)] dark:text-yellow-400" : "text-[var(--ml-blue)] dark:text-white"}`}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className={cardCls}>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--ml-blue)] dark:text-white"><TrendingUp className="h-4 w-4" /> Trajets les plus vendus</h3>
        {(!s?.top_routes || s.top_routes.length === 0) ? (
          <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/50">Aucune vente pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {s.top_routes.map((t, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-[var(--ml-text)] dark:text-white/80">{t.origin} → {t.destination}</span>
                <span className="font-bold text-[var(--ml-blue)] dark:text-white">{t.sales} vente{t.sales > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ Réservations (réelles) ═══════════════ */
const BADGE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  refunded: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};
export function BookingsTab() {
  const [items, setItems] = useState<PartnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const load = useMemo(() => () => {
    setLoading(true);
    fetchPartnerBookings({ q: q || undefined, status: status || undefined })
      .then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [q, status]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[var(--ml-blue)] dark:text-white">Réservations</h2>
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
          <Search className="h-4 w-4 text-[var(--ml-text-soft)]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, téléphone, référence…" className="w-full bg-transparent text-sm text-[var(--ml-text)] outline-none dark:text-white" aria-label="Rechercher une réservation" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls + " w-auto"} aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          <option value="confirmed">Confirmée</option>
          <option value="pending">En attente</option>
          <option value="cancelled">Annulée</option>
        </select>
      </div>
      {loading ? <Spinner /> : items.length === 0 ? (
        <div className={cardCls + " text-center"}><p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Aucune réservation pour le moment.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--ml-border)] dark:border-white/10">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-[var(--ml-soft)] text-left text-xs uppercase text-[var(--ml-text-soft)] dark:bg-white/5 dark:text-white/50">
                <th className="p-3">Référence</th><th className="p-3">Passager</th><th className="p-3">Trajet</th><th className="p-3">Date</th><th className="p-3">Montant</th><th className="p-3">Paiement</th><th className="p-3">Billet</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.reference} className="border-t border-[var(--ml-border)] dark:border-white/10">
                  <td className="p-3 font-mono text-xs text-[var(--ml-blue)] dark:text-white">{b.reference}</td>
                  <td className="p-3 text-[var(--ml-text)] dark:text-white/80">{b.passenger || "—"}<br /><span className="text-xs text-[var(--ml-text-soft)]">{b.phone}</span></td>
                  <td className="p-3 text-[var(--ml-text)] dark:text-white/80">{b.origin} → {b.destination}</td>
                  <td className="p-3 tabular-nums text-[var(--ml-text-soft)] dark:text-white/60">{b.travel_date}</td>
                  <td className="p-3 font-bold tabular-nums text-[var(--ml-blue)] dark:text-white">{formatFCFA(b.total)}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${BADGE[b.payment_status] || BADGE.pending}`}>{b.payment_status}</span> {b.channel === "pos" && <span className="ml-1 text-[10px] uppercase text-[var(--ml-text-soft)]">comptoir</span>}</td>
                  <td className="p-3 font-mono text-xs text-[var(--ml-text-soft)] dark:text-white/60">{b.verification_code || "—"}{b.ticket_status === "used" && <span className="ml-1 text-emerald-600">✓ utilisé</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Paiements & factures ═══════════════ */
export function PaymentsTab() {
  const [items, setItems] = useState<{ reference: string; total: number; commission: number; vendor_net: number; currency: string; payment_method: string; paid_at: string; origin?: string; destination?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchPartnerPayments().then((r) => setItems(r as never)).catch(() => setItems([])).finally(() => setLoading(false)); }, []);

  const exportCsv = () => {
    const rows = [["reference", "trajet", "montant", "commission", "net", "moyen", "date"], ...items.map((p) => [p.reference, `${p.origin}-${p.destination}`, p.total, p.commission, p.vendor_net, p.payment_method, p.paid_at])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "paiements-voyage.csv"; a.click();
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--ml-blue)] dark:text-white">Paiements & factures</h2>
        {items.length > 0 && <button type="button" onClick={exportCsv} className="rounded-lg bg-[var(--ml-blue)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--ml-blue-2)]">Exporter CSV</button>}
      </div>
      <p className="text-xs text-[var(--ml-text-soft)] dark:text-white/50">Reversements via le Wallet MaliLink (moteur financier unique). Commission prélevée automatiquement.</p>
      {items.length === 0 ? (
        <div className={cardCls + " text-center"}><p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Aucun paiement encaissé pour le moment.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--ml-border)] dark:border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="bg-[var(--ml-soft)] text-left text-xs uppercase text-[var(--ml-text-soft)] dark:bg-white/5 dark:text-white/50">
              <th className="p-3">Référence</th><th className="p-3">Trajet</th><th className="p-3">Montant</th><th className="p-3">Commission</th><th className="p-3">Net</th><th className="p-3">Moyen</th>
            </tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.reference} className="border-t border-[var(--ml-border)] dark:border-white/10">
                  <td className="p-3 font-mono text-xs text-[var(--ml-blue)] dark:text-white">{p.reference}</td>
                  <td className="p-3 text-[var(--ml-text)] dark:text-white/80">{p.origin} → {p.destination}</td>
                  <td className="p-3 font-bold tabular-nums text-[var(--ml-blue)] dark:text-white">{formatFCFA(p.total)}</td>
                  <td className="p-3 tabular-nums text-[var(--ml-text-soft)] dark:text-white/60">{formatFCFA(p.commission)}</td>
                  <td className="p-3 tabular-nums text-emerald-600 dark:text-emerald-400">{formatFCFA(p.vendor_net)}</td>
                  <td className="p-3 text-[var(--ml-text-soft)] dark:text-white/60">{p.payment_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Point de vente (POS) + Contrôle ═══════════════ */
export function PosTab({ companyId }: { companyId: number }) {
  const [tab, setTab] = useState<"scan" | "vente">("scan");
  const [code, setCode] = useState("");
  const [scanResult, setScanResult] = useState<{ valid: boolean; result: string; origin?: string; destination?: string; company?: string } | null>(null);
  const [scanning, setScanning] = useState(false);

  const doScan = async () => {
    if (!code.trim()) return;
    setScanning(true); setScanResult(null);
    try { setScanResult(await scanTicket(code.trim())); }
    catch { setScanResult({ valid: false, result: "error" }); }
    finally { setScanning(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[var(--ml-blue)] dark:text-white">Point de vente & contrôle</h2>
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("scan")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "scan" ? "bg-[var(--ml-blue)] text-white" : "bg-white text-[var(--ml-text)] dark:bg-white/5 dark:text-white/80"}`}>Contrôle des billets</button>
        <button type="button" onClick={() => setTab("vente")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "vente" ? "bg-[var(--ml-blue)] text-white" : "bg-white text-[var(--ml-text)] dark:bg-white/5 dark:text-white/80"}`}>Vente au comptoir</button>
      </div>

      {tab === "scan" ? (
        <div className={cardCls + " space-y-3"}>
          <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Saisissez le code du billet ou le contenu du QR code.</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MLK-TRV-XXXXXX" className={inputCls} aria-label="Code du billet" onKeyDown={(e) => e.key === "Enter" && doScan()} />
            <button type="button" onClick={doScan} disabled={scanning} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-gold)] px-4 py-2.5 text-sm font-black text-[var(--ml-blue)] hover:bg-[var(--ml-gold-light)] disabled:opacity-60">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />} Vérifier
            </button>
          </div>
          {scanResult && (
            <div className={`flex items-start gap-3 rounded-xl p-4 ${scanResult.result === "valid" || scanResult.result === "boarded" ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10"}`}>
              {scanResult.result === "valid" || scanResult.result === "boarded"
                ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                : <XCircle className="h-6 w-6 shrink-0 text-red-600" />}
              <div>
                <p className={`font-bold ${scanResult.result === "valid" || scanResult.result === "boarded" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{SCAN_LABEL[scanResult.result] || scanResult.result}</p>
                {scanResult.origin && <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">{scanResult.company} · {scanResult.origin} → {scanResult.destination}</p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <PosSellForm companyId={companyId} />
      )}
    </div>
  );
}

const SCAN_LABEL: Record<string, string> = {
  valid: "Billet valide — embarquement autorisé", boarded: "Embarquement validé ✓",
  already_used: "Billet déjà utilisé", cancelled: "Billet annulé", refunded: "Billet remboursé",
  expired: "Billet expiré", payment_unconfirmed: "Paiement non confirmé",
  not_found: "Billet introuvable", invalid_signature: "Billet non authentique", error: "Erreur de contrôle",
};

function PosSellForm({ companyId }: { companyId: number }) {
  const [form, setForm] = useState({ route_id: "", schedule_id: "", travel_date: "", customer_phone: "", first_name: "", adults: 1, children: 0 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState<{ ticket: string; code: string } | null>(null);

  const sell = async () => {
    setBusy(true); setMsg(""); setOk(null);
    try {
      const r = await posSell({
        travel_company_id: companyId, route_id: Number(form.route_id), schedule_id: form.schedule_id ? Number(form.schedule_id) : null,
        travel_date: form.travel_date, customer_phone: form.customer_phone, first_name: form.first_name,
        adults: form.adults, children: form.children,
      });
      setOk({ ticket: r.ticket.ticket_number, code: r.ticket.verification_code });
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur."); } finally { setBusy(false); }
  };

  return (
    <div className={cardCls + " space-y-3"}>
      <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Vente au guichet (même structure que la vente en ligne). Encaissement via le Wallet du client.</p>
      <div className="grid grid-cols-2 gap-3">
        <input value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })} placeholder="ID ligne" className={inputCls} aria-label="ID de la ligne" />
        <input value={form.schedule_id} onChange={(e) => setForm({ ...form, schedule_id: e.target.value })} placeholder="ID départ (optionnel)" className={inputCls} aria-label="ID du départ" />
        <input type="date" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} className={inputCls} aria-label="Date du voyage" />
        <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="Téléphone client" className={inputCls} aria-label="Téléphone du client" />
        <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Nom du voyageur" className={inputCls} aria-label="Nom du voyageur" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={1} value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} className={inputCls} aria-label="Adultes" />
          <input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} className={inputCls} aria-label="Enfants" />
        </div>
      </div>
      {msg && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{msg}</p>}
      {ok && <div className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-500/10"><p className="font-bold text-emerald-700 dark:text-emerald-300">Billet émis : {ok.ticket}</p><p className="font-mono text-[var(--ml-text-soft)]">Code : {ok.code}</p></div>}
      <button type="button" onClick={sell} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-gold)] px-5 py-2.5 text-sm font-black text-[var(--ml-blue)] hover:bg-[var(--ml-gold-light)] disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />} Encaisser & émettre le billet
      </button>
    </div>
  );
}

/* ═══════════════ Import (CSV véhicules — fonctionnel) ═══════════════ */
export function ImportTab() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [report, setReport] = useState<{ ok: number; ko: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const parse = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((l) => {
      const cells = l.split(",");
      return Object.fromEntries(headers.map((h, i) => [h, (cells[i] || "").trim()]));
    });
  };
  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setRows(parse(String(reader.result || "")));
    reader.readAsText(f);
  };
  const doImport = async () => {
    setBusy(true); let ok = 0, ko = 0;
    for (const r of rows) {
      try {
        await createVehicle({ name: r.name || r.nom, registration: r.registration || r.immatriculation || "", mode_code: r.mode_code || r.mode || "bus", capacity: Number(r.capacity || r.capacite || 0), has_ac: /oui|true|1/i.test(r.clim || r.has_ac || "") });
        ok += 1;
      } catch { ko += 1; }
    }
    setReport({ ok, ko }); setBusy(false); setRows([]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[var(--ml-blue)] dark:text-white">Importer des données</h2>
      <div className={cardCls + " space-y-3"}>
        <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Import CSV de véhicules. Colonnes : <span className="font-mono text-xs">name, registration, mode_code, capacity, clim</span>. (Excel/JSON/XML et connecteurs GDS : architecture prête pour extension.)</p>
        <a href={"data:text/csv,name,registration,mode_code,capacity,clim%0ABus%20001,AB-123-ML,bus,50,oui"} download="modele-vehicules.csv" className="inline-block text-sm font-semibold text-[var(--ml-blue)] underline dark:text-yellow-400">Télécharger le modèle CSV</a>
        <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="block text-sm" aria-label="Fichier CSV" />
        {rows.length > 0 && (
          <>
            <p className="text-sm font-semibold text-[var(--ml-blue)] dark:text-white">Aperçu : {rows.length} ligne(s)</p>
            <div className="max-h-40 overflow-auto rounded-lg border border-[var(--ml-border)] p-2 text-xs dark:border-white/10">
              {rows.slice(0, 5).map((r, i) => <div key={i} className="text-[var(--ml-text-soft)] dark:text-white/60">{Object.values(r).join(" · ")}</div>)}
            </div>
            <button type="button" onClick={doImport} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-gold)] px-4 py-2 text-sm font-black text-[var(--ml-blue)] hover:bg-[var(--ml-gold-light)] disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Importer
            </button>
          </>
        )}
        {report && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Import terminé : {report.ok} réussi(s), {report.ko} échec(s).</p>}
      </div>
    </div>
  );
}
