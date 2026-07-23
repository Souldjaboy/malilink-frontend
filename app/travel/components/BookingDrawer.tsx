"use client";

import { useEffect, useState } from "react";
import { Wallet, Smartphone, CreditCard, X, Clock, Briefcase, ShieldCheck, Loader2, CheckCircle2, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { formatFCFA } from "../../lib/format";
import { formatDuration, shortTime, MODE_EMOJI, createTravelBooking, payTravelBooking, type TravelOffer, type TravelTicket } from "../lib/travelApi";

/**
 * Réservation + paiement Wallet + e-billet. Le paiement passe UNIQUEMENT par le
 * Wallet MaliLink (moteur unique). Orange Money / Wave / Carte : connecteurs
 * prêts mais désactivés (aucun paiement réel simulé).
 */
export default function BookingDrawer({
  offer, adults, childrenCount, travelDate, onClose,
}: {
  offer: TravelOffer | null;
  adults: number;
  childrenCount: number;
  travelDate: string;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"form" | "paying" | "done">("form");
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<TravelTicket | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (offer) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [offer, onClose]);

  useEffect(() => { setStep("form"); setError(""); setTicket(null); }, [offer]);

  if (!offer) return null;
  const passengers = adults + childrenCount;

  const reserveAndPay = async () => {
    if (!firstName.trim()) { setError("Nom du voyageur obligatoire."); return; }
    setStep("paying"); setError("");
    try {
      const booking = await createTravelBooking({
        route_id: offer.route_id, schedule_id: offer.schedule_id, travel_date: travelDate,
        seat_class: offer.seat_class, adults, children: childrenCount,
        passengers: [{ first_name: firstName, last_name: lastName, phone }],
      });
      const paid = await payTravelBooking(booking.reference);
      setTicket(paid.ticket);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paiement impossible.");
      setStep("form");
    }
  };

  const downloadTicket = () => {
    if (!ticket) return;
    const txt = `MaliLink Voyage — Billet\n\nCompagnie : ${offer.company.name}\nTrajet : ${offer.origin_city} → ${offer.destination_city}\nDate : ${travelDate}\nDépart : ${shortTime(offer.departure_time)}\nBillet : ${ticket.ticket_number}\nCode : ${ticket.verification_code}\nMontant : ${offer.total} ${offer.currency}\n\nPrésentez le QR code ou le code à l'embarquement.`;
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `billet-${ticket.ticket_number}.txt`; a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Réservation">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl dark:bg-[#0d1730]">
        <div className="relative bg-gradient-to-br from-[var(--ml-blue)] to-[var(--ml-blue-2)] px-6 pb-6 pt-5 text-white">
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400">
            <X className="h-5 w-5" />
          </button>
          <span className="text-4xl" aria-hidden="true">{MODE_EMOJI[offer.mode_code] || "✈️"}</span>
          <h2 className="mt-2 text-xl font-black" style={{ color: "#fff" }}>{offer.company.name}</h2>
          <p className="text-sm text-white/70">{offer.origin_city} → {offer.destination_city} · {travelDate}</p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div><div className="text-lg font-black tabular-nums">{shortTime(offer.departure_time)}</div><div className="text-[11px] text-white/60">Départ</div></div>
            <div className="flex flex-col items-center text-white/60"><Clock className="h-4 w-4" aria-hidden="true" /><span className="text-[11px]">{formatDuration(offer.duration_minutes)}</span></div>
            <div><div className="text-lg font-black tabular-nums">{shortTime(offer.arrival_time)}</div><div className="text-[11px] text-white/60">Arrivée</div></div>
          </div>
        </div>

        <div className="flex-1 space-y-5 px-6 py-5">
          {step === "done" && ticket ? (
            <section className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-2 text-lg font-black text-[var(--ml-blue)] dark:text-white">Billet confirmé</h3>
              <p className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">Payé via le Wallet MaliLink.</p>
              <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-4 shadow ring-1 ring-[var(--ml-border)]">
                <QRCodeCanvas value={ticket.qr_payload} size={168} level="M" />
              </div>
              <p className="mt-3 text-xs uppercase tracking-wide text-[var(--ml-text-soft)] dark:text-white/50">Code de secours</p>
              <p className="font-mono text-lg font-black text-[var(--ml-blue)] dark:text-yellow-400">{ticket.verification_code}</p>
              <p className="mt-1 text-xs text-[var(--ml-text-soft)] dark:text-white/40">Billet {ticket.ticket_number}</p>
              <button type="button" onClick={downloadTicket} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--ml-blue)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--ml-blue-2)]">
                <Download className="h-4 w-4" /> Télécharger le billet
              </button>
            </section>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Voyageur principal</h3>
                <div className="space-y-2">
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom / Nom" aria-label="Prénom" className="w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] dark:border-white/10 dark:bg-white/5 dark:text-white" />
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom de famille" aria-label="Nom" className="w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] dark:border-white/10 dark:bg-white/5 dark:text-white" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" aria-label="Téléphone" className="w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] dark:border-white/10 dark:bg-white/5 dark:text-white" />
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-[var(--ml-text-soft)] dark:text-white/70">
                  <li className="flex items-center gap-2"><Briefcase className="h-4 w-4" aria-hidden="true" /> Bagages inclus : {offer.baggage_included_kg || 0} kg</li>
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> {passengers} voyageur{passengers > 1 ? "s" : ""} · classe {offer.seat_class}</li>
                </ul>
              </section>

              <section className="rounded-xl border border-[var(--ml-border)] bg-[var(--ml-soft)] p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between text-sm text-[var(--ml-text-soft)] dark:text-white/60"><span>Sous-total</span><span className="tabular-nums">{formatFCFA(offer.subtotal)}</span></div>
                {offer.discount > 0 && <div className="mt-1 flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400"><span>Réduction</span><span className="tabular-nums">- {formatFCFA(offer.discount)}</span></div>}
                <div className="mt-2 flex items-center justify-between border-t border-[var(--ml-border)] pt-2 dark:border-white/10"><span className="font-bold text-[var(--ml-blue)] dark:text-white">Total</span><span className="text-lg font-black text-[var(--ml-gold-deep)] dark:text-yellow-400">{formatFCFA(offer.total)}</span></div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Paiement</h3>
                <div className="flex w-full items-center gap-3 rounded-xl border-2 border-[var(--ml-blue)] bg-[var(--ml-blue)]/5 px-4 py-3 dark:border-yellow-400/40 dark:bg-white/5">
                  <Wallet className="h-5 w-5 text-[var(--ml-blue)] dark:text-yellow-400" aria-hidden="true" />
                  <span className="flex-1"><span className="block text-sm font-bold text-[var(--ml-blue)] dark:text-white">Wallet MaliLink</span><span className="block text-xs text-[var(--ml-text-soft)] dark:text-white/50">Moteur financier unique</span></span>
                  <span className="rounded-full bg-[var(--ml-blue)] px-2 py-0.5 text-[10px] font-bold text-white">Actif</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ml-text-soft)] dark:text-white/40">Bientôt disponibles</p>
                <div className="mt-1 space-y-2 opacity-60">
                  {[{ icon: Smartphone, label: "Orange Money" }, { icon: Smartphone, label: "Wave" }, { icon: CreditCard, label: "Carte bancaire" }].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-[var(--ml-border)] px-4 py-2.5 dark:border-white/10"><Icon className="h-4 w-4 text-[var(--ml-text-soft)] dark:text-white/50" aria-hidden="true" /><span className="text-sm text-[var(--ml-text-soft)] dark:text-white/60">{label}</span></div>
                  ))}
                </div>
              </section>
              {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
            </>
          )}
        </div>

        {step !== "done" && (
          <div className="border-t border-[var(--ml-border)] bg-white p-4 dark:border-white/10 dark:bg-[#0d1730]">
            <button type="button" onClick={reserveAndPay} disabled={step === "paying"} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ml-gold)] px-5 py-3 text-sm font-black text-[var(--ml-blue)] transition hover:bg-[var(--ml-gold-light)] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-blue)]">
              {step === "paying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Paiement…</> : <>Payer {formatFCFA(offer.total)} avec le Wallet</>}
            </button>
            <p className="mt-2 text-center text-[11px] text-[var(--ml-text-soft)] dark:text-white/50">Connexion requise. Le billet est émis après confirmation du paiement.</p>
          </div>
        )}
      </div>
    </div>
  );
}
