"use client";

import { useEffect, useRef, useState } from "react";
import { api, capturerImage, champsAppareil, fermerCamera, ouvrirCamera } from "../lib/biometrie";

/**
 * POINTAGE « BADGE + VISAGE » — le mode recommandé.
 *
 * Le badge QR désigne la personne ; le visage confirme que c'est bien elle
 * (vérification 1:1, sur un appareil déclaré, avec un défi à usage unique).
 * L'image est envoyée une fois pour comparaison, jamais conservée.
 * En cas d'échec, le pointage par badge seul ou manuel reste disponible.
 */

type Props = {
  badge: string;
  action: string;
  libelleAction: string;
  onTermine: (resultat: { ok: boolean; message: string }) => void;
};

export default function PointageVisage({ badge, action, libelleAction, onTermine }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const flux = useRef<MediaStream | null>(null);
  const [etat, setEtat] = useState<"camera" | "envoi" | "erreur">("camera");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        if (video.current) flux.current = await ouvrirCamera(video.current, "user");
      } catch (e) {
        if (!annule) {
          setEtat("erreur");
          setErreur(e instanceof Error ? e.message : "Caméra indisponible.");
        }
      }
    })();
    return () => {
      annule = true;
      fermerCamera(flux.current);
    };
  }, []);

  const verifier = async () => {
    if (!video.current) return;
    setEtat("envoi");
    const image = capturerImage(video.current);
    fermerCamera(flux.current);
    flux.current = null;
    const appareil = champsAppareil();
    const defi = await api("/biometrics/challenges", {
      method: "POST",
      body: JSON.stringify({ biometric_type: "face", purpose: "pointage", badge, action, ...appareil }),
    });
    if (!defi.ok) {
      onTermine({ ok: false, message: defi.data?.error || "Défi refusé." });
      return;
    }
    const r = await api("/biometrics/attendance", {
      method: "POST",
      body: JSON.stringify({
        badge, action, biometric_type: "face", capture: { image_base64: image },
        challenge: { challenge_id: defi.data.challenge_id, nonce: defi.data.nonce }, ...appareil,
      }),
    });
    onTermine(r.ok
      ? { ok: true, message: `${r.data.employee?.fullname || "Employé"} — ${libelleAction} ${r.data.statut === "deja_enregistre" ? "déjà enregistré" : "enregistré"} (visage confirmé)` }
      : { ok: false, message: r.data?.error || "Visage non confirmé : utilisez le badge seul ou le pointage manuel." });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Vérification du visage">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 text-black">
        <h2 className="text-xl font-black">Confirmez votre visage</h2>
        <p className="mt-1 text-sm text-gray-600">Badge lu. Regardez la caméra, puis appuyez sur « Vérifier ». Aucune photo n&apos;est conservée.</p>
        {etat === "erreur" ? (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{erreur}</p>
        ) : (
          <video ref={video} muted playsInline className="mt-3 w-full rounded-xl bg-black" />
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onTermine({ ok: false, message: "Vérification annulée." })}
            className="rounded-xl border py-3 font-bold">Annuler</button>
          <button type="button" onClick={verifier} disabled={etat !== "camera"}
            className="rounded-xl bg-[var(--ml-blue-deep,#0a1330)] py-3 font-bold text-white disabled:opacity-50">
            {etat === "envoi" ? "Vérification…" : "Vérifier"}
          </button>
        </div>
      </div>
    </div>
  );
}
