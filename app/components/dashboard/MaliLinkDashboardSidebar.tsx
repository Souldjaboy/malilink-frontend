"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { authFetch } from "../../lib/api";
import DashboardCompanyIdentity from "./DashboardCompanyIdentity";
import { SIDEBAR_GROUPS, filterGroups } from "./dashboardModules";
import type { CompanyIdentity, ModuleEnabledFn, PermissionFlags } from "./dashboardTypes";

const NAVY = "#0f1b3d";

export type MaliLinkDashboardSidebarProps = {
  identity: CompanyIdentity;
  moduleEnabled: ModuleEnabledFn;
  permissions: PermissionFlags;
  onLogout: () => void;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MaliLinkDashboardSidebar({
  identity,
  moduleEnabled,
  permissions,
  onLogout,
}: MaliLinkDashboardSidebarProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname() || "";

  const groups = useMemo(
    () => filterGroups(SIDEBAR_GROUPS, moduleEnabled, permissions),
    [moduleEnabled, permissions]
  );

  // Badge rouge : notifications non lues de l'utilisateur connecté.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const userId = stored ? JSON.parse(stored)?.id : null;
    if (!userId) return;

    const loadUnread = () => {
      authFetch(`/notifications/${userId}`, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : []))
        .then((rows) => {
          if (!Array.isArray(rows)) return;
          setUnreadCount(rows.filter((row) => row.is_read === false || row.status === "unread").length);
        })
        .catch(() => {});
    };

    loadUnread();
    const interval = setInterval(loadUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 pb-5 pt-6">
        <DashboardCompanyIdentity identity={identity} size="lg" variant="light" />
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]"
        aria-label="Navigation principale"
      >
        {groups.map((group) => (
          <div key={group.key} className="mb-4">
            <p className="px-2 pb-1.5 text-[11px] font-black uppercase tracking-wider text-white/40">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl p-2.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#d4a23c] ${
                        active
                          ? "bg-[#d4a23c] text-[#0f1b3d]"
                          : "text-white/90 hover:bg-white/10"
                      }`}
                    >
                      <Icon size={18} className="shrink-0" aria-hidden="true" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.showUnreadBadge && unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 p-3 font-bold text-white outline-none transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-white"
        >
          <LogOut size={18} aria-hidden="true" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Barre mobile : logo + hamburger */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-2.5 lg:hidden"
        style={{ backgroundColor: NAVY }}
      >
        <DashboardCompanyIdentity identity={identity} size="sm" variant="light" subtitle="" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="relative rounded-xl bg-white/10 p-2.5 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#d4a23c]"
        >
          <Menu size={22} />
          {unreadCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white"
              aria-label={`${unreadCount} notifications non lues`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Tiroir mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] overflow-hidden shadow-2xl"
            style={{ backgroundColor: NAVY }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="absolute right-3 top-4 z-10 rounded-full bg-white/10 p-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#d4a23c]"
            >
              <X size={20} />
            </button>
            {content}
          </aside>
        </div>
      )}

      {/* Sidebar bureau */}
      <aside
        className="sticky top-0 hidden h-screen w-72 shrink-0 xl:w-80 lg:block"
        style={{ backgroundColor: NAVY }}
      >
        {content}
      </aside>
    </>
  );
}
