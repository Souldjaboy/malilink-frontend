"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Eye, EyeOff, Lock, RotateCw, ShieldCheck, Unlock } from "lucide-react";
import { authFetch } from "../lib/api";

type Card = {
  id: number;
  wallet_number: string;
  masked_number: string;
  card_type: string;
  template: string;
  holder_name: string;
  company_name?: string;
  status: string;
  valid_until?: string;
  currency: string;
  label: string;
};

/* Dégradés selon le modèle — identité MaliLink bleu nuit + or. */
const TEMPLATES: Record<string, string> = {
  navy_gold: "linear-gradient(135deg, #0f1b3d 0%, #16264f 55%, #0a1330 100%)",
  black_gold: "linear-gradient(135deg, #111111 0%, #2a2a2a 55%, #000000 100%)",
  bogolan: "linear-gradient(135deg, #0f1b3d 0%, #1a3a6b 50%, #0f1b3d 100%)",
  entreprise: "linear-gradient(135deg, #0a1330 0%, #b3862e 130%)",
};

export default function WalletCard({ card, onChanged }: { card: Card; onChanged?: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [securityCode, setSecurityCode] = useState<string | null>(null);
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const gradient = TEMPLATES[card.template] || TEMPLATES.navy_gold;
  const blocked = card.status === "blocked";

  const reveal = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await authFetch("/wallet/card/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error || "Erreur.");
      } else {
        setRevealed(data.card_number);
        setSecurityCode(data.security_code);
        setAskPassword(false);
        setPassword("");
        // Le code dynamique disparaît après son expiration.
        setTimeout(() => setSecurityCode(null), (data.security_code_expires_in || 60) * 1000);
      }
    } catch {
      setMessage("Erreur réseau.");
    }
    setBusy(false);
  };

  const toggleBlock = async () => {
    setBusy(true);
    const response = await authFetch("/wallet/card/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block: !blocked }),
    }).catch(() => null);
    if (response?.ok) onChanged?.();
    setBusy(false);
  };

  const requestPhysical = async () => {
    setBusy(true);
    const response = await authFetch("/wallet/card/physical-request", { method: "POST" }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setMessage(data?.message || "Demande enregistrée.");
    setBusy(false);
  };

  const copyNumber = () => {
    navigator.clipboard?.writeText((revealed || card.masked_number).replace(/[•\s]/g, revealed ? "" : "•")).catch(() => {});
    setMessage("Numéro copié.");
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div>
      {/* Carte (recto/verso) */}
      <div className="relative mx-auto" style={{ perspective: 1200, maxWidth: 380 }}>
        <div
          className="relative w-full transition-transform duration-500"
          style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none", aspectRatio: "1.586 / 1" }}
        >
          {/* RECTO */}
          <div
            className="absolute inset-0 flex flex-col justify-between rounded-2xl p-4 text-white shadow-xl"
            style={{ background: gradient, backfaceVisibility: "hidden" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <img src="/brands/malilink-logo-officiel.jpg" alt="MaliLink" className="h-9 w-9 rounded-lg object-cover" />
                <div>
                  <p className="text-xs font-black leading-tight">MaliLink</p>
                  <p className="text-[9px] text-white/70">Virtual Wallet Card</p>
                </div>
              </div>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--ml-gold,#e8c464)]">
                {card.card_type}
              </span>
            </div>

            <div>
              <p className="font-mono text-lg tracking-widest text-white">
                {revealed || card.masked_number}
              </p>
              {securityCode && (
                <p className="mt-0.5 text-[10px] text-[var(--ml-gold,#e8c464)]">
                  Code sécurité interne : <span className="font-mono font-black">{securityCode}</span> (60s)
                </p>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[8px] uppercase text-white/50">Titulaire</p>
                <p className="text-sm font-bold">{card.holder_name}</p>
                {card.company_name ? <p className="text-[9px] text-white/70">{card.company_name}</p> : null}
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase text-white/50">Expire</p>
                <p className="text-xs font-bold">
                  {card.valid_until ? new Date(card.valid_until).toLocaleDateString("fr-FR", { month: "2-digit", year: "2-digit" }) : "—"}
                </p>
                <p className="mt-0.5 text-[9px] font-black text-[var(--ml-gold,#e8c464)]">FCFA</p>
              </div>
            </div>

            {blocked && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/55 font-black text-red-300">
                <Lock size={16} className="mr-1.5" /> CARTE BLOQUÉE
              </div>
            )}
          </div>

          {/* VERSO */}
          <div
            className="absolute inset-0 flex flex-col justify-between rounded-2xl p-4 text-white shadow-xl"
            style={{ background: gradient, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="mt-2 h-7 w-full rounded bg-black/60" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] uppercase text-white/50">Identifiant Wallet</p>
                <p className="font-mono text-xs font-bold">{card.wallet_number}</p>
                <p className="mt-2 flex items-center gap-1 text-[9px] text-white/70">
                  <ShieldCheck size={11} /> Carte interne MaliLink — circuit fermé
                </p>
              </div>
              <div className="rounded bg-white p-1">
                <QRCodeCanvas value={card.wallet_number || "MLW"} size={56} />
              </div>
            </div>
            <p className="text-[8px] text-white/40">
              Ce n&apos;est pas une carte bancaire. Utilisable uniquement dans l&apos;écosystème MaliLink.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
        <button onClick={() => setFlipped((v) => !v)} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-bold text-gray-700 shadow-sm">
          <RotateCw size={15} /> Retourner
        </button>
        {revealed ? (
          <button onClick={() => { setRevealed(null); setSecurityCode(null); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-bold text-gray-700 shadow-sm">
            <EyeOff size={15} /> Masquer
          </button>
        ) : (
          <button onClick={() => setAskPassword(true)} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-bold text-gray-700 shadow-sm">
            <Eye size={15} /> Afficher
          </button>
        )}
        <button onClick={copyNumber} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-bold text-gray-700 shadow-sm">
          <Copy size={15} /> Copier
        </button>
        <button onClick={toggleBlock} disabled={busy} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold shadow-sm ${blocked ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {blocked ? <Unlock size={15} /> : <Lock size={15} />} {blocked ? "Débloquer" : "Bloquer"}
        </button>
      </div>

      <div className="mx-auto mt-2 max-w-md">
        <button onClick={requestPhysical} disabled={busy} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-500">
          Demander une carte physique — <span className="text-gray-400">service non activé</span>
        </button>
      </div>

      {message && <p className="mt-2 text-center text-sm font-bold text-gray-600">{message}</p>}

      {/* Ré-authentification pour révéler le numéro */}
      {askPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAskPassword(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-black text-black">Afficher le numéro complet</p>
            <p className="mt-1 text-sm text-gray-500">Confirmez votre identité avec votre mot de passe.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && reveal()}
              placeholder="Mot de passe"
              className="mt-3 w-full rounded-xl border border-gray-200 p-3 text-black"
              autoFocus
            />
            {message && <p className="mt-2 text-sm font-bold text-red-600">{message}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={reveal} disabled={busy || !password} className="flex-1 rounded-xl bg-yellow-500 py-3 font-black text-black disabled:opacity-50">
                {busy ? "Vérification..." : "Afficher"}
              </button>
              <button onClick={() => setAskPassword(false)} className="rounded-xl bg-gray-100 px-4 py-3 font-bold text-gray-500">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
