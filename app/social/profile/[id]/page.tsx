"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Ban, Bookmark, Check, Flag, Lock, MapPin, MessageCircle, Pencil, Settings, ShieldCheck, UserPlus, Users,
} from "lucide-react";
import { authFetch } from "../../../lib/api";
import SocialNav from "../../../components/SocialNav";
import Composer from "../../../components/social/Composer";
import FilPagine from "../../../components/social/FilPagine";

type Relation = {
  ami: boolean;
  abonnement: "active" | "pending" | null;
  abonne: "active" | "pending" | null;
  demande_envoyee_id: number | null;
  demande_recue_id: number | null;
};

export default function SocialProfileViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [moi, setMoi] = useState<number | null>(null);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const profilId = params?.id;

  const charger = useCallback(async () => {
    if (!profilId) return;
    const [profil, me, rel] = await Promise.all([
      authFetch(`/social/profiles/${profilId}`, { cache: "no-store" }).catch(() => null),
      authFetch("/social/me", { cache: "no-store" }).catch(() => null),
      authFetch(`/social/relations/${profilId}`, { cache: "no-store" }).catch(() => null),
    ]);
    const payload = await profil?.json().catch(() => ({}));
    if (!profil?.ok) setError(payload?.error || "Profil introuvable.");
    else setData(payload);
    const m = await me?.json().catch(() => null);
    setMoi(m?.profile?.user_id ?? null);
    if (rel?.ok) setRelation(await rel.json());
    setLoading(false);
  }, [profilId]);

  useEffect(() => {
    queueMicrotask(() => { charger(); });
  }, [charger]);

  const openConversation = async (userId: number) => {
    const response = await authFetch("/social/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    if (response?.ok && payload.conversation_id) router.push(`/social/messages?c=${payload.conversation_id}`);
    else setNotice(payload?.error || "Impossible d'ouvrir la conversation.");
  };

  const act = async (path: string, method = "POST", body?: unknown, succes?: string) => {
    const response = await authFetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    setNotice(response?.ok ? succes || payload?.message || "C'est fait." : payload?.error || "Action impossible.");
    if (response?.ok) charger();
  };

  const profile = data?.profile;
  const estMoi = moi !== null && profile && Number(profile.user_id) === moi;

  return (
    <div className="min-h-screen bg-gray-100 pb-24 lg:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-4">
        {loading ? (
          <p className="mt-10 text-center font-semibold text-gray-500">Chargement du profil...</p>
        ) : error ? (
          <p className="mt-8 rounded-2xl bg-white p-6 text-center font-bold text-red-600 shadow">{error}</p>
        ) : data?.private ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow">
            <Lock className="mx-auto text-gray-400" size={32} />
            <p className="mt-3 font-black text-black">{profile?.display_name}</p>
            <p className="text-sm text-gray-500">Ce profil est privé.</p>
            {relation?.abonnement === "pending" ? (
              <p className="mt-4 rounded-xl bg-gray-100 px-6 py-3 font-bold text-gray-600">Demande envoyée</p>
            ) : (
              <button type="button" onClick={() => act(`/social/follows/${profile.user_id}`, "POST", undefined, "Demande envoyée.")}
                className="mt-4 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
                Demander à suivre
              </button>
            )}
            {notice && <p className="mt-3 text-sm font-bold text-gray-600">{notice}</p>}
          </div>
        ) : profile ? (
          <>
            <div className="overflow-hidden rounded-3xl bg-white shadow">
              <div className="h-32 bg-[var(--ml-navy,#0f1b3d)]">
                {profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="-mt-10 px-4 pb-5">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt="" className="h-20 w-20 rounded-full border-4 border-white object-cover" />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-yellow-500 text-2xl font-black text-black">
                    {(profile.display_name || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <h1 className="mt-2 flex items-center gap-2 text-xl font-black text-black">
                  {profile.display_name}
                  {profile.age ? <span className="font-bold text-gray-500">· {profile.age} ans</span> : null}
                  {profile.verified_level !== "none" && <ShieldCheck size={18} className="text-[var(--ml-gold,#d4a23c)]" />}
                </h1>
                {profile.username && <p className="text-sm text-gray-500">@{profile.username}</p>}
                {(profile.city || profile.profession) && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    {profile.city && (<><MapPin size={13} aria-hidden="true" /> {profile.city}</>)}
                    {profile.profession && <span>· {profile.profession}</span>}
                  </p>
                )}
                {profile.bio && <p className="mt-3 whitespace-pre-wrap text-[15px] text-gray-700">{profile.bio}</p>}

                <div className="mt-3 flex flex-wrap gap-5 text-sm">
                  <span className="font-black text-black">{profile.followers_count} <span className="font-semibold text-gray-500">abonnés</span></span>
                  <span className="font-black text-black">{profile.following_count} <span className="font-semibold text-gray-500">abonnements</span></span>
                  {profile.friends_count !== null && (
                    <span className="font-black text-black">{profile.friends_count} <span className="font-semibold text-gray-500">amis</span></span>
                  )}
                </div>

                {Array.isArray(profile.interests) && profile.interests.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {profile.interests.map((interest: string) => (
                      <span key={interest} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">{interest}</span>
                    ))}
                  </div>
                )}

                {notice && <p role="status" className="mt-3 rounded-xl bg-gray-50 p-2.5 text-sm font-bold text-gray-700">{notice}</p>}

                {estMoi ? (
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <Link href="/social/profile/setup" className="flex items-center justify-center gap-1.5 rounded-xl bg-yellow-500 py-3 font-black text-black">
                      <Pencil size={15} /> Modifier
                    </Link>
                    <Link href="/social/reseau" className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3 font-bold text-gray-700">
                      <Users size={15} /> Réseau
                    </Link>
                    <Link href="/social/settings" className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3 font-bold text-gray-700">
                      <Settings size={15} /> Paramètres
                    </Link>
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => openConversation(profile.user_id)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 font-black text-black">
                      <MessageCircle size={17} /> Envoyer un message
                    </button>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {relation?.abonnement === "active" ? (
                        <button type="button" onClick={() => act(`/social/follows/${profile.user_id}`, "DELETE", undefined, "Vous ne suivez plus ce profil.")}
                          className="rounded-xl border border-gray-200 py-3 font-bold text-gray-600">Ne plus suivre</button>
                      ) : relation?.abonnement === "pending" ? (
                        <button type="button" onClick={() => act(`/social/follows/${profile.user_id}`, "DELETE", undefined, "Demande retirée.")}
                          className="rounded-xl border border-gray-200 py-3 font-bold text-gray-600">Demande envoyée</button>
                      ) : (
                        <button type="button" onClick={() => act(`/social/follows/${profile.user_id}`)}
                          className="rounded-xl bg-yellow-500 py-3 font-black text-black">Suivre</button>
                      )}
                      {relation?.ami ? (
                        <button type="button" onClick={() => window.confirm("Retirer cette personne de vos amis ?") && act(`/social/friends/${profile.user_id}`, "DELETE", undefined, "Ami retiré.")}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3 font-bold text-gray-600">
                          <Users size={16} /> Amis
                        </button>
                      ) : relation?.demande_recue_id ? (
                        <button type="button" onClick={() => act(`/social/friend-requests/${relation.demande_recue_id}/respond`, "POST", { accept: true }, "Vous êtes maintenant amis.")}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--ml-navy,#0f1b3d)] py-3 font-black text-white">
                          <Check size={16} /> Accepter
                        </button>
                      ) : relation?.demande_envoyee_id ? (
                        <button type="button" onClick={() => act(`/social/friend-requests/${relation.demande_envoyee_id}`, "DELETE", undefined, "Demande annulée.")}
                          className="rounded-xl border border-gray-200 py-3 font-bold text-gray-600">Annuler la demande</button>
                      ) : (
                        <button type="button" onClick={() => act("/social/friend-requests", "POST", { to_user_id: profile.user_id }, "Demande d'amitié envoyée.")}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--ml-navy,#0f1b3d)] py-3 font-black text-white">
                          <UserPlus size={16} /> Ajouter
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex justify-center gap-5 text-xs font-bold">
                      <button type="button"
                        onClick={() => act("/social/reports", "POST", { target_user_id: profile.user_id, target_type: "profile", reason: "faux_profil" })}
                        className="flex items-center gap-1 text-orange-700">
                        <Flag size={13} /> Signaler
                      </button>
                      <button type="button"
                        onClick={() => window.confirm("Bloquer ce profil ? Vous ne verrez plus rien l'un de l'autre.") && act(`/social/blocks/${profile.user_id}`)}
                        className="flex items-center gap-1 text-red-700">
                        <Ban size={13} /> Bloquer
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {estMoi && (
              <div className="mt-4">
                <Composer prenom={profile.display_name?.split(" ")[0] || ""} onPublished={() => setVersion((v) => v + 1)} />
                <Link href="/social/enregistres" className="mt-2 flex items-center gap-1.5 text-sm font-bold text-gray-600">
                  <Bookmark size={14} /> Mes publications enregistrées
                </Link>
              </div>
            )}

            <h2 className="mt-5 text-lg font-black text-black">Publications</h2>
            <FilPagine
              key={`${profile.user_id}-${version}`}
              url={`/social/users/${profile.user_id}/posts`}
              me={moi}
              vide={<p className="mt-3 rounded-2xl bg-white p-6 text-center text-sm font-semibold text-gray-500 shadow">Aucune publication visible.</p>}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
