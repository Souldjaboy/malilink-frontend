"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ban, Flag, Heart, MapPin, ShieldCheck, UserPlus, X } from "lucide-react";
import { authFetch } from "../../lib/api";
import SocialNav from "../../components/SocialNav";

const SECTIONS = [
  { key: "pour_vous", label: "Pour vous" },
  { key: "meme_ville", label: "Même ville" },
  { key: "rencontres", label: "Rencontres 18+" },
];

const REPORT_REASONS = [
  ["harcelement", "Harcèlement"],
  ["spam", "Spam"],
  ["escroquerie", "Escroquerie"],
  ["faux_profil", "Faux profil"],
  ["contenu_sexuel", "Contenu sexuel"],
  ["menace", "Menace"],
  ["usurpation", "Usurpation d'identité"],
  ["mineur_en_danger", "Mineur en danger"],
];

export default function SocialDiscoverPage() {
  const [section, setSection] = useState("pour_vous");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [matchedWith, setMatchedWith] = useState("");
  const [reporting, setReporting] = useState<number | null>(null);

  const load = (nextSection = section) => {
    setLoading(true);
    setNotice("");
    authFetch(`/social/discover?section=${nextSection}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          setNotice(data?.error || "Erreur chargement.");
          setProfiles([]);
        } else {
          setProfiles(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => setNotice("Erreur réseau."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load("pour_vous");
  }, []);

  const current = profiles[0];

  const swipe = async (direction: "right" | "left") => {
    if (!current) return;
    setProfiles((rest) => rest.slice(1));
    const response = await authFetch("/social/swipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_user_id: current.user_id, direction }),
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    if (data?.matched) {
      setMatchedWith(current.display_name);
      setTimeout(() => setMatchedWith(""), 4000);
    }
  };

  const follow = async () => {
    if (!current) return;
    await authFetch(`/social/follows/${current.user_id}`, { method: "POST" }).catch(() => {});
    setNotice(`Vous suivez maintenant ${current.display_name}.`);
  };

  const addFriend = async () => {
    if (!current) return;
    await authFetch("/social/friend-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_user_id: current.user_id }),
    }).catch(() => {});
    setNotice(`Demande d'amitié envoyée à ${current.display_name}.`);
  };

  const block = async () => {
    if (!current) return;
    await authFetch(`/social/blocks/${current.user_id}`, { method: "POST" }).catch(() => {});
    setProfiles((rest) => rest.slice(1));
    setNotice("Profil bloqué. Il ne vous sera plus jamais proposé.");
  };

  const report = async (reason: string) => {
    if (!current) return;
    await authFetch("/social/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_user_id: current.user_id, target_type: "profile", reason }),
    }).catch(() => {});
    setReporting(null);
    setProfiles((rest) => rest.slice(1));
    setNotice("Signalement envoyé à la modération. Merci.");
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SECTIONS.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setSection(item.key);
                load(item.key);
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${
                section === item.key
                  ? "bg-yellow-500 text-black"
                  : "bg-white text-gray-600 shadow-sm"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {matchedWith && (
          <div className="mt-3 rounded-2xl bg-[var(--ml-navy,#0f1b3d)] p-4 text-center font-black text-[var(--ml-gold,#d4a23c)]">
            🎉 Nouveau match avec {matchedWith} !
          </div>
        )}
        {notice && (
          <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-gray-700 shadow-sm">{notice}</p>
        )}

        {loading ? (
          <p className="mt-10 text-center font-semibold text-gray-500">Recherche de profils...</p>
        ) : !current ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow">
            <p className="font-bold text-gray-700">Plus de profils pour le moment.</p>
            <p className="mt-1 text-sm text-gray-500">
              Revenez plus tard ou élargissez vos préférences dans les paramètres.
            </p>
            <Link
              href="/social/settings"
              className="mt-4 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black"
            >
              Mes préférences
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-lg">
            <div className="relative h-72 bg-[var(--ml-navy,#0f1b3d)]">
              {current.photo_url ? (
                <img src={current.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-7xl font-black text-white/30">
                  {(current.display_name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="flex items-center gap-2 text-xl font-black text-white">
                  {current.display_name}
                  {current.age ? <span className="font-bold text-white/80">· {current.age} ans</span> : null}
                  {current.verified_level !== "none" && (
                    <ShieldCheck size={18} className="text-[var(--ml-gold,#d4a23c)]" />
                  )}
                </p>
                {current.city && (
                  <p className="flex items-center gap-1 text-sm text-white/80">
                    <MapPin size={13} /> {current.city}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4">
              {current.bio && <p className="text-sm text-gray-700">{current.bio}</p>}
              {Array.isArray(current.interests) && current.interests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {current.interests.slice(0, 8).map((interest: string) => (
                    <span key={interest} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                      {interest}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions principales */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => swipe("left")}
                  aria-label="Passer"
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-200 text-gray-400"
                >
                  <X size={26} />
                </button>
                <button
                  onClick={() => swipe("right")}
                  aria-label="Intéressé"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500 text-black shadow-lg"
                >
                  <Heart size={30} />
                </button>
                <button
                  onClick={addFriend}
                  aria-label="Demander en ami"
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--ml-navy,#0f1b3d)] text-[var(--ml-navy,#0f1b3d)]"
                >
                  <UserPlus size={24} />
                </button>
              </div>

              {/* Actions secondaires */}
              <div className="mt-3 flex items-center justify-center gap-4 text-xs font-bold text-gray-500">
                <button onClick={follow} className="underline">Suivre</button>
                <Link href={`/social/profile/${current.user_id}`} className="underline">
                  Voir le profil
                </Link>
                <button onClick={() => setReporting(current.user_id)} className="flex items-center gap-1 text-orange-600">
                  <Flag size={13} /> Signaler
                </button>
                <button onClick={block} className="flex items-center gap-1 text-red-600">
                  <Ban size={13} /> Bloquer
                </button>
              </div>

              {reporting === current.user_id && (
                <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                  <p className="text-sm font-black text-black">Motif du signalement :</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {REPORT_REASONS.map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => report(value)}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
