"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Heart, ShieldCheck, X } from "lucide-react";
import { authFetch } from "../../lib/api";
import SocialNav from "../../components/SocialNav";

const TABS = [
  { key: "demandes", label: "Demandes" },
  { key: "amis", label: "Amis" },
  { key: "matchs", label: "Matchs" },
];

export default function SocialFriendsPage() {
  const [tab, setTab] = useState("demandes");
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      authFetch("/social/friend-requests").then((r) => (r.ok ? r.json() : [])),
      authFetch("/social/friends").then((r) => (r.ok ? r.json() : [])),
      authFetch("/social/matches").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([reqs, frs, mts]) => {
        setRequests(Array.isArray(reqs) ? reqs : []);
        setFriends(Array.isArray(frs) ? frs : []);
        setMatches(Array.isArray(mts) ? mts : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const respond = async (id: number, accept: boolean) => {
    await authFetch(`/social/friend-requests/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    }).catch(() => {});
    loadAll();
  };

  const PersonRow = ({ person, right }: { person: any; right?: React.ReactNode }) => (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm">
      <Link href={`/social/profile/${person.user_id || person.from_user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {person.photo_url ? (
          <img src={person.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ml-navy,#0f1b3d)] font-black text-white">
            {(person.display_name || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-black text-black">
            {person.display_name}
            {person.verified_level && person.verified_level !== "none" && (
              <ShieldCheck size={14} className="shrink-0 text-[var(--ml-gold,#d4a23c)]" />
            )}
          </p>
          {person.city && <p className="truncate text-xs text-gray-400">{person.city}</p>}
        </div>
      </Link>
      {right}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-4">
        <div className="flex gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex-1 rounded-full py-2.5 text-sm font-black ${
                tab === item.key ? "bg-yellow-500 text-black" : "bg-white text-gray-600 shadow-sm"
              }`}
            >
              {item.label}
              {item.key === "demandes" && requests.length > 0 && ` (${requests.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-10 text-center font-semibold text-gray-500">Chargement...</p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {tab === "demandes" &&
              (requests.length === 0 ? (
                <p className="rounded-2xl bg-white p-6 text-center font-semibold text-gray-500 shadow-sm">
                  Aucune demande d&apos;amitié en attente.
                </p>
              ) : (
                requests.map((request) => (
                  <PersonRow
                    key={request.id}
                    person={request}
                    right={
                      <div className="flex gap-2">
                        <button
                          onClick={() => respond(request.id, true)}
                          aria-label="Accepter"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 text-black"
                        >
                          <Check size={19} />
                        </button>
                        <button
                          onClick={() => respond(request.id, false)}
                          aria-label="Refuser"
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400"
                        >
                          <X size={19} />
                        </button>
                      </div>
                    }
                  />
                ))
              ))}

            {tab === "amis" &&
              (friends.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                  <p className="font-semibold text-gray-500">Pas encore d&apos;amis.</p>
                  <Link href="/social/decouvrir" className="mt-3 inline-block rounded-xl bg-yellow-500 px-5 py-2.5 font-black text-black">
                    Découvrir des personnes
                  </Link>
                </div>
              ) : (
                friends.map((friend) => <PersonRow key={friend.user_id} person={friend} />)
              ))}

            {tab === "matchs" &&
              (matches.length === 0 ? (
                <p className="rounded-2xl bg-white p-6 text-center font-semibold text-gray-500 shadow-sm">
                  Pas encore de match. Le match arrive quand l&apos;intérêt est réciproque. 💛
                </p>
              ) : (
                matches.map((match) => (
                  <PersonRow
                    key={match.match_id}
                    person={match}
                    right={<Heart size={20} className="shrink-0 text-red-500" fill="currentColor" />}
                  />
                ))
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
