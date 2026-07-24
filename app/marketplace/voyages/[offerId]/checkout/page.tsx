"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2, Download, Wallet, Smartphone, CreditCard } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { formatFCFA } from "../../../../lib/format";
import { getAuthToken } from "../../../../lib/api";
import {
  fetchOfferDetail, createTravelBooking, payTravelBooking, shortTime,
  type OfferDetail, type TravelTicket,
} from "../../../../travel/lib/travelApi";

const input = "w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] focus:ring-2 focus:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5 dark:text-white";
const label = "mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function CheckoutPage() {
  const params = useParams();
  const offerId = String(params.offerId || "");
  const [data, setData] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleId, setScheduleId] = useState<number | "">("");
  const [travelDate, setTravelDate] = useState(todayISO());
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"form" | "paying" | "done">("form");
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<TravelTicket | null>(null);

  useEffect(() => {
    if (!offerId) return;
    fetchOfferDetail(offerId).then((d) => {
      setData(d);
      if (d.departures[0]) setScheduleId(d.departures[0].schedule_id);
    }).catch((e) => setError(e instanceof Error ? e.message : "Offre introuvable.")).finally(() => setLoading(false));
  }, [offerId]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[var(--ml-soft)] dark:bg-[#0a0f22]"><Loader2 className="h-8 w-8 animate-spin text-[var(--ml-blue)] dark:text-yellow-400" /></div>;
  if (!data) return <div className="min-h-screen bg-[var(--ml-soft)] p-8 text-center dark:bg-[#0a0f22]"><p className="text-[var(--ml-blue)] dark:text-white">{error || "Offre introuvable."}</p></div>;

  const { route, departures } = data;
  const dep = departures.find((d) => d.schedule_id === scheduleId) || departures[0];
  const unit = dep?.base_price ?? data.offer.price ?? 0;
  const childUnit = dep?.child_price ?? unit;
  const total = Number(unit) * adults + Number(childUnit) * children;

  const submit = async () => {
    if (!getAuthToken()) { window.location.href = `/client/login?redirect=/marketplace/voyages/${offerId}/checkout`; return; }
    if (!firstName.trim() || !phone.trim()) { setError("Nom et téléphone du voyageur obligatoires."); return; }
    if (!scheduleId) { setError("Choisissez un départ."); return; }
    setStep("paying"); setError("");
    try {
      const booking = await createTravelBooking({
        route_id: route.id, schedule_id: Number(scheduleId), travel_date: travelDate,
        adults, children, passengers: [{ first_name: firstName, last_name: lastName, phone, email }],
      });
      const paid = await payTravelBooking(booking.reference);
      setTicket(paid.ticket); setStep("done");
    } catch (e) { setError(e instanceof Error ? e.message : "Paiement impossible."); setStep("form"); }
  };

  const downloadTicket = () => {
    if (!ticket) return;
    const txt = `MaliLink Voyage — Billet\n\nCompagnie : ${route.company_name}\nTrajet : ${route.origin} → ${route.destination}\nDate : ${travelDate}\nDépart : ${shortTime(dep?.departure_time)}\nVoyageur : ${firstName} ${lastName}\nBillet : ${ticket.ticket_number}\nCode : ${ticket.verification_code}\nMontant : ${formatFCFA(total)}\n\nPrésentez le QR code ou le code à l'embarquement.`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" })); a.download = `billet-${ticket.ticket_number}.txt`; a.click();
  };

  if (step === "done" && ticket) {
    return (
      <div className="min-h-screen bg-[var(--ml-soft)] px-4 pt-10 dark:bg-[#0a0f22]">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--ml-border)] bg-white p-6 text-center shadow dark:border-white/10 dark:bg-white/5">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-3 text-xl font-black text-[var(--ml-blue)] dark:text-white">Billet confirmé</h1>
          <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">{route.origin} → {route.destination} · {travelDate}</p>
          <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-4 ring-1 ring-[var(--ml-border)]"><QRCodeCanvas value={ticket.qr_payload} size={176} level="M" /></div>
          <p className="mt-3 text-xs uppercase tracking-wide text-[var(--ml-text-soft)] dark:text-white/50">Code de réservation</p>
          <p className="font-mono text-lg font-black text-[var(--ml-blue)] dark:text-yellow-400">{ticket.verification_code}</p>
          <p className="text-xs text-[var(--ml-text-soft)] dark:text-white/40">Billet {ticket.ticket_number}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={downloadTicket} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ml-blue)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--ml-blue-2)]"><Download className="h-4 w-4" /> Télécharger</button>
            <Link href="/travel/mes-voyages" className="inline-flex items-center gap-2 rounded-xl border border-[var(--ml-border)] px-4 py-2.5 text-sm font-bold text-[var(--ml-blue)] dark:border-white/10 dark:text-white">Mes billets</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ml-soft)] px-4 pb-16 pt-6 dark:bg-[#0a0f22] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href={`/marketplace/voyages/${offerId}`} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ml-blue)] hover:underline dark:text-white/80"><ArrowLeft className="h-4 w-4" /> Retour à l&apos;offre</Link>
        <h1 className="text-2xl font-black text-[var(--ml-blue)] dark:text-white">Réservation — {route.origin} → {route.destination}</h1>
        <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">{route.company_name}</p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {/* Départ */}
            <section className="rounded-2xl border border-[var(--ml-border)] bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="mb-3 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Départ</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="dep">Horaire de départ</label>
                  <select id="dep" className={input} value={scheduleId} onChange={(e) => setScheduleId(Number(e.target.value))}>
                    {departures.map((d) => <option key={d.schedule_id} value={d.schedule_id}>{shortTime(d.departure_time)} → {shortTime(d.arrival_time)} ({Math.max(0, Number(d.seats_available))} places)</option>)}
                  </select>
                </div>
                <div><label className={label} htmlFor="date">Date du voyage</label>
                  <input id="date" type="date" min={todayISO()} className={input} value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
                </div>
                <div><label className={label} htmlFor="adults">Nombre d&apos;adultes</label>
                  <input id="adults" type="number" min={1} max={9} className={input} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))} />
                </div>
                <div><label className={label} htmlFor="children">Nombre d&apos;enfants</label>
                  <input id="children" type="number" min={0} max={9} className={input} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))} />
                </div>
              </div>
            </section>

            {/* Voyageur */}
            <section className="rounded-2xl border border-[var(--ml-border)] bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="mb-3 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Personne qui réserve</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="fn">Prénom</label><input id="fn" className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ex. Awa" /></div>
                <div><label className={label} htmlFor="ln">Nom</label><input id="ln" className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ex. Traoré" /></div>
                <div><label className={label} htmlFor="ph">Téléphone</label><input id="ph" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex. +223 70 00 00 00" /></div>
                <div><label className={label} htmlFor="em">E-mail (facultatif)</label><input id="em" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex. awa@exemple.ml" /></div>
              </div>
            </section>

            {/* Paiement */}
            <section className="rounded-2xl border border-[var(--ml-border)] bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="mb-3 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Moyen de paiement</h2>
              <div className="flex items-center gap-3 rounded-xl border-2 border-[var(--ml-blue)] bg-[var(--ml-blue)]/5 px-4 py-3 dark:border-yellow-400/40 dark:bg-white/5">
                <Wallet className="h-5 w-5 text-[var(--ml-blue)] dark:text-yellow-400" />
                <span className="flex-1 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Wallet MaliLink</span>
                <span className="rounded-full bg-[var(--ml-blue)] px-2 py-0.5 text-[10px] font-bold text-white">Actif</span>
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ml-text-soft)] dark:text-white/40">Bientôt disponibles</p>
              <div className="mt-1 space-y-2 opacity-60">
                {[{ i: Smartphone, l: "Orange Money" }, { i: Smartphone, l: "Wave" }, { i: CreditCard, l: "Carte bancaire" }].map(({ i: Icon, l }) => (
                  <div key={l} className="flex items-center gap-3 rounded-xl border border-[var(--ml-border)] px-4 py-2.5 dark:border-white/10"><Icon className="h-4 w-4 text-[var(--ml-text-soft)]" /><span className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">{l}</span></div>
                ))}
              </div>
            </section>
            {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
          </div>

          {/* Résumé */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-[var(--ml-border)] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <h2 className="mb-3 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Résumé</h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-[var(--ml-text-soft)] dark:text-white/60">Trajet</dt><dd className="text-[var(--ml-text)] dark:text-white">{route.origin} → {route.destination}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--ml-text-soft)] dark:text-white/60">Date</dt><dd className="text-[var(--ml-text)] dark:text-white">{travelDate}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--ml-text-soft)] dark:text-white/60">Heure de départ</dt><dd className="text-[var(--ml-text)] dark:text-white">{shortTime(dep?.departure_time)}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--ml-text-soft)] dark:text-white/60">Voyageurs</dt><dd className="text-[var(--ml-text)] dark:text-white">{adults} adulte(s), {children} enfant(s)</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--ml-text-soft)] dark:text-white/60">Prix unitaire</dt><dd className="tabular-nums text-[var(--ml-text)] dark:text-white">{formatFCFA(unit)}</dd></div>
              </dl>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--ml-border)] pt-3 dark:border-white/10">
                <span className="font-bold text-[var(--ml-blue)] dark:text-white">Montant total</span>
                <span className="text-lg font-black text-[var(--ml-gold-deep)] dark:text-yellow-400">{formatFCFA(total)}</span>
              </div>
              <button type="button" onClick={submit} disabled={step === "paying"} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ml-gold)] px-5 py-3 text-sm font-black text-[var(--ml-blue)] transition hover:bg-[var(--ml-gold-light)] disabled:opacity-60">
                {step === "paying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Paiement…</> : <>Payer {formatFCFA(total)}</>}
              </button>
              <p className="mt-2 text-center text-[11px] text-[var(--ml-text-soft)] dark:text-white/50">Le billet est émis après confirmation du paiement.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
