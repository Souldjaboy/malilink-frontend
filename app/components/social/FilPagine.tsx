"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { authFetch } from "../../lib/api";
import type { SocialPost } from "../../lib/social";
import PostCard from "./PostCard";

export type FilPagineHandle = { ajouterEnTete: (post: SocialPost) => void; recharger: () => void };

/**
 * Liste de publications paginée par curseur, chargée au fil du défilement
 * (15 par page) : on ne télécharge que ce qui va être vu.
 */
const FilPagine = forwardRef<FilPagineHandle, {
  url: string;
  me: number | null;
  vide: React.ReactNode;
}>(function FilPagine({ url, me, vide }, ref) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [curseur, setCurseur] = useState<number | null>(null);
  const [fini, setFini] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [premier, setPremier] = useState(true);
  const sentinelle = useRef<HTMLDivElement>(null);
  const enCours = useRef(false);
  const generation = useRef(0);

  const charger = useCallback(async (avant: number | null, gen: number) => {
    if (enCours.current) return;
    enCours.current = true;
    setChargement(true);
    setErreur("");
    try {
      const separateur = url.includes("?") ? "&" : "?";
      const r = await authFetch(`${url}${separateur}format=page&limit=15${avant ? `&before=${avant}` : ""}`, { cache: "no-store" });
      const data = await r.json().catch(() => ({}));
      if (gen !== generation.current) return;
      if (!r.ok) {
        setErreur(data?.error || "Chargement impossible.");
        setFini(true);
      } else {
        const page: SocialPost[] = Array.isArray(data.posts) ? data.posts : [];
        setPosts((liste) => (avant ? [...liste, ...page.filter((p) => !liste.some((x) => x.id === p.id))] : page));
        setCurseur(data.next_cursor || null);
        setFini(!data.next_cursor);
      }
    } catch {
      if (gen === generation.current) setErreur("Connexion perdue.");
    } finally {
      enCours.current = false;
      if (gen === generation.current) {
        setChargement(false);
        setPremier(false);
      }
    }
  }, [url]);

  const recharger = useCallback(() => {
    generation.current += 1;
    enCours.current = false;
    setPosts([]);
    setCurseur(null);
    setFini(false);
    setPremier(true);
    charger(null, generation.current);
  }, [charger]);

  useEffect(() => {
    recharger();
  }, [recharger]);

  useEffect(() => {
    const el = sentinelle.current;
    if (!el || fini) return;
    const obs = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting) && curseur && !enCours.current) charger(curseur, generation.current);
    }, { rootMargin: "600px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [curseur, fini, charger]);

  useImperativeHandle(ref, () => ({
    ajouterEnTete: (post) => setPosts((liste) => [post, ...liste]),
    recharger,
  }), [recharger]);

  return (
    <div>
      {!premier && posts.length === 0 && !erreur && vide}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          me={me}
          onChange={(p) => setPosts((liste) => liste.map((x) => (x.id === p.id ? p : x)))}
          onDelete={(id) => setPosts((liste) => liste.filter((x) => x.id !== id))}
        />
      ))}
      {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm font-bold text-red-700">{erreur}</p>}
      <div ref={sentinelle} className="flex justify-center py-6">
        {chargement ? (
          <Loader2 className="animate-spin text-gray-400" aria-label="Chargement" />
        ) : !fini && curseur ? (
          <button type="button" onClick={() => charger(curseur, generation.current)} className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow">
            Voir plus
          </button>
        ) : posts.length > 0 ? (
          <p className="text-xs font-semibold text-gray-400">Vous êtes à jour.</p>
        ) : null}
      </div>
    </div>
  );
});

export default FilPagine;
