"use client";

import { useState } from "react";
import type { CompanyIdentity } from "./dashboardTypes";

const MALILINK_LOGO = "/brands/malilink-logo-officiel.jpg";

type LogoSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<LogoSize, string> = {
  sm: "h-9 w-9 rounded-lg text-sm",
  md: "h-11 w-11 rounded-xl text-base",
  lg: "h-12 w-12 rounded-xl text-lg",
};

/**
 * Logo de l'entreprise connectée. Priorité :
 * 1) logo personnalisé de l'entreprise ;
 * 2) logo MaliLink si compte plateforme / super admin sans entreprise ;
 * 3) initiale du nom de l'entreprise (jamais d'image cassée).
 */
export function CompanyLogo({
  identity,
  size = "md",
}: {
  identity: CompanyIdentity;
  size?: LogoSize;
}) {
  const [broken, setBroken] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (identity.companyLogoUrl && !broken) {
    return (
      <img
        src={identity.companyLogoUrl}
        alt={`Logo ${identity.companyName}`}
        onError={() => setBroken(true)}
        className={`${sizeClass} shrink-0 border border-white/15 bg-white object-contain p-1`}
      />
    );
  }

  if (identity.isPlatform) {
    return (
      <img
        src={MALILINK_LOGO}
        alt="MaliLink Global"
        className={`${sizeClass} shrink-0 border border-white/15 bg-white object-contain p-0.5`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center bg-[#d4a23c] font-black text-[#0f1b3d]`}
      aria-hidden="true"
    >
      {identity.companyInitial}
    </div>
  );
}

/**
 * Bloc d'identité (logo + nom + mention secondaire). Utilisé dans le sidebar
 * et le header. Le variant "light" est destiné aux fonds sombres (sidebar).
 */
export default function DashboardCompanyIdentity({
  identity,
  size = "md",
  variant = "light",
  subtitle = "Propulsé par MaliLink",
}: {
  identity: CompanyIdentity;
  size?: LogoSize;
  variant?: "light" | "dark";
  subtitle?: string;
}) {
  const nameColor = variant === "light" ? "text-white" : "text-[#0f1b3d]";
  const subColor = variant === "light" ? "text-[#d4a23c]" : "text-gray-500";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CompanyLogo identity={identity} size={size} />
      <div className="min-w-0">
        <p className={`truncate text-base font-black ${nameColor}`}>{identity.companyName}</p>
        {subtitle && <p className={`truncate text-xs font-semibold ${subColor}`}>{subtitle}</p>}
      </div>
    </div>
  );
}
