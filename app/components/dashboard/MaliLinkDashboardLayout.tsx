"use client";

import type { ReactNode } from "react";
import MaliLinkDashboardHeader from "./MaliLinkDashboardHeader";
import MaliLinkDashboardSidebar from "./MaliLinkDashboardSidebar";
import type { CompanyIdentity, ModuleEnabledFn, PermissionFlags } from "./dashboardTypes";

/**
 * Ossature du tableau de bord MaliLink : sidebar (desktop sticky / tiroir
 * mobile) + zone principale avec header et contenu. Aucune superposition, le
 * contenu utilise toute la largeur disponible.
 */
export default function MaliLinkDashboardLayout({
  identity,
  moduleEnabled,
  permissions,
  onLogout,
  children,
}: {
  identity: CompanyIdentity;
  moduleEnabled: ModuleEnabledFn;
  permissions: PermissionFlags;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <MaliLinkDashboardSidebar
        identity={identity}
        moduleEnabled={moduleEnabled}
        permissions={permissions}
        onLogout={onLogout}
      />
      <main className="min-w-0 flex-1">
        {/* Offset pour la barre mobile fixe du sidebar */}
        <div className="space-y-6 p-4 pt-16 md:p-6 lg:p-8 lg:pt-8">
          <MaliLinkDashboardHeader identity={identity} moduleEnabled={moduleEnabled} />
          {children}
        </div>
      </main>
    </div>
  );
}
