"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import {
  Activity,
  BarChart3,
  Bell,
  Bike,
  Bot,
  Boxes,
  Building2,
  Calculator,
  Car,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  QrCode,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  TriangleAlert,
  Users,
  Warehouse,
  X,
} from "lucide-react";

type SidebarLink = {
  href: string;
  label: string;
  icon: any;
  show: boolean;
};

type SidebarGroup = {
  title: string;
  links: SidebarLink[];
};

export type MaliLinkSidebarProps = {
  companyName: string;
  logoUrl?: string;
  moduleEnabled: (key: string) => boolean;
  isSuperAdmin: boolean;
  isAdminLike: boolean;
  canManageWarehouse: boolean;
  canViewDirectionModules: boolean;
  canViewAccounting: boolean;
  canUsePos: boolean;
  isReadOnlyRole: boolean;
  onLogout: () => void;
};

/* Sidebar MaliLink : liens groupés par métier, logo officiel,
   menu hamburger sur mobile. Utilisée uniquement quand
   appProduct === "malilink" — Triangle et Hafiya gardent
   leur sidebar historique. */
export default function MaliLinkSidebar(props: MaliLinkSidebarProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Badge rouge : nombre de notifications non lues de l'utilisateur.
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const userId = stored ? JSON.parse(stored)?.id : null;
    if (!userId) return;

    const loadUnread = () => {
      authFetch(`/notifications/${userId}`, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : []))
        .then((rows) => {
          if (!Array.isArray(rows)) return;
          setUnreadCount(
            rows.filter(
              (row) => row.is_read === false || row.status === "unread"
            ).length
          );
        })
        .catch(() => {});
    };

    loadUnread();
    const interval = setInterval(loadUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const {
    companyName,
    logoUrl,
    moduleEnabled,
    isSuperAdmin,
    isAdminLike,
    canManageWarehouse,
    canViewDirectionModules,
    canViewAccounting,
    canUsePos,
    isReadOnlyRole,
    onLogout,
  } = props;

  const groups: SidebarGroup[] = [
    {
      title: "Général",
      links: [
        { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, show: true },
        { href: "/recherche", label: "Recherche", icon: Search, show: true },
        { href: "/social", label: "MaliLink Social", icon: Users, show: moduleEnabled("social") },
        { href: "/notifications", label: "Notifications", icon: Bell, show: moduleEnabled("notifications") },
        { href: "/chat", label: "Chat interne", icon: MessageCircle, show: moduleEnabled("chat") },
      ],
    },
    {
      title: "Vente / Marketplace",
      links: [
        { href: "/marketplace", label: "Marketplace", icon: Store, show: moduleEnabled("marketplace") },
        { href: "/pos", label: "POS / Caisse", icon: ShoppingCart, show: canUsePos && moduleEnabled("pos") },
        { href: "/produits", label: "Produits", icon: Package, show: moduleEnabled("produits") },
        { href: "/stocks", label: "Stocks", icon: Boxes, show: moduleEnabled("stock") },
        { href: "/inventaires", label: "Inventaires", icon: ClipboardList, show: moduleEnabled("inventaire") },
        { href: "/scanner", label: "Scanner QR", icon: ScanLine, show: moduleEnabled("stock") },
        {
          href: "/partenaires",
          label: "Partenaires",
          icon: Handshake,
          show: canManageWarehouse && (moduleEnabled("crm") || moduleEnabled("partenaires")),
        },
      ],
    },
    {
      title: "Livraison",
      links: [
        { href: "/client/livraison", label: "Livraison client", icon: Package, show: moduleEnabled("livraison") },
        { href: "/livreur", label: "Espace livreur", icon: Truck, show: moduleEnabled("livraison") },
        { href: "/livreur/inscription", label: "Inscription livreur", icon: Bike, show: moduleEnabled("livraison") },
      ],
    },
    {
      title: "Éducation",
      links: [{ href: "/education", label: "Éducation", icon: GraduationCap, show: moduleEnabled("education") }],
    },
    {
      title: "Restaurant",
      links: [{ href: "/restaurant", label: "Restaurant", icon: Store, show: moduleEnabled("restaurant") }],
    },
    {
      title: "Immobilier / Hôtel",
      links: [
        {
          href: "/immobilier",
          label: "Immobilier / Hôtel",
          icon: Building2,
          show: moduleEnabled("immobilier") || moduleEnabled("hotel"),
        },
      ],
    },
    {
      title: "Automobile",
      links: [{ href: "/automobile", label: "Automobile", icon: Car, show: moduleEnabled("automobile") }],
    },
    {
      title: "Laboratoire",
      links: [{ href: "/laboratoire", label: "Laboratoire", icon: FlaskConical, show: moduleEnabled("laboratoire") }],
    },
    {
      title: "Gestion / Finance",
      links: [
        { href: "/comptabilite", label: "Comptabilité", icon: Calculator, show: canViewAccounting && moduleEnabled("comptabilite") },
        { href: "/documents", label: "Documents", icon: FileText, show: canViewDirectionModules && moduleEnabled("documents") },
        { href: "/rapports", label: "Rapports", icon: BarChart3, show: canViewDirectionModules && moduleEnabled("rapports") },
        { href: "/entrepots", label: "Entrepôts", icon: Warehouse, show: isAdminLike && moduleEnabled("entrepots") },
        { href: "/emplacements", label: "Emplacements", icon: MapPin, show: isAdminLike && moduleEnabled("emplacements") },
        { href: "/alertes", label: "Alertes", icon: TriangleAlert, show: (canManageWarehouse || isReadOnlyRole) && moduleEnabled("alertes") },
        { href: "/attendance-scan", label: "Pointage QR", icon: QrCode, show: moduleEnabled("pointage") },
        { href: "/pointage", label: "Pointage", icon: ClipboardCheck, show: moduleEnabled("pointage") },
        { href: "/activites", label: "Activités", icon: Activity, show: isAdminLike && moduleEnabled("activites") },
        { href: "/utilisateurs", label: "Utilisateurs", icon: Users, show: isAdminLike && moduleEnabled("utilisateurs") },
        { href: "/parametres", label: "Paramètres", icon: Settings, show: isAdminLike },
      ],
    },
    {
      title: "IA / Support",
      links: [
        { href: "/assistant", label: "Assistant IA", icon: Bot, show: moduleEnabled("ia") },
        { href: "/support", label: "Support", icon: LifeBuoy, show: true },
      ],
    },
    {
      title: "Administration",
      links: [{ href: "/super-admin", label: "Super Admin", icon: ShieldCheck, show: isSuperAdmin }],
    },
  ]
    .map((group) => ({ ...group, links: group.links.filter((link) => link.show) }))
    .filter((group) => group.links.length > 0);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <img
          src={logoUrl || "/brands/malilink-logo-officiel.jpg"}
          alt={companyName}
          className="h-12 w-12 rounded-xl bg-white object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{companyName}</p>
          <p className="text-xs text-yellow-400">MaliLink Global</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-wider text-white/40">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl p-2.5 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    <link.icon size={18} className="shrink-0" />
                    <span className="flex-1">{link.label}</span>
                    {link.href === "/notifications" && unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-5">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl bg-red-600 p-3 font-bold text-white hover:bg-red-700"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Barre mobile : logo + hamburger */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-[var(--ml-navy,#0f1b3d)] px-4 py-2.5 lg:hidden">
        <div className="flex items-center gap-2.5">
          <img
            src={logoUrl || "/brands/malilink-logo-officiel.jpg"}
            alt={companyName}
            className="h-9 w-9 rounded-lg bg-white object-cover"
          />
          <p className="max-w-[180px] truncate font-black text-white">{companyName}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="relative rounded-xl bg-white/10 p-2.5 text-white"
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
          <aside className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] overflow-hidden bg-[var(--ml-navy,#0f1b3d)] shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="absolute right-3 top-4 z-10 rounded-full bg-white/10 p-2 text-white"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Sidebar bureau */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 bg-[var(--ml-navy,#0f1b3d)] lg:block">
        {sidebarContent}
      </aside>
    </>
  );
}
