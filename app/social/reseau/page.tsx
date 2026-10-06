"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, MessageCircle, ShieldCheck, UserMinus, UserPlus, X } from "lucide-react";
import { authFetch } from "../../lib/api";
import SocialNav from "../../components/SocialNav";
import type { NetworkSummary } from "../../lib/social";

type Personne = {
  id?: number;
  user_id: number;
  from_user_id?: number;
  display_name: string;
  photo_url: string;
  city?: string;
  profession?: string;
  verified_level?: string;
  amis_communs?: number;
  je_le_suis?: boolean;
  ami?: boolean;
};

type Onglet = "demandes" | "amis" | "abonnes" | "abonnements" | "suggestions" | "matchs";

const ONGLETS: { cle: Onglet; libelle: string; compte: (r: NetworkSummary | null) => number | null }[] = [
  { cle: "demandes", libelle: "Demandes", compte: (r) => (r ? r.demandes_recues + r.demandes_abonnement : null) },
  { cle: "amis", libelle: "Amis", compte: (r) => r?.amis ?? null },
  { cle: "abonnes", libelle: "Abonnés", compte: (r) => r?.abonnes ?? null },
  { cle: "abonnements", libelle: "Abonnements", compte: (r) => r?.abonnements ?? null },
  { cle: "suggestions", libelle: "Suggestions", compte: () => null },
  { cle: "matchs", libelle: "Matchs", compte: (r) => r?.matchs ?? null },
];

function Ligne({ personne, sousTitre, children }: { personne: Personne; sousTitre?: string; children?: React.ReactNode }) {
  const id = personne.user_id || personne.from_user_id;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <Link href={`/social/profile/${id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {personne.photo_url ? (
          <img src={personne.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ml-navy,#0f1b3d)] font-black text-white">
            {(personne.display_name || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-black text-black">
            <span className="truncate">{personne.display_name}</span>
            {personne.verified_level && personne.verified_level !== "none" && (
              <ShieldCheck size={15} className="shrink-0 text-[var(--ml-gold,#d4a23c)]" />
            )}
          </p>
          <p className="truncate text-xs text-gray-500">
            {sousTitre || [personne.profession, personne.city].filter(Boolean).join(" · ")}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}

const btn = "flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black";

function Vide({ texte }: { texte: string }) {
  return <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-gray-500 shadow-sm">{texte}</p>;
}

export default function SocialReseauPage() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>("demandes");
  const [resume, setResume] = useState<NetworkSummary | null>(null);
  const [donnees, setDonnees] = useState<Record<string, Personne[]>>({});
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");
  const [faits, setFaits] = useState<Record<number, string>>({});

  useEffect(() => {
    const demande = new URLSearchParams(window.location.search).get("onglet") as Onglet | null;
    if (demande && ONGLETS.some((o) => o.cle === demande)) queueMicrotask(() => setOnglet(demande));
  }, []);

  const lire = (chemin: string) => authFetch(chemin, { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).catch(() => []);

  const charger = useCallback(async (cible: Onglet) => {
    setChargement(true);
    authFetch("/social/network/summary", { cache: "no-store" })
      .then(async (r) => r.ok && setResume(await r.json()))
      .catch(() => {});
    const sources: Record<Onglet, string[]> = {
      demandes: ["/social/friend-requests", "/social/follow-requests", "/social/friend-requests/sent"],
      amis: ["/social/friends"],
      abonnes: ["/social/followers"],
      abonnements: ["/social/following"],
      suggestions: ["/social/suggestions"],
      matchs: ["/social/matches"],
    };
    const resultats = await Promise.all(sources[cible].map(lire));
    setDonnees((d) => {
      const n = { ...d };
      sources[cible].forEach((cle, i) => { n[cle] = Array.isArray(resultats[i]) ? resultats[i] : []; });
      return n;
    });
    setChargement(false);
  }, []);

  useEffect(() => {
    // Le chargement est asynchrone : l'état n'est modifié qu'au retour.
    queueMicrotask(() => charger(onglet));
  }, [onglet, charger]);

  const agir = async (chemin: string, methode = "POST", corps?: unknown, succes?: string) => {
    setMessage("");
    const r = await authFetch(chemin, {
      method: methode,
      headers: corps ? { "Content-Type": "application/json" } : undefined,
      body: corps ? JSON.stringify(corps) : undefined,
    }).catch(() => null);
    const data = await r?.json().catch(() => ({}));
    if (!r?.ok) {
      setMessage(data?.error || "Action impossible.");
      return false;
    }
    if (succes) setMessage(succes);
    charger(onglet);
    return true;
  };

  const ecrire = async (userId: number) => {
    const r = await authFetch("/social/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => null);
    const data = await r?.json().catch(() => ({}));
    if (r?.ok && data?.conversation_id) router.push(`/social/messages?c=${data.conversation_id}`);
    else setMessage(data?.error || "Impossible d'ouvrir la conversation.");
  };

  const liste = (cle: string) => donnees[cle] || [];

  return (
    <div className="min-h-screen bg-gray-100 pb-24 lg:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-2xl px-3 py-4">
        <h1 className="text-2xl font-black text-black">Mon réseau</h1>
        <p className="text-sm text-gray-500">Demandes, amis, abonnés et abonnements, au même endroit.</p>

        <div className="-mx-3 mt-3 overflow-x-auto px-3" role="tablist" aria-label="Sections du réseau">
          <div className="flex w-max gap-2">
            {ONGLETS.filter((o) => o.cle !== "matchs" || (resume?.matchs || 0) > 0).map((o) => {
              const n = o.compte(resume);
              const urgent = o.cle === "demandes" && (n || 0) > 0;
              return (
                <button
                  key={o.cle}
                  type="button"
                  role="tab"
                  aria-selected={onglet === o.cle}
                  ref={(el) => { if (el && onglet === o.cle) el.scrollIntoView({ block: "nearest", inline: "nearest" }); }}
                  onClick={() => setOnglet(o.cle)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black ${
                    onglet === o.cle ? "bg-[var(--ml-navy,#0f1b3d)] text-white" : "bg-white text-gray-700 shadow-sm"
                  }`}
                >
                  {o.libelle}
                  {n !== null && (
                    <span className={`rounded-full px-1.5 text-xs ${urgent ? "bg-red-600 text-white" : onglet === o.cle ? "bg-white/20" : "bg-gray-100"}`}>
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {message && <p role="status" className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-gray-700 shadow-sm">{message}</p>}

        <section className="mt-4 space-y-2">
          {chargement && <p className="py-6 text-center font-semibold text-gray-500">Chargement…</p>}

          {!chargement && onglet === "demandes" && (
            <>
              <h2 className="text-sm font-black uppercase tracking-wide text-gray-500">Demandes d&apos;amitié reçues</h2>
              {liste("/social/friend-requests").length === 0 ? <Vide texte="Aucune demande d'amitié en attente." /> :
                liste("/social/friend-requests").map((p) => (
                  <Ligne key={`r${p.id}`} personne={p}>
                    <button type="button" onClick={() => agir(`/social/friend-requests/${p.id}/respond`, "POST", { accept: true }, "Demande acceptée : vous êtes amis.")}
                      className={`${btn} bg-yellow-500 text-black`}><Check size={14} /> Accepter</button>
                    <button type="button" onClick={() => agir(`/social/friend-requests/${p.id}/respond`, "POST", { accept: false })}
                      className={`${btn} bg-gray-100 text-gray-700`} aria-label="Refuser"><X size={14} /></button>
                  </Ligne>
                ))}

              {liste("/social/follow-requests").length > 0 && (
                <>
                  <h2 className="pt-3 text-sm font-black uppercase tracking-wide text-gray-500">Demandes d&apos;abonnement</h2>
                  {liste("/social/follow-requests").map((p) => (
                    <Ligne key={`f${p.user_id}`} personne={p} sousTitre="souhaite suivre votre profil">
                      <button type="button" onClick={() => agir(`/social/follow-requests/${p.user_id}/respond`, "POST", { accept: true }, "Abonnement accepté.")}
                        className={`${btn} bg-yellow-500 text-black`}><Check size={14} /> Accepter</button>
                      <button type="button" onClick={() => agir(`/social/follow-requests/${p.user_id}/respond`, "POST", { accept: false })}
                        className={`${btn} bg-gray-100 text-gray-700`} aria-label="Refuser"><X size={14} /></button>
                    </Ligne>
                  ))}
                </>
              )}

              <h2 className="pt-3 text-sm font-black uppercase tracking-wide text-gray-500">Demandes envoyées</h2>
              {liste("/social/friend-requests/sent").length === 0 ? <Vide texte="Aucune demande envoyée en attente." /> :
                liste("/social/friend-requests/sent").map((p) => (
                  <Ligne key={`s${p.id}`} personne={p} sousTitre="en attente de réponse">
                    <button type="button" onClick={() => agir(`/social/friend-requests/${p.id}`, "DELETE", undefined, "Demande annulée.")}
                      className={`${btn} bg-gray-100 text-gray-700`}>Annuler</button>
                  </Ligne>
                ))}
            </>
          )}

          {!chargement && onglet === "amis" && (
            liste("/social/friends").length === 0 ? <Vide texte="Vous n'avez pas encore d'amis sur MaliLink Social." /> :
              liste("/social/friends").map((p) => (
                <Ligne key={p.user_id} personne={p}>
                  <button type="button" onClick={() => ecrire(p.user_id)} className={`${btn} bg-yellow-500 text-black`}>
                    <MessageCircle size={14} /> Écrire
                  </button>
                  <button type="button" onClick={() => window.confirm(`Retirer ${p.display_name} de vos amis ?`) && agir(`/social/friends/${p.user_id}`, "DELETE")}
                    className={`${btn} bg-gray-100 text-gray-700`} aria-label={`Retirer ${p.display_name} de vos amis`}><UserMinus size={14} /></button>
                </Ligne>
              ))
          )}

          {!chargement && onglet === "abonnes" && (
            liste("/social/followers").length === 0 ? <Vide texte="Personne ne vous suit encore." /> :
              liste("/social/followers").map((p) => (
                <Ligne key={p.user_id} personne={p} sousTitre={p.ami ? "Ami · vous suit" : "vous suit"}>
                  {!p.je_le_suis && (
                    <button type="button" onClick={() => agir(`/social/follows/${p.user_id}`, "POST", undefined, "Vous le suivez aussi.")}
                      className={`${btn} bg-yellow-500 text-black`}>Suivre aussi</button>
                  )}
                  <button type="button" onClick={() => agir(`/social/followers/${p.user_id}`, "DELETE", undefined, "Abonné retiré.")}
                    className={`${btn} bg-gray-100 text-gray-700`}>Retirer</button>
                </Ligne>
              ))
          )}

          {!chargement && onglet === "abonnements" && (
            liste("/social/following").length === 0 ? <Vide texte="Vous ne suivez encore personne." /> :
              liste("/social/following").map((p) => (
                <Ligne key={p.user_id} personne={p}>
                  <button type="button" onClick={() => agir(`/social/follows/${p.user_id}`, "DELETE", undefined, "Vous ne suivez plus ce profil.")}
                    className={`${btn} bg-gray-100 text-gray-700`}>Ne plus suivre</button>
                </Ligne>
              ))
          )}

          {!chargement && onglet === "suggestions" && (
            liste("/social/suggestions").length === 0 ? <Vide texte="Aucune suggestion pour le moment." /> :
              liste("/social/suggestions").map((p) => (
                <Ligne key={p.user_id} personne={p}
                  sousTitre={p.amis_communs ? `${p.amis_communs} ami(s) en commun` : [p.profession, p.city].filter(Boolean).join(" · ")}>
                  {faits[p.user_id] ? (
                    <span className="text-xs font-bold text-green-700">{faits[p.user_id]}</span>
                  ) : (
                    <>
                      <button type="button"
                        onClick={async () => { if (await agir("/social/friend-requests", "POST", { to_user_id: p.user_id })) setFaits((f) => ({ ...f, [p.user_id]: "Demande envoyée" })); }}
                        className={`${btn} bg-yellow-500 text-black`}><UserPlus size={14} /> Ajouter</button>
                      <button type="button"
                        onClick={async () => { if (await agir(`/social/follows/${p.user_id}`)) setFaits((f) => ({ ...f, [p.user_id]: "Suivi" })); }}
                        className={`${btn} bg-gray-100 text-gray-700`}>Suivre</button>
                    </>
                  )}
                </Ligne>
              ))
          )}

          {!chargement && onglet === "matchs" && (
            liste("/social/matches").length === 0 ? <Vide texte="Aucun match." /> :
              liste("/social/matches").map((p) => (
                <Ligne key={p.user_id} personne={p} sousTitre="Intérêt réciproque">
                  <Heart size={16} className="text-red-500" aria-hidden="true" />
                  <button type="button" onClick={() => ecrire(p.user_id)} className={`${btn} bg-yellow-500 text-black`}>
                    <MessageCircle size={14} /> Écrire
                  </button>
                </Ligne>
              ))
          )}
        </section>
      </main>
    </div>
  );
}
