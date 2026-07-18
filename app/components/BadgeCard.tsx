"use client";

import { QRCodeCanvas } from "qrcode.react";

/* Carte badge MaliLink — format PVC CR80 (85,60 × 53,98 mm).
   À l'écran : aperçu agrandi ; à l'impression : dimensions exactes en mm
   (voir les styles @media print de la page badges).
   Le QR encode UNIQUEMENT l'URL de vérification avec un jeton opaque. */

export const BADGE_TYPE_LABELS: Record<string, string> = {
  etudiant: "BADGE ÉTUDIANT",
  enseignant: "BADGE ENSEIGNANT",
  employe: "BADGE EMPLOYÉ",
  magasinier: "BADGE MAGASINIER",
  responsable: "BADGE RESPONSABLE",
  directeur: "BADGE DIRECTEUR",
  administrateur: "BADGE ADMINISTRATEUR",
  livreur: "BADGE LIVREUR",
  chauffeur: "BADGE CHAUFFEUR",
  laboratoire: "BADGE LABORATOIRE",
  restaurant: "BADGE RESTAURANT",
};

/* Couleur de bandeau selon le type de badge. */
export const BADGE_TYPE_COLORS: Record<string, string> = {
  etudiant: "#1d4ed8",
  enseignant: "#0f766e",
  employe: "#0f1b3d",
  magasinier: "#c2410c",
  responsable: "#6d28d9",
  directeur: "#b3862e",
  administrateur: "#111827",
  livreur: "#15803d",
  chauffeur: "#0e7490",
  laboratoire: "#0f766e",
  restaurant: "#b91c1c",
};

/* Code39 : encodage standard (n = barre étroite, w = barre large,
   alternance barre/espace). Suffisant pour matricules A-Z 0-9 - . */
const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw",
  C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn",
  G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
  O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn",
  S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw",
  W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
  "-": "nwnnnnwnw", "*": "nwnnwnwnn",
};

function Code39Svg({ value, height = 26 }: { value: string; height?: number }) {
  const text = `*${String(value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "")}*`;
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  for (const char of text) {
    const pattern = CODE39[char];
    if (!pattern) continue;
    pattern.split("").forEach((band, index) => {
      const width = band === "w" ? 2.4 : 1;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    });
    x += 1; // espace inter-caractères
  }
  return (
    <svg
      viewBox={`0 0 ${x} ${height}`}
      height={height}
      className="w-full"
      preserveAspectRatio="none"
      aria-label={`Code-barres ${value}`}
      role="img"
    >
      {bars.map((bar, index) => (
        <rect key={index} x={bar.x} y={0} width={bar.width} height={height} fill="#111" />
      ))}
    </svg>
  );
}

export type BadgeData = {
  id: number;
  fullname: string;
  role: string;
  matricule: string;
  badge_type: string;
  department?: string;
  company_name?: string;
  company_logo?: string;
  profile_image_url?: string;
  qr_token: string;
  status: string;
  valid_until?: string | null;
  created_at: string;
};

export function BadgeFront({ badge }: { badge: BadgeData }) {
  const color = BADGE_TYPE_COLORS[badge.badge_type] || "#0f1b3d";
  const label = BADGE_TYPE_LABELS[badge.badge_type] || "BADGE";
  const verifyUrl =
    (typeof window !== "undefined" ? window.location.origin : "https://malilinkglobal.com") +
    `/badge/${badge.qr_token}`;

  return (
    <div className="badge-card relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
      {/* En-tête : logos + entreprise */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-white"
        style={{ backgroundColor: "#0f1b3d" }}
      >
        <img src="/brands/malilink-logo-officiel.jpg" alt="MaliLink" className="h-7 w-7 rounded object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-black leading-tight">
            {badge.company_name || "MaliLink Global"}
          </p>
          <p className="text-[7px] text-white/70">MaliLink Global</p>
        </div>
        {badge.company_logo ? (
          <img src={badge.company_logo} alt="" className="h-7 w-7 rounded bg-white object-contain p-0.5" />
        ) : null}
      </div>

      {/* Bandeau type */}
      <p
        className="px-3 py-0.5 text-center text-[9px] font-black tracking-widest text-white"
        style={{ backgroundColor: color }}
      >
        {label}
      </p>

      {/* Corps */}
      <div className="flex flex-1 items-center gap-2.5 px-3 py-2">
        {badge.profile_image_url ? (
          <img
            src={badge.profile_image_url}
            alt=""
            className="h-16 w-14 rounded-lg border object-cover"
            style={{ borderColor: color }}
          />
        ) : (
          <span
            className="flex h-16 w-14 items-center justify-center rounded-lg text-xl font-black text-white"
            style={{ backgroundColor: color }}
          >
            {(badge.fullname || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black leading-tight text-black">{badge.fullname}</p>
          <p className="truncate text-[10px] font-bold" style={{ color }}>
            {badge.role}
          </p>
          {badge.department ? (
            <p className="truncate text-[9px] text-gray-500">{badge.department}</p>
          ) : null}
          <p className="mt-0.5 font-mono text-[9px] font-bold text-gray-700">{badge.matricule}</p>
          <p className="text-[7.5px] text-gray-400">
            Créé : {new Date(badge.created_at).toLocaleDateString("fr-FR")}
            {badge.valid_until
              ? ` · Expire : ${new Date(badge.valid_until).toLocaleDateString("fr-FR")}`
              : ""}
          </p>
        </div>
        <div className="shrink-0 rounded bg-white p-0.5">
          <QRCodeCanvas value={verifyUrl} size={54} level="M" />
        </div>
      </div>

      {/* Pied : code-barres */}
      <div className="px-3 pb-1.5">
        <Code39Svg value={badge.matricule} height={18} />
      </div>
    </div>
  );
}

export function BadgeBack({ badge }: { badge: BadgeData }) {
  const color = BADGE_TYPE_COLORS[badge.badge_type] || "#0f1b3d";
  return (
    <div className="badge-card relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
      <div className="h-2" style={{ backgroundColor: color }} />
      <div className="flex flex-1 flex-col justify-between px-3 py-2">
        <div>
          <p className="text-[9px] font-black text-black">
            {badge.company_name || "MaliLink Global"}
          </p>
          <ul className="mt-1 space-y-0.5 text-[7.5px] leading-snug text-gray-600">
            <li>• Ce badge est strictement personnel et reste la propriété de l&apos;établissement.</li>
            <li>• Il doit être porté visiblement pendant les heures de présence.</li>
            <li>• En cas de perte ou de vol, signalez-le immédiatement à l&apos;administration.</li>
            <li>• Toute personne trouvant ce badge est priée de le restituer.</li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[8px] font-bold text-gray-700">{badge.matricule}</p>
          <Code39Svg value={badge.matricule} height={16} />
          <p className="mt-0.5 text-center text-[7px] text-gray-400">
            Vérification : scannez le QR au recto — MaliLink Global
          </p>
        </div>
      </div>
    </div>
  );
}
