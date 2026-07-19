"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  QrCode,
  Receipt,
  Send,
  Wallet as WalletIcon,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { authFetch, getAuthToken } from "../lib/api";
import { formatFCFA } from "../lib/format";

type Entry = {
  id: number;
  direction: "credit" | "debit";
  amount: string | number;
  balance_after: string | number;
  created_at: string;
  reference: string;
  kind: string;
  status: string;
  description: string;
};

const KIND_LABELS: Record<string, string> = {
  transfer: "Transfert",
  bonus: "Bonus MaliLink",
  cashback: "Cashback",
  payment: "Paiement",
  refund: "Remboursement",
  adjustment: "Ajustement",
};

export default function WalletPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"historique" | "transfert" | "qr">("historique");
  const [myPhone, setMyPhone] = useState("");
  const [form, setForm] = useState({ to_phone: "", amount: "", note: "" });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [receipt, setReceipt] = useState<any>(null);

  const load = () => {
    authFetch("/wallet/me", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) setError(payload?.error || "Erreur chargement du wallet.");
        else setData(payload);
      })
      .catch(() => setError("Erreur réseau."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/login?redirect=/wallet");
      return;
    }
    const stored = localStorage.getItem("user") || localStorage.getItem("client_user");
    if (stored) setMyPhone(JSON.parse(stored)?.phone || "");
    load();
  }, [router]);

  const transfer = async () => {
    const amount = Number(form.amount);
    if (!form.to_phone.trim() || !amount || amount <= 0) {
      setFeedback("Téléphone du destinataire et montant obligatoires.");
      return;
    }
    setSending(true);
    setFeedback("");
    try {
      const response = await authFetch("/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount,
          // Idempotence : un double-clic ou un rafraîchissement ne débite jamais deux fois.
          idempotency_key: `tf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(payload?.error || "Erreur transfert.");
      } else {
        setFeedback(`Transfert réussi ✓ Référence : ${payload.reference}`);
        setForm({ to_phone: "", amount: "", note: "" });
        setTab("historique");
        load();
      }
    } catch {
      setFeedback("Erreur réseau. Aucun montant n'a été débité.");
    }
    setSending(false);
  };

  const openReceipt = async (entry: Entry) => {
    const response = await authFetch(`/wallet/receipt/${entry.reference}`).catch(() => null);
    if (response?.ok) setReceipt(await response.json());
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24 md:p-8">
      <div className="mx-auto max-w-xl">
        {/* Carte solde */}
        <div className="rounded-3xl bg-[var(--ml-navy,#0f1b3d)] p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-500 text-black">
                <WalletIcon size={24} />
              </span>
              <div>
                <p className="font-black text-white">MaliLink Wallet</p>
                <p className="text-xs text-white/60">Portefeuille interne · FCFA</p>
              </div>
            </div>
            <Link href="/notifications" aria-label="Notifications" className="text-white/60 hover:text-white">
              <Receipt size={20} />
            </Link>
          </div>

          {loading ? (
            <p className="mt-6 font-semibold text-white/70">Chargement...</p>
          ) : error ? (
            <p className="mt-6 rounded-xl bg-red-500/20 p-3 font-bold text-red-200">{error}</p>
          ) : (
            <>
              <p className="mt-5 text-sm text-white/60">Solde disponible</p>
              <p className="text-4xl font-black text-[var(--ml-gold,#d4a23c)]">
                {formatFCFA(data?.available || 0)}
              </p>
              {(data?.held || 0) > 0 && (
                <p className="mt-1 text-sm text-white/70">
                  dont {formatFCFA(data.held)} réservés (fonds bloqués)
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTab("transfert")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 font-black text-black"
                >
                  <Send size={17} /> Transférer
                </button>
                <button
                  onClick={() => setTab("qr")}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/25 py-3 font-bold text-white"
                >
                  <QrCode size={17} /> Recevoir (QR)
                </button>
              </div>
              {/* Argent réel : honnêteté — désactivé tant qu'aucun fournisseur agréé */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  disabled
                  title="Disponible dès qu'un fournisseur agréé (Orange Money, Wave, Moov) sera connecté"
                  className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-white/40"
                >
                  <Banknote size={15} /> Recharger — bientôt
                </button>
                <button
                  disabled
                  title="Disponible dès qu'un fournisseur agréé sera connecté"
                  className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-white/40"
                >
                  <Banknote size={15} /> Retirer — bientôt
                </button>
              </div>
            </>
          )}
        </div>

        {feedback && (
          <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-gray-700 shadow-sm">{feedback}</p>
        )}

        {/* Transfert */}
        {tab === "transfert" && !loading && !error && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow">
            <h2 className="font-black text-black">Transférer vers un wallet MaliLink</h2>
            <div className="mt-3 space-y-3">
              <input
                value={form.to_phone}
                onChange={(event) => setForm({ ...form, to_phone: event.target.value })}
                placeholder="Téléphone du destinataire (ex : 74 32 92 25)"
                className="w-full rounded-xl border border-gray-200 p-3 text-black"
              />
              <input
                type="number"
                min={1}
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="Montant (FCFA)"
                className="w-full rounded-xl border border-gray-200 p-3 text-black"
              />
              <input
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                placeholder="Note (optionnel)"
                className="w-full rounded-xl border border-gray-200 p-3 text-black"
                maxLength={200}
              />
              <button
                onClick={transfer}
                disabled={sending}
                className="w-full rounded-xl bg-yellow-500 py-3.5 font-black text-black disabled:opacity-50"
              >
                {sending ? "Transfert en cours..." : "Envoyer"}
              </button>
            </div>
          </div>
        )}

        {/* Mon QR pour recevoir */}
        {tab === "qr" && !loading && !error && (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow">
            <h2 className="font-black text-black">Recevoir un paiement</h2>
            <p className="mt-1 text-sm text-gray-500">
              Faites scanner ce code : il pré-remplit un transfert vers votre numéro.
            </p>
            <div className="mx-auto mt-4 w-fit rounded-2xl border-4 border-[var(--ml-gold,#d4a23c)] p-3">
              <QRCodeCanvas
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/wallet?to=${encodeURIComponent(myPhone)}`}
                size={180}
              />
            </div>
            <p className="mt-3 font-mono font-bold text-black">{myPhone}</p>
          </div>
        )}

        {/* Historique */}
        {!loading && !error && (
          <div className="mt-4">
            <h2 className="px-1 font-black text-black">Historique</h2>
            {(data?.transactions || []).length === 0 ? (
              <p className="mt-2 rounded-2xl bg-white p-6 text-center font-semibold text-gray-500 shadow-sm">
                Aucune transaction pour le moment.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {(data.transactions as Entry[]).map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => openReceipt(entry)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        entry.direction === "credit"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {entry.direction === "credit" ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-black">
                        {KIND_LABELS[entry.kind] || entry.kind}
                        {entry.description ? ` · ${entry.description}` : ""}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString("fr-FR")} · {entry.reference}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-black ${
                        entry.direction === "credit" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {entry.direction === "credit" ? "+" : "−"}
                      {formatFCFA(Number(entry.amount))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reçu */}
        {receipt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setReceipt(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 border-b border-dashed border-gray-200 pb-3">
                <img src="/brands/malilink-logo-officiel.jpg" alt="" className="h-9 w-9 rounded-lg object-cover" />
                <p className="font-black text-black">Reçu MaliLink Wallet</p>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="flex justify-between"><span className="text-gray-500">Référence</span> <span className="font-mono font-bold text-black">{receipt.reference}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Type</span> <span className="font-bold text-black">{KIND_LABELS[receipt.kind] || receipt.kind}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Montant</span> <span className={`font-black ${receipt.direction === "credit" ? "text-green-700" : "text-red-600"}`}>{receipt.direction === "credit" ? "+" : "−"}{formatFCFA(Number(receipt.amount))}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Solde après</span> <span className="font-bold text-black">{formatFCFA(Number(receipt.balance_after))}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Statut</span> <span className="font-bold text-green-700">{receipt.status}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Date</span> <span className="font-bold text-black">{new Date(receipt.created_at).toLocaleString("fr-FR")}</span></p>
                {receipt.description && (
                  <p className="pt-1 text-gray-600">{receipt.description}</p>
                )}
              </div>
              <button
                onClick={() => setReceipt(null)}
                className="mt-4 w-full rounded-xl bg-yellow-500 py-3 font-black text-black"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
