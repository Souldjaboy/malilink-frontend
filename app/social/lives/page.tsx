"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Loader2, Radio, Video } from "lucide-react";
import { authFetch } from "../../lib/api";
import SocialNav from "../../components/SocialNav";
import { RAISONS_INDISPONIBLE, dureeDepuis, useConfigLives, type Live } from "../../lib/lives";

/* Directs en cours. Sans serveur média fonctionnel : message
   « indisponible » avec la raison réelle, et aucun direct affiché. */
export default function LivesPage() {
  const config = useConfigLives();
  const [lives, setLives] = useState<Live[] | null>(null);
  const [maintenant, setMaintenant] = useState(0);

  useEffect(() => {
    if (!config?.enabled) return;
    let actif = true;
    const charger = async () => {
      const r = await authFetch("/social/lives", { cache: "no-store" }).catch(() => null);
      const d = r?.ok ? await r.json() : { lives: [] };
      if (actif) { setLives(d.lives || []); setMaintenant(Date.now()); }
    };
    queueMicrotask(charger);
    const t = setInterval(charger, 15000);
    const h = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => { actif = false; clearInterval(t); clearInterval(h); };
  }, [config?.enabled]);

  return (
    <div className="min-h-screen bg-gray-100 pb-24 lg:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-black text-black"><Radio className="text-red-600" aria-hidden="true" /> Directs</h1>
          {config?.enabled && (
            <Link href="/social/lives/nouveau" className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-black text-white">
              <Video size={18} aria-hidden="true" /> Lancer un direct
            </Link>
          )}
        </div>

        {!config ? (
          <Loader2 className="mx-auto animate-spin text-gray-400" />
        ) : !config.enabled ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <Radio className="mx-auto text-gray-300" size={40} aria-hidden="true" />
            <p className="mt-3 text-lg font-black text-gray-900">Les directs sont indisponibles pour le moment.</p>
            <p className="mt-1 text-sm text-gray-500">{RAISONS_INDISPONIBLE[config.raison] || "Le service vidéo n'est pas disponible."}</p>
          </div>
        ) : !lives ? (
          <Loader2 className="mx-auto animate-spin text-gray-400" />
        ) : lives.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-bold text-gray-700">Aucun direct en cours dans votre réseau.</p>
            <p className="mt-1 text-sm text-gray-500">Lancez le vôtre, ou revenez plus tard.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {lives.map((l) => (
              <li key={l.id}>
                <Link href={`/social/lives/${l.id}`} className="block overflow-hidden rounded-2xl bg-[#0f1b3d] text-white shadow-sm hover:opacity-95">
                  <div className="flex items-center justify-between gap-2 px-4 pt-3 text-xs font-black">
                    <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5">● EN DIRECT · {dureeDepuis(l.started_at, maintenant || Date.parse(l.started_at))}</span>
                    {l.compteur && <span className="flex items-center gap-1 text-white/80"><Eye size={14} aria-hidden="true" /> {l.compteur.spectateurs}</span>}
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    {l.host.photo_url
                      ? <img src={l.host.photo_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-red-500" />
                      : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 font-black text-black ring-2 ring-red-500">{l.host.display_name.charAt(0)}</span>}
                    <span className="min-w-0">
                      <span className="block truncate font-black">{l.title}</span>
                      <span className="block truncate text-sm text-white/70">{l.host.display_name}</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
