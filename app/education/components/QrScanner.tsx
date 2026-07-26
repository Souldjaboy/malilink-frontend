"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lecteur QR par caméra (html5-qrcode). Ouvre le flux vidéo, privilégie la
 * caméra arrière (tablette/téléphone), lit le QR du badge et renvoie sa valeur
 * une seule fois (pause après lecture pour éviter les doubles scans).
 * Chargé dynamiquement (pas de SSR) — l'accès caméra exige HTTPS en production.
 */
type Html5QrcodeInstance = {
  start: (
    camera: { facingMode: string } | string,
    config: { fps: number; qrbox: number },
    onSuccess: (text: string) => void,
    onError?: (e: string) => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
};

export default function QrScanner({
  onDecode,
  onClose,
  title = "Scanner le badge",
  beep = true,
}: {
  onDecode: (text: string) => void;
  onClose: () => void;
  title?: string;
  beep?: boolean;
}) {
  const regionId = "edu-qr-region";
  const instanceRef = useRef<Html5QrcodeInstance | null>(null);
  const decodedRef = useRef(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("html5-qrcode");
        const Html5Qrcode = (mod as unknown as { Html5Qrcode: new (id: string) => Html5QrcodeInstance }).Html5Qrcode;
        if (cancelled) return;
        const inst = new Html5Qrcode(regionId);
        instanceRef.current = inst;
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (text) => {
            if (decodedRef.current) return; // anti double-lecture
            decodedRef.current = true;
            if (beep) {
              try {
                const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                const o = ctx.createOscillator();
                o.frequency.value = 880; o.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.12);
              } catch { /* son facultatif */ }
            }
            onDecode(text);
          }
        );
        if (!cancelled) setReady(true);
      } catch (e) {
        setError(
          e instanceof Error && /permission|NotAllowed/i.test(e.message)
            ? "Autorisation caméra refusée. Vérifiez les permissions du navigateur (HTTPS requis)."
            : "Caméra indisponible sur cet appareil ou ce navigateur."
        );
      }
    })();
    return () => {
      cancelled = true;
      const inst = instanceRef.current;
      if (inst) {
        inst.stop().then(() => inst.clear()).catch(() => {});
      }
    };
  }, [onDecode, beep]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg bg-gray-100 px-3 py-1 font-bold text-gray-700 hover:bg-gray-200">Fermer</button>
        </div>
        {error ? (
          <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
        ) : (
          <>
            <div id={regionId} className="overflow-hidden rounded-xl bg-black" style={{ minHeight: 260 }} />
            <p className="mt-3 text-center text-sm text-gray-500">
              {ready ? "Placez le QR code du badge devant la caméra." : "Ouverture de la caméra…"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
