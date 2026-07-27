"use client";

import Link from "next/link";
import { Bell, Search, Wallet } from "lucide-react";
import InstallPWAButton from "../../../components/InstallPWAButton";
import { CompanyLogo } from "./DashboardCompanyIdentity";
import type { CompanyIdentity, ModuleEnabledFn } from "./dashboardTypes";

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "active" || s === "actif" || s === "illimité" || s === "illimite") {
    return "bg-green-100 text-green-700";
  }
  if (!s) return "bg-gray-100 text-gray-600";
  return "bg-red-100 text-red-700";
}

/**
 * Header professionnel du tableau de bord : identité entreprise, plan &
 * abonnement, et actions rapides (recherche, notifications, wallet, profil,
 * installation PWA). Entièrement responsive.
 */
export default function MaliLinkDashboardHeader({
  identity,
  moduleEnabled,
}: {
  identity: CompanyIdentity;
  moduleEnabled: ModuleEnabledFn;
}) {
  const { companyName, businessType, planName, subscriptionStatus } = identity;

  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden sm:block">
            <IdentityAvatar identity={identity} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#d4a23c]">Tableau de bord</p>
            <h1 className="truncate text-xl font-black text-[#0f1b3d] md:text-2xl">{companyName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {businessType && (
                <span className="rounded-full bg-[#0f1b3d] px-2.5 py-0.5 font-bold text-white">
                  {businessType}
                </span>
              )}
              {planName && (
                <span className="rounded-full bg-[#fbf4e6] px-2.5 py-0.5 font-bold text-[#9a6f1f]">
                  {planName}
                </span>
              )}
              {subscriptionStatus && (
                <span className={`rounded-full px-2.5 py-0.5 font-bold ${statusTone(subscriptionStatus)}`}>
                  {subscriptionStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconAction href="/recherche" label="Recherche" icon={Search} />
          {moduleEnabled("notifications") && (
            <IconAction href="/notifications" label="Notifications" icon={Bell} />
          )}
          {moduleEnabled("wallet") && (
            <IconAction href="/wallet" label="Wallet" icon={Wallet} />
          )}
          <Link
            href="/parametres"
            aria-label="Profil et paramètres"
            className="outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b3d] rounded-full"
          >
            <IdentityAvatar identity={identity} />
          </Link>
          <InstallPWAButton />
        </div>
      </div>
    </header>
  );
}

function IconAction({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Search;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-[#0f1b3d] outline-none transition hover:border-[#d4a23c] hover:text-[#b3862e] focus-visible:ring-2 focus-visible:ring-[#0f1b3d]"
    >
      <Icon size={18} aria-hidden="true" />
    </Link>
  );
}

function IdentityAvatar({ identity }: { identity: CompanyIdentity }) {
  // Réutilise le logo/initiale mais sur fond clair (bordure discrète).
  return (
    <span className="inline-flex">
      <CompanyLogo identity={identity} size="sm" />
    </span>
  );
}
