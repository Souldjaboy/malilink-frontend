"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Trash2, X, ZoomIn } from "lucide-react";
import CameraCapture from "../../components/social/CameraCapture";

/* Photo d'identité d'un élève : import (téléphone, ordinateur), caméra
   (téléphone ou webcam), recadrage au format 3:4, aperçu, remplacement.
   Le résultat est une image JPEG 600 × 800 réutilisée pour la fiche, la
   carte scolaire et les documents. Rien n'est envoyé ici. */

const SORTIE_L = 600;
const SORTIE_H = 800;
const CADRE_L = 240;
const CADRE_H = 320;

type Cadrage = { zoom: number; dx: number; dy: number };

function Recadrage({ source, onValider, onAnnuler }: { source: string; onValider: (b: Blob) => void; onAnnuler: () => void }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [c, setC] = useState<Cadrage>({ zoom: 1, dx: 0, dy: 0 });
  const glisse = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = source;
  }, [source]);

  const echelle = image ? Math.max(CADRE_L / image.naturalWidth, CADRE_H / image.naturalHeight) * c.zoom : 1;
  const largeur = image ? image.naturalWidth * echelle : 0;
  const hauteur = image ? image.naturalHeight * echelle : 0;
  // L'image couvre toujours le cadre : le déplacement est borné.
  const borne = (v: number, max: number) => Math.max(-max, Math.min(max, v));
  const dx = borne(c.dx, Math.max(0, (largeur - CADRE_L) / 2));
  const dy = borne(c.dy, Math.max(0, (hauteur - CADRE_H) / 2));
  const gauche = CADRE_L / 2 - largeur / 2 + dx;
  const haut = CADRE_H / 2 - hauteur / 2 + dy;

  const valider = () => {
    if (!image) return;
    const toile = document.createElement("canvas");
    toile.width = SORTIE_L;
    toile.height = SORTIE_H;
    const ctx = toile.getContext("2d");
    if (!ctx) return;
    const k = SORTIE_L / CADRE_L;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SORTIE_L, SORTIE_H);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, gauche * k, haut * k, largeur * k, hauteur * k);
    toile.toBlob((b) => b && onValider(b), "image/jpeg", 0.88);
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Recadrer la photo">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900">Recadrer la photo</h3>
          <button type="button" onClick={onAnnuler} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Annuler">
            <X size={20} />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">Faites glisser pour centrer le visage.</p>
        <div
          className="relative mx-auto mt-3 cursor-grab touch-none select-none overflow-hidden rounded-xl bg-slate-200 active:cursor-grabbing"
          style={{ width: CADRE_L, height: CADRE_H }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            glisse.current = { x: e.clientX, y: e.clientY, dx, dy };
          }}
          onPointerMove={(e) => {
            const g = glisse.current;
            if (g) setC((p) => ({ ...p, dx: g.dx + e.clientX - g.x, dy: g.dy + e.clientY - g.y }));
          }}
          onPointerUp={() => { glisse.current = null; }}
          onPointerCancel={() => { glisse.current = null; }}
        >
          {image && (
             
            <img src={source} alt="" draggable={false} className="pointer-events-none absolute max-w-none"
              style={{ left: gauche, top: haut, width: largeur, height: hauteur }} />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset ring-white/80" />
          <div className="pointer-events-none absolute left-1/2 top-[40%] h-[46%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/70" />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-700">
          <ZoomIn size={18} aria-hidden="true" />
          <span className="sr-only">Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={c.zoom}
            onChange={(e) => setC((p) => ({ ...p, zoom: Number(e.target.value) }))} className="w-full accent-amber-500" />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onAnnuler} className="rounded-xl bg-slate-100 py-3 font-bold text-slate-800">Annuler</button>
          <button type="button" onClick={valider} disabled={!image}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-black text-white disabled:opacity-50">
            <Check size={18} /> Valider
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PhotoEleve({
  apercu, onChange, compacte = false, retirable = true,
}: {
  /** URL de la photo actuelle (enregistrée ou en attente). */
  apercu: string | null;
  /** Photo recadrée prête à l'envoi, ou null pour la retirer. */
  onChange: (photo: Blob | null) => void;
  compacte?: boolean;
  /** Dossier existant : la photo se remplace, elle ne se retire pas. */
  retirable?: boolean;
}) {
  const entree = useRef<HTMLInputElement>(null);
  const [aRecadrer, setARecadrer] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => () => { if (aRecadrer) URL.revokeObjectURL(aRecadrer); }, [aRecadrer]);

  const choisir = (f: File | null | undefined) => {
    setErreur("");
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErreur("Choisissez une image (JPEG, PNG ou WebP).");
    if (f.size > 15 * 1024 * 1024) return setErreur("Image trop lourde (15 Mo au plus).");
    setARecadrer(URL.createObjectURL(f));
  };

  return (
    <div className={`flex items-center gap-4 ${compacte ? "" : "rounded-2xl border border-dashed border-slate-300 p-3"}`}>
      <div className="relative h-28 w-[84px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {apercu ? (
           
          <img src={apercu} alt="Photo de l'élève" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-slate-400"><Camera size={28} aria-hidden="true" /></span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-bold text-slate-800">Photo de l&apos;élève</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => entree.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">
            <ImagePlus size={16} aria-hidden="true" /> {apercu ? "Remplacer" : "Importer"}
          </button>
          <button type="button" onClick={() => setCamera(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-black">
            <Camera size={16} aria-hidden="true" /> Caméra
          </button>
          {apercu && retirable && (
            <button type="button" onClick={() => onChange(null)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
              <Trash2 size={16} aria-hidden="true" /> Retirer
            </button>
          )}
        </div>
        {erreur && <p role="alert" className="text-sm font-semibold text-red-700">{erreur}</p>}
        <input ref={entree} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden"
          onChange={(e) => { choisir(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {camera && (
        <CameraCapture mode="photo" photoSeulement dureeMax={0}
          onClose={() => setCamera(false)}
          onResult={(f) => { setCamera(false); choisir(f); }} />
      )}
      {aRecadrer && (
        <Recadrage source={aRecadrer}
          onAnnuler={() => setARecadrer(null)}
          onValider={(b) => { setARecadrer(null); onChange(b); }} />
      )}
    </div>
  );
}
