"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ban, Flag, Lock, MapPin, MessageCircle, ShieldCheck, UserPlus, Users } from "lucide-react";
import { authFetch } from "../../../lib/api";
import SocialNav from "../../../components/SocialNav";

export default function SocialProfileViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const openConversation = async (userId: number) => {
    const response = await authFetch("/social/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    if (response?.ok && payload.conversation_id) {
      router.push(`/social/messages?c=${payload.conversation_id}`);
    } else {
      setNotice(payload?.error || "Impossible d'ouvrir la conversation.");
    }
  };
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    authFetch(`/social/profiles/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) setError(payload?.error || "Profil introuvable.");
        else setData(payload);
      })
      .catch(() => setError("Erreur réseau."))
      .finally(() => setLoading(false));
  }, [params?.id]);

  const act = async (path: string, method = "POST", body?: any) => {
    const response = await authFetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    setNotice(payload?.message || (response?.ok ? "Action effectuée." : payload?.error || "Erreur."));
  };

  const profile = data?.profile;

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-8">
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
            <button
              onClick={() => act(`/social/follows/${profile.user_id}`)}
              className="mt-4 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black"
            >
              Demander à suivre
            </button>
            {notice && <p className="mt-3 text-sm font-bold text-gray-600">{notice}</p>}
          </div>
        ) : profile ? (
          <div className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="h-32 bg-[var(--ml-navy,#0f1b3d)]">
              {profile.cover_url && (
                <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="-mt-10 px-4 pb-5">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt=""
                  className="h-20 w-20 rounded-full border-4 border-white object-cover"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-yellow-500 text-2xl font-black text-black">
                  {(profile.display_name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <h1 className="mt-2 flex items-center gap-2 text-xl font-black text-black">
                {profile.display_name}
                {profile.age ? <span className="font-bold text-gray-400">· {profile.age} ans</span> : null}
                {profile.verified_level !== "none" && (
                  <ShieldCheck size={18} className="text-[var(--ml-gold,#d4a23c)]" />
                )}
              </h1>
              {profile.username && <p className="text-sm text-gray-400">@{profile.username}</p>}
              {(profile.city || profile.profession) && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  {profile.city && (
                    <>
                      <MapPin size={13} /> {profile.city}
                    </>
                  )}
                  {profile.profession && <span>· {profile.profession}</span>}
                </p>
              )}
              {profile.bio && <p className="mt-3 text-[15px] text-gray-700">{profile.bio}</p>}

              <div className="mt-3 flex gap-5 text-sm">
                <span className="font-black text-black">
                  {profile.followers_count} <span className="font-semibold text-gray-400">abonnés</span>
                </span>
                <span className="font-black text-black">
                  {profile.following_count} <span className="font-semibold text-gray-400">abonnements</span>
                </span>
                {profile.friends_count !== null && (
                  <span className="font-black text-black">
                    {profile.friends_count} <span className="font-semibold text-gray-400">amis</span>
                  </span>
                )}
              </div>

              {Array.isArray(profile.interests) && profile.interests.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.interests.map((interest: string) => (
                    <span key={interest} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                      {interest}
                    </span>
                  ))}
                </div>
              )}

              {notice && (
                <p className="mt-3 rounded-xl bg-gray-50 p-2.5 text-sm font-bold text-gray-700">{notice}</p>
              )}

              <button
                onClick={() => openConversation(profile.user_id)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 font-black text-black"
              >
                <MessageCircle size={17} /> Envoyer un message
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {profile.is_following ? (
                  <button
                    onClick={() => act(`/social/follows/${profile.user_id}`, "DELETE")}
                    className="rounded-xl border border-gray-200 py-3 font-bold text-gray-600"
                  >
                    Ne plus suivre
                  </button>
                ) : (
                  <button
                    onClick={() => act(`/social/follows/${profile.user_id}`)}
                    className="rounded-xl bg-yellow-500 py-3 font-black text-black"
                  >
                    Suivre
                  </button>
                )}
                {profile.is_friend ? (
                  <button
                    onClick={() => act(`/social/friends/${profile.user_id}`, "DELETE")}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3 font-bold text-gray-600"
                  >
                    <Users size={16} /> Retirer l&apos;ami
                  </button>
                ) : (
                  <button
                    onClick={() => act("/social/friend-requests", "POST", { to_user_id: profile.user_id })}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--ml-navy,#0f1b3d)] py-3 font-black text-white"
                  >
                    <UserPlus size={16} /> Demander en ami
                  </button>
                )}
              </div>
              <div className="mt-3 flex justify-center gap-5 text-xs font-bold">
                <button
                  onClick={() =>
                    act("/social/reports", "POST", {
                      target_user_id: profile.user_id,
                      target_type: "profile",
                      reason: "faux_profil",
                    })
                  }
                  className="flex items-center gap-1 text-orange-600"
                >
                  <Flag size={13} /> Signaler
                </button>
                <button
                  onClick={() => act(`/social/blocks/${profile.user_id}`)}
                  className="flex items-center gap-1 text-red-600"
                >
                  <Ban size={13} /> Bloquer
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
