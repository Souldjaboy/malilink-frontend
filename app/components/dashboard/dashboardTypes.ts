import type { LucideIcon } from "lucide-react";

/** Drapeaux de permission calculés à partir du rôle de l'utilisateur connecté. */
export type PermissionFlags = {
  isSuperAdmin: boolean;
  isAdminLike: boolean;
  canManageWarehouse: boolean;
  canViewDirectionModules: boolean;
  canViewAccounting: boolean;
  canUsePos: boolean;
  isReadOnlyRole: boolean;
};

/** Nom d'un drapeau de permission (utilisé de façon déclarative dans le registre). */
export type PermissionKey = keyof PermissionFlags;

/** Un lien / une carte de module du tableau de bord. */
export type DashboardItem = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** Clé de module à vérifier via moduleEnabled(). Absente = toujours actif. */
  module?: string;
  /** Le module est actif si au moins une de ces clés est active. */
  moduleAny?: string[];
  /** Permission requise (toutes) pour afficher l'élément. */
  requires?: PermissionKey[];
  /** Permission requise (au moins une) pour afficher l'élément. */
  requiresAny?: PermissionKey[];
  /** Toujours visible, quel que soit le module (ex. Tableau de bord, Recherche). */
  alwaysShow?: boolean;
  /** Affiche un badge de notifications non lues. */
  showUnreadBadge?: boolean;
};

/** Un groupe de modules (section du dashboard / groupe du sidebar). */
export type DashboardGroup = {
  key: string;
  title: string;
  description?: string;
  items: DashboardItem[];
};

/** Fonction de vérification d'activation d'un module (fournie par le dashboard). */
export type ModuleEnabledFn = (key: string) => boolean;

/** Une carte de statistique du tableau de bord. */
export type StatCardData = {
  key: string;
  label: string;
  value: number | string | null | undefined;
  icon?: LucideIcon;
  tone?: "navy" | "gold" | "green" | "red" | "orange" | "purple" | "blue" | "slate";
};

/** Identité de l'entreprise connectée. */
export type CompanyIdentity = {
  companyId: number | string | null;
  companyName: string;
  companyLogoUrl: string | null;
  companyInitial: string;
  businessType: string;
  planName: string;
  subscriptionStatus: string;
  isPlatform: boolean;
  hasCustomLogo: boolean;
  isLoading: boolean;
  refresh: () => void;
};
