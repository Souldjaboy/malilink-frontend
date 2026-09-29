"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Boxes, ClipboardPen, LayoutDashboard, Pill, ShoppingCart, Users } from "lucide-react";
import { authFetch } from "../lib/api";
import { useLocale } from "../i18n/LocaleProvider";

type Mode = "dashboard" | "medicines" | "batches" | "patients" | "prescriptions" | "pos";
type Row = Record<string, unknown>;
const nav = [
  ["/pharmacie", "pharmacy.dashboard", LayoutDashboard], ["/pharmacie/medicaments", "pharmacy.medicines", Pill],
  ["/pharmacie/lots", "pharmacy.lots", Boxes], ["/pharmacie/patients", "pharmacy.patients", Users],
  ["/pharmacie/ordonnances", "pharmacy.prescriptions", ClipboardPen], ["/pharmacie/pos", "pharmacy.pos", ShoppingCart],
] as const;

async function json(path: string, init?: RequestInit) {
  const response = await authFetch(path, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erreur serveur.");
  return data;
}

export default function PharmacyModule({ mode }: { mode: Mode }) {
  const { t } = useLocale();
  const [data, setData] = useState<any>(mode === "dashboard" ? null : []);
  const [medicines, setMedicines] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      const path = mode === "dashboard" ? "/pharmacy/dashboard" : mode === "medicines" ? "/pharmacy/medicines" : mode === "batches" ? "/pharmacy/batches" : mode === "patients" ? "/pharmacy/patients" : mode === "prescriptions" ? "/pharmacy/prescriptions" : "/pharmacy/medicines";
      setData(await json(path));
      if (["batches", "prescriptions", "pos"].includes(mode)) setMedicines(await json("/pharmacy/medicines"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erreur de chargement."); }
    finally { setLoading(false); }
  }, [mode]);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget); const body = Object.fromEntries(form.entries());
    try { await json(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); event.currentTarget.reset(); setMessage("Enregistré avec succès."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible."); }
  }

  const rows = Array.isArray(data) ? data : [];
  return <main className="min-h-screen bg-slate-100 p-3 text-slate-900 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="rounded-3xl bg-emerald-950 p-6 text-white shadow-xl"><p className="font-bold text-emerald-300">MaliLink</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">{t("pharmacy.title")}</h1><p className="mt-2 text-emerald-100">Lots traçables, FEFO et données patients protégées par les droits MaliLink.</p></header>
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Navigation pharmacie">{nav.map(([href,key,Icon]) => <Link key={href} href={href} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold shadow"><Icon className="h-4 w-4" />{t(key)}</Link>)}</nav>
      {message && <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 font-semibold">{message}</p>}
      {loading ? <p className="mt-8">{t("common.loading")}</p> : <section className="mt-5">
        {mode === "dashboard" && data && <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[
          ["CA du jour", data.sales_today?.revenue], ["Tickets", data.sales_today?.tickets], ["Médicaments", data.stock?.medicines], ["Stock faible", data.stock?.low_stock], ["Périmés", data.expiry?.expired], ["Péremption ≤ 90 j", data.expiry?.expiring], ["Ordonnances en attente", data.prescriptions?.pending], ["Patients", data.patients?.total]
        ].map(([label,value]) => <article key={String(label)} className="rounded-2xl bg-white p-4 shadow"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{String(value ?? 0)}</p></article>)}</div>}
        {mode === "medicines" && <><DataTable rows={rows} columns={["name","generic_name","dosage","dosage_form","sale_price","batch_stock"]} /><EntryForm title="Ajouter un médicament" onSubmit={(e)=>submit(e,"/pharmacy/medicines")} fields={["name","generic_name","dosage","dosage_form","packaging","barcode","purchase_price","sale_price","minimum_stock"]} /></>}
        {mode === "batches" && <><DataTable rows={rows} columns={["product_name","lot_number","quantity_remaining","expiration_date","status","site_name"]} /><form onSubmit={(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);void submit(e,`/pharmacy/medicines/${f.get("product_id")}/batches`);}} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow sm:grid-cols-2"><h2 className="text-xl font-black sm:col-span-2">Réceptionner un lot</h2><select name="product_id" required className="rounded-xl border p-3"><option value="">Médicament</option>{medicines.map((m)=><option key={String(m.id)} value={String(m.id)}>{String(m.name)}</option>)}</select>{["lot_number","quantity","manufacturing_date","expiration_date","purchase_price","sale_price"].map((f)=><input key={f} name={f} type={f.includes("date")?"date":f.includes("price")||f==="quantity"?"number":"text"} step="any" required={["lot_number","quantity","expiration_date"].includes(f)} placeholder={f} className="rounded-xl border p-3"/>)}<button className="rounded-xl bg-emerald-700 p-3 font-bold text-white">Enregistrer le lot</button></form></>}
        {mode === "patients" && <><DataTable rows={rows} columns={["patient_number","fullname","phone","birth_date"]} /><EntryForm title="Ajouter un patient" onSubmit={(e)=>submit(e,"/pharmacy/patients")} fields={["fullname","birth_date","phone","address","declared_allergies"]} /></>}
        {mode === "prescriptions" && <><DataTable rows={rows} columns={["reference","patient_name","prescription_date","status"]} /><form onSubmit={(e)=>submit(e,"/pharmacy/prescriptions")} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow sm:grid-cols-2"><h2 className="text-xl font-black sm:col-span-2">Enregistrer une ordonnance</h2><input name="reference" placeholder="Référence" className="rounded-xl border p-3"/><input name="prescription_date" type="date" className="rounded-xl border p-3"/><textarea name="notes" placeholder="Notes professionnelles" className="rounded-xl border p-3 sm:col-span-2"/><button className="rounded-xl bg-emerald-700 p-3 font-bold text-white">Enregistrer</button></form></>}
        {mode === "pos" && <form onSubmit={(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);void json("/pharmacy/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payment_method:f.get("payment_method"),items:[{product_id:Number(f.get("product_id")),quantity:Number(f.get("quantity"))}]})}).then((d)=>setMessage(`Vente ${d.sale.sale_number} — reçu ${d.receipt.receipt_number}. Pont comptable : ${d.accounting_bridge_status}.`)).then(load).catch((er)=>setMessage(er.message));}} className="grid gap-4 rounded-2xl bg-white p-5 shadow sm:grid-cols-2"><h2 className="text-xl font-black sm:col-span-2">Nouvelle vente FEFO</h2><select name="product_id" required className="rounded-xl border p-3"><option value="">Médicament</option>{medicines.map((m)=><option key={String(m.id)} value={String(m.id)}>{String(m.name)} — stock {String(m.batch_stock||0)}</option>)}</select><input name="quantity" type="number" min="1" required placeholder="Quantité" className="rounded-xl border p-3"/><select name="payment_method" className="rounded-xl border p-3"><option>Espèces</option><option>Mobile Money</option><option>Carte</option></select><button className="rounded-xl bg-emerald-700 p-3 font-bold text-white">Valider et créer le reçu</button></form>}
      </section>}
    </div>
  </main>;
}

function EntryForm({title,onSubmit,fields}:{title:string;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;fields:string[]}) { return <form onSubmit={onSubmit} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow sm:grid-cols-2"><h2 className="text-xl font-black sm:col-span-2">{title}</h2>{fields.map((f)=><input key={f} name={f} type={f.includes("date")?"date":f.includes("price")||f.includes("stock")?"number":"text"} required={f==="name"||f==="fullname"} placeholder={f} className="rounded-xl border p-3"/>)}<button className="rounded-xl bg-emerald-700 p-3 font-bold text-white">Enregistrer</button></form>; }
function DataTable({rows,columns}:{rows:Row[];columns:string[]}) { return <div className="overflow-x-auto rounded-2xl bg-white shadow"><table className="min-w-full text-sm"><thead className="bg-slate-900 text-white"><tr>{columns.map(c=><th key={c} className="whitespace-nowrap p-3 text-left">{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={String(r.id??i)} className="border-t">{columns.map(c=><td key={c} className="whitespace-nowrap p-3">{String(r[c]??"—")}</td>)}</tr>)}</tbody></table>{!rows.length&&<p className="p-6 text-slate-500">Aucune donnée.</p>}</div>; }
