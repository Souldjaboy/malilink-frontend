"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Printer, RefreshCw, Search, ShieldOff, UserPlus } from "lucide-react";
import { authFetch } from "../lib/api";
import { BadgeBack, BadgeFront, BADGE_TYPE_LABELS, type BadgeData } from "../components/BadgeCard";

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  expire: "Expiré",
  suspendu: "Suspendu",
  perdu: "Perdu",
  remplace: "Remplacé",
  revoque: "Révoqué",
};

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-green-100 text-green-700",
  expire: "bg-orange-100 text-orange-700",
  suspendu: "bg-yellow-100 text-yellow-800",
  perdu: "bg-red-100 text-red-700",
  remplace: "bg-gray-200 text-gray-600",
  revoque: "bg-red-100 text-red-700",
};

const PRINT_STYLES = `
.badge-preview .badge-card {
  width: 340px;
  height: 214px;
  margin: 0 auto;
}
@media print {
  body * { visibility: hidden; }
  #print-zone, #print-zone * { visibility: visible; }
  #print-zone { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
  .badge-print-pair { display: flex; gap: 6mm; margin-bottom: 6mm; page-break-inside: avoid; }
  #print-zone .badge-card {
    width: 85.6mm !important;
    height: 53.98mm !important;
    border-radius: 3mm;
    box-shadow: none;
    border: 0.2mm solid #ddd;
    overflow: hidden;
  }
}
`;

export default function BadgesPage() {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [preview, setPreview] = useState<BadgeData | null>(null);
  const [showBack, setShowBack] = useState(true);
  const [printList, setPrintList] = useState<BadgeData[]>([]);

  const load = () => {
    setLoading(true);
    authFetch("/badges", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => []);
        if (!response.ok) setMessage((data as any)?.error || "Erreur chargement des badges.");
        else setBadges(Array.isArray(data) ? data : []);
      })
      .catch(() => setMessage("Erreur réseau."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(
    () =>
      badges.filter((badge) => {
        if (statusFilter && badge.status !== statusFilter) return false;
        if (typeFilter && badge.badge_type !== typeFilter) return false;
        if (query) {
          const haystack = `${badge.fullname} ${badge.matricule} ${badge.role}`.toLowerCase();
          if (!haystack.includes(query.toLowerCase())) return false;
        }
        return true;
      }),
    [badges, statusFilter, typeFilter, query]
  );

  const toggleSelect = (id: number) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  const generateMissing = async () => {
    setMessage("");
    const response = await authFetch("/badges/generate-missing", { method: "POST" }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setMessage(data?.message || data?.error || "Erreur.");
    load();
  };

  const action = async (badge: BadgeData, path: string, body?: any) => {
    setMessage("");
    const response = await authFetch(`/badges/${badge.id}/${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setMessage(response?.ok ? "Action effectuée." : data?.error || "Erreur.");
    load();
  };

  /* Impression individuelle ou groupée : les cartes sont rendues dans
     #print-zone, seule zone visible en @media print, au format CR80. */
  const printBadges = (list: BadgeData[]) => {
    if (list.length === 0) return;
    setPrintList(list);
    setTimeout(async () => {
      window.print();
      for (const badge of list) {
        await authFetch(`/badges/${badge.id}/printed`, { method: "POST" }).catch(() => {});
      }
      load();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <style>{PRINT_STYLES}</style>
      <div className="mx-auto max-w-6xl print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-black">Gestion des badges</h1>
            <p className="mt-1 text-sm text-gray-500">
              Badges PVC (format CR80) avec QR de vérification sécurisé, statuts et journal d&apos;audit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={generateMissing}
              className="flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2.5 font-black text-black"
            >
              <UserPlus size={17} /> Générer les badges manquants
            </button>
            <button
              onClick={() => printBadges(badges.filter((badge) => selected.includes(badge.id)))}
              disabled={selected.length === 0}
              className="flex items-center gap-2 rounded-xl bg-[var(--ml-navy,#0f1b3d)] px-4 py-2.5 font-black text-white disabled:opacity-40"
            >
              <Printer size={17} /> Imprimer la sélection ({selected.length})
            </button>
          </div>
        </div>

        {message && (
          <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-gray-700 shadow-sm">{message}</p>
        )}

        {/* Filtres */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 shadow-sm">
            <Search size={17} className="shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, matricule, rôle..."
              className="w-full border-0 bg-transparent p-2.5 text-black outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl bg-white p-2.5 text-sm font-semibold text-black shadow-sm"
          >
            <option value="">Tous les types</option>
            {Object.entries(BADGE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl bg-white p-2.5 text-sm font-semibold text-black shadow-sm"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Liste */}
        {loading ? (
          <p className="mt-10 text-center font-semibold text-gray-500">Chargement des badges...</p>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow">
            <p className="font-bold text-gray-700">Aucun badge.</p>
            <p className="mt-1 text-sm text-gray-500">
              Cliquez sur « Générer les badges manquants » pour créer les badges de votre équipe.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {filtered.map((badge) => (
              <div key={badge.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(badge.id)}
                  onChange={() => toggleSelect(badge.id)}
                  className="h-5 w-5 shrink-0"
                  aria-label={`Sélectionner ${badge.fullname}`}
                />
                {badge.profile_image_url ? (
                  <img src={badge.profile_image_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ml-navy,#0f1b3d)] font-black text-white">
                    {(badge.fullname || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-black">{badge.fullname}</p>
                  <p className="truncate text-xs text-gray-500">
                    {BADGE_TYPE_LABELS[badge.badge_type]} · <span className="font-mono">{badge.matricule}</span>
                    {(badge as any).print_count ? ` · imprimé ×${(badge as any).print_count}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${STATUS_COLORS[badge.status] || "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[badge.status] || badge.status}
                </span>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => setPreview(badge)}
                    aria-label="Aperçu"
                    title="Aperçu"
                    className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-yellow-100"
                  >
                    <BadgeCheck size={17} />
                  </button>
                  <button
                    onClick={() => printBadges([badge])}
                    aria-label="Imprimer"
                    title="Imprimer / PDF"
                    className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-yellow-100"
                  >
                    <Printer size={17} />
                  </button>
                  <button
                    onClick={() => action(badge, "replace")}
                    aria-label="Remplacer (perte)"
                    title="Remplacer (perte/vol) — l'ancien QR devient invalide"
                    className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-yellow-100"
                  >
                    <RefreshCw size={17} />
                  </button>
                  {badge.status === "actif" ? (
                    <button
                      onClick={() => action(badge, "status", { status: "revoque" })}
                      aria-label="Révoquer"
                      title="Révoquer"
                      className="rounded-lg bg-gray-100 p-2 text-red-500 hover:bg-red-50"
                    >
                      <ShieldOff size={17} />
                    </button>
                  ) : (
                    <button
                      onClick={() => action(badge, "status", { status: "actif" })}
                      className="rounded-lg bg-gray-100 px-2 py-2 text-[11px] font-black text-green-700 hover:bg-green-50"
                    >
                      Réactiver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aperçu recto/verso */}
        {preview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
            onClick={() => setPreview(null)}
          >
            <div className="w-full max-w-sm space-y-4" onClick={(event) => event.stopPropagation()}>
              <div className="badge-preview"><BadgeFront badge={preview} /></div>
              {showBack && <div className="badge-preview"><BadgeBack badge={preview} /></div>}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBack((value) => !value)}
                  className="flex-1 rounded-xl bg-white py-3 font-bold text-black"
                >
                  {showBack ? "Recto seul" : "Recto-verso"}
                </button>
                <button
                  onClick={() => printBadges([preview])}
                  className="flex-1 rounded-xl bg-yellow-500 py-3 font-black text-black"
                >
                  Imprimer / PDF
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-xl bg-white px-4 py-3 font-bold text-gray-500"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zone d'impression (cachée à l'écran, seule visible en print) */}
      <div id="print-zone" style={{ display: "none" }}>
        {printList.map((badge) => (
          <div key={badge.id} className="badge-print-pair">
            <BadgeFront badge={badge} />
            {showBack && <BadgeBack badge={badge} />}
          </div>
        ))}
      </div>
    </div>
  );
}
