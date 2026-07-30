import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bell,
  Bike,
  Boxes,
  Bot,
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
  Landmark,
  MapPin,
  MessageCircle,
  Package,
  Plane,
  QrCode,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  TriangleAlert,
  Upload,
  Users,
  Utensils,
  Wallet,
  Warehouse,
  BookOpen,
  CalendarDays,
  ClipboardPen,
  CreditCard,
  Receipt,
  Stethoscope,
  UtensilsCrossed,
  Users2,
} from "lucide-react";
import { isProductModuleEnabled, type ProductModule } from "../../lib/product-config";
import type { DashboardGroup, ModuleEnabledFn, PermissionFlags } from "./dashboardTypes";

/**
 * Correspondance entre les clés « dashboard » utilisées dans l'UI et les
 * modules produit déclarés dans product-config. Source unique de vérité.
 */
export const productModuleByDashboardKey: Record<string, ProductModule> = {
  ia: "ia",
  marketplace: "marketplace",
  automobile: "automobile",
  immobilier: "immobilier",
  hotel: "immobilier",
  restaurant: "restaurants",
  laboratoire: "laboratoire",
  pos: "pos",
  comptabilite: "comptabilite",
  stock: "stock",
  produits: "stock",
  inventaire: "stock",
  entrepots: "entrepots",
  emplacements: "entrepots",
  pointage: "pointage",
  documents: "documents",
  rapports: "rapports",
  crm: "crm",
  partenaires: "crm",
  utilisateurs: "utilisateurs",
  badges: "badges",
  notifications: "notifications",
  alertes: "notifications",
  chat: "chat",
  activites: "logistique",
  education: "education",
  livraison: "livraison",
  social: "social",
  voyage: "voyage",
  wallet: "wallet",
};

/**
 * Normalise une clé de module vers sa forme canonique.
 * Évite qu'un module autorisé soit masqué à cause d'un alias (stocks vs stock…).
 */
const MODULE_ALIASES: Record<string, string> = {
  stocks: "stock",
  inventaires: "inventaire",
  produit: "produits",
  partenaire: "partenaires",
  travel: "voyage",
  voyages: "voyage",
  assistant: "ia",
  finance: "comptabilite",
  compta: "comptabilite",
  hotel: "immobilier",
  attendance: "pointage",
  "attendance-scan": "pointage",
  livreur: "livraison",
  restaurants: "restaurant",
  alerte: "alertes",
};

export function normalizeModuleKey(key: string): string {
  const clean = String(key || "").trim().toLowerCase();
  return MODULE_ALIASES[clean] || clean;
}

/**
 * Crée la fonction moduleEnabled centralisée : respecte à la fois les modules
 * produit (product-config) et les modules activés pour l'entreprise (cookie/API).
 * Le super admin voit tous les modules du produit actif.
 */
export function createModuleEnabled(
  companyModules: Record<string, unknown>,
  isSuperAdmin: boolean
): ModuleEnabledFn {
  const modules = companyModules || {};
  return (rawKey: string) => {
    const key = normalizeModuleKey(rawKey);
    const productModule = productModuleByDashboardKey[key];
    if (productModule && !isProductModuleEnabled(productModule)) return false;
    if (isSuperAdmin) return true;
    return modules[key] !== false;
  };
}

/**
 * Groupes du sidebar MaliLink. Chaque lien pointe vers une route réelle et est
 * filtré par module + permission. Un groupe vide n'est pas affiché.
 */
export const SIDEBAR_GROUPS: DashboardGroup[] = [
  {
    key: "general",
    title: "Général",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, alwaysShow: true },
      { href: "/recherche", label: "Recherche", icon: Search, alwaysShow: true },
      { href: "/assistant", label: "Assistant IA", icon: Bot, module: "ia" },
      { href: "/social", label: "MaliLink Social", icon: Users2, module: "social" },
      { href: "/chat", label: "Chat interne", icon: MessageCircle, module: "chat" },
      { href: "/notifications", label: "Notifications", icon: Bell, module: "notifications", showUnreadBadge: true },
    ],
  },
  {
    key: "commerce",
    title: "Commerce / Marketplace",
    items: [
      { href: "/marketplace", label: "Marketplace", icon: Store, module: "marketplace" },
      { href: "/pos", label: "POS / Caisse", icon: ShoppingCart, module: "pos", requiresAny: ["canUsePos"] },
      { href: "/produits", label: "Produits", icon: Package, module: "produits" },
      { href: "/stocks", label: "Stocks", icon: Boxes, module: "stock" },
      { href: "/inventaires", label: "Inventaires", icon: ClipboardList, module: "inventaire" },
      { href: "/scanner", label: "Scanner QR", icon: ScanLine, module: "stock" },
      { href: "/partenaires", label: "Partenaires", icon: Handshake, moduleAny: ["crm", "partenaires"], requires: ["canManageWarehouse"] },
    ],
  },
  {
    key: "livraison",
    title: "Livraison",
    items: [
      { href: "/client/livraison", label: "Livraison client", icon: Package, module: "livraison" },
      { href: "/livreur", label: "Espace livreur", icon: Truck, module: "livraison" },
      { href: "/livreur/inscription", label: "Inscription livreur", icon: Bike, module: "livraison" },
    ],
  },
  {
    key: "voyage",
    title: "Voyage",
    items: [
      { href: "/travel", label: "Voyage", icon: Plane, module: "voyage" },
      { href: "/travel/mes-voyages", label: "Mes voyages", icon: CalendarDays, module: "voyage" },
      { href: "/travel/partenaire", label: "Espace partenaire", icon: Building2, module: "voyage" },
      { href: "/travel/promotions", label: "Promotions", icon: BadgeCheck, module: "voyage" },
    ],
  },
  {
    key: "finance",
    title: "Finance / Gestion",
    items: [
      { href: "/wallet", label: "Wallet", icon: Wallet, module: "wallet" },
      { href: "/finance", label: "Finance", icon: Landmark, module: "comptabilite", requires: ["canViewAccounting"] },
      { href: "/comptabilite", label: "Comptabilité", icon: Calculator, module: "comptabilite", requires: ["canViewAccounting"] },
      { href: "/factures", label: "Factures", icon: FileText, module: "comptabilite", requires: ["canViewAccounting"] },
      { href: "/camions", label: "Camions", icon: Truck, module: "comptabilite", requires: ["canViewAccounting"] },
      { href: "/rapports", label: "Rapports", icon: BarChart3, module: "rapports", requires: ["canViewDirectionModules"] },
      { href: "/documents", label: "Documents", icon: FileText, module: "documents", requires: ["canViewDirectionModules"] },
      { href: "/activites", label: "Activités", icon: Activity, module: "activites", requires: ["isAdminLike"] },
    ],
  },
  {
    key: "education",
    title: "Éducation",
    items: [
      { href: "/education", label: "Éducation", icon: GraduationCap, module: "education" },
      { href: "/education/eleves", label: "Élèves", icon: Users, module: "education" },
      { href: "/education/professeurs", label: "Professeurs", icon: Users2, module: "education" },
      { href: "/education/classes", label: "Classes", icon: BookOpen, module: "education" },
      { href: "/education/cours", label: "Cours", icon: BookOpen, module: "education" },
      { href: "/education/emploi-du-temps", label: "Emploi du temps", icon: CalendarDays, module: "education" },
      { href: "/education/presences", label: "Présences", icon: ClipboardCheck, module: "education" },
      { href: "/education/notes", label: "Notes", icon: ClipboardPen, module: "education" },
      { href: "/education/paiements", label: "Paiements", icon: CreditCard, module: "education" },
      { href: "/education/mensualites", label: "Mensualités", icon: CalendarDays, module: "education" },
      { href: "/education/inscriptions", label: "Inscriptions", icon: FileText, module: "education" },
      { href: "/education/parametres", label: "Paramètres", icon: Settings, module: "education" },
    ],
  },
  {
    key: "restaurant",
    title: "Restaurant",
    items: [
      { href: "/restaurant", label: "Restaurant", icon: Utensils, module: "restaurant" },
      { href: "/restaurant/commandes", label: "Commandes", icon: ClipboardList, module: "restaurant" },
      { href: "/restaurant/cuisine", label: "Cuisine", icon: UtensilsCrossed, module: "restaurant" },
      { href: "/restaurant/menu", label: "Menu", icon: BookOpen, module: "restaurant" },
      { href: "/restaurant/paiements", label: "Paiements", icon: CreditCard, module: "restaurant" },
      { href: "/restaurant/tables", label: "Tables", icon: LayoutDashboard, module: "restaurant" },
      { href: "/restaurant/serveurs", label: "Serveurs", icon: Users, module: "restaurant" },
      { href: "/restaurant/qr", label: "QR Restaurant", icon: QrCode, module: "restaurant" },
    ],
  },
  {
    key: "immobilier",
    title: "Immobilier / Hôtel",
    items: [
      { href: "/immobilier", label: "Immobilier", icon: Building2, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/biens", label: "Biens", icon: Building2, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/locations", label: "Locations", icon: FileText, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/ventes", label: "Ventes", icon: Receipt, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/contrats", label: "Contrats", icon: FileText, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/paiements", label: "Paiements", icon: CreditCard, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/hotel", label: "Hôtel", icon: Building2, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/reservations", label: "Réservations", icon: CalendarDays, moduleAny: ["immobilier", "hotel"] },
    ],
  },
  {
    key: "automobile",
    title: "Automobile",
    items: [
      { href: "/automobile", label: "Automobile", icon: Car, module: "automobile" },
      { href: "/automobile/vehicules", label: "Véhicules", icon: Car, module: "automobile" },
      { href: "/automobile/locations", label: "Locations", icon: FileText, module: "automobile" },
      { href: "/automobile/ventes", label: "Ventes", icon: Receipt, module: "automobile" },
      { href: "/automobile/contrats", label: "Contrats", icon: FileText, module: "automobile" },
      { href: "/automobile/paiements", label: "Paiements", icon: CreditCard, module: "automobile" },
      { href: "/automobile/documents", label: "Documents", icon: FileText, module: "automobile" },
    ],
  },
  {
    key: "laboratoire",
    title: "Laboratoire",
    items: [
      { href: "/laboratoire", label: "Laboratoire", icon: FlaskConical, module: "laboratoire" },
      { href: "/laboratoire/patients", label: "Patients", icon: Users, module: "laboratoire" },
      { href: "/laboratoire/rendez-vous", label: "Rendez-vous", icon: CalendarDays, module: "laboratoire" },
      { href: "/laboratoire/analyses", label: "Analyses", icon: Stethoscope, module: "laboratoire" },
      { href: "/laboratoire/resultats", label: "Résultats", icon: FileText, module: "laboratoire" },
      { href: "/laboratoire/paiements", label: "Paiements", icon: CreditCard, module: "laboratoire" },
      { href: "/laboratoire/documents", label: "Documents", icon: FileText, module: "laboratoire" },
      { href: "/laboratoire/parametres", label: "Paramètres", icon: Settings, module: "laboratoire" },
    ],
  },
  {
    key: "logistique",
    title: "Logistique / Stock",
    items: [
      { href: "/entrepots", label: "Entrepôts", icon: Warehouse, module: "entrepots", requires: ["isAdminLike"] },
      { href: "/emplacements", label: "Emplacements", icon: MapPin, module: "emplacements", requires: ["isAdminLike"] },
      { href: "/alertes", label: "Alertes", icon: TriangleAlert, module: "alertes", requiresAny: ["canManageWarehouse", "isReadOnlyRole"] },
    ],
  },
  {
    key: "administration",
    title: "Administration",
    items: [
      { href: "/utilisateurs", label: "Utilisateurs", icon: Users, module: "utilisateurs", requires: ["isAdminLike"] },
      { href: "/parametres/permissions", label: "Droits & permissions", icon: ShieldCheck, requires: ["isAdminLike"] },
      { href: "/import", label: "Centre d'importation", icon: Upload, module: "import", requires: ["isAdminLike"] },
      { href: "/pointage", label: "Pointage", icon: ClipboardCheck, module: "pointage" },
      { href: "/attendance-scan", label: "Pointage QR", icon: QrCode, module: "pointage" },
      { href: "/parametres-pointage", label: "Paramètres de pointage", icon: Settings, module: "pointage", requires: ["isAdminLike"] },
      { href: "/badges", label: "Badges", icon: BadgeCheck, module: "badges", requires: ["isAdminLike"] },
      { href: "/parametres", label: "Paramètres", icon: Settings, requires: ["isAdminLike"] },
      { href: "/support", label: "Support", icon: LifeBuoy, alwaysShow: true },
      { href: "/super-admin", label: "Super Admin", icon: ShieldCheck, requires: ["isSuperAdmin"] },
    ],
  },
];

/**
 * Sections du tableau de bord (grille de cartes). Réutilise la même logique de
 * filtrage ; chaque carte a une description courte.
 */
export const DASHBOARD_SECTIONS: DashboardGroup[] = [
  {
    key: "commerce",
    title: "Commerce / Marché",
    items: [
      { href: "/marketplace", label: "Marketplace", description: "Vendez et achetez sur la marketplace multi-vendeurs.", icon: Store, module: "marketplace" },
      { href: "/pos", label: "POS / Caisse", description: "Caisse rapide, ventes, tickets et paiements en boutique.", icon: CreditCard, module: "pos", requiresAny: ["canUsePos"] },
      { href: "/produits", label: "Produits", description: "Catalogue, prix, stocks et codes-barres.", icon: Boxes, module: "produits" },
      { href: "/stocks", label: "Stocks", description: "Niveaux de stock, entrées et sorties.", icon: Boxes, module: "stock" },
      { href: "/inventaires", label: "Inventaires", description: "Comptages et ajustements d'inventaire.", icon: ClipboardList, module: "inventaire" },
      { href: "/scanner", label: "Scanner", description: "Scan QR / code-barres des articles.", icon: ScanLine, module: "stock" },
      { href: "/partenaires", label: "Partenaires", description: "Fournisseurs, clients et partenaires.", icon: Handshake, moduleAny: ["crm", "partenaires"], requires: ["canManageWarehouse"] },
    ],
  },
  {
    key: "livraison",
    title: "Livraison",
    items: [
      { href: "/client/livraison", label: "Livraison client", description: "Demander une livraison et suivre une commande.", icon: Package, module: "livraison" },
      { href: "/livreur", label: "Espace livreur", description: "Missions, revenus et statut des livreurs.", icon: Truck, module: "livraison" },
      { href: "/livreur/inscription", label: "Inscription livreur", description: "Devenir livreur, coursier ou taxi partenaire.", icon: Bike, module: "livraison" },
    ],
  },
  {
    key: "voyage",
    title: "Voyage",
    items: [
      { href: "/travel", label: "Voyage", description: "Comparez et réservez bus, avions et taxis.", icon: Plane, module: "voyage" },
      { href: "/travel/mes-voyages", label: "Mes voyages", description: "Vos réservations et billets.", icon: CalendarDays, module: "voyage" },
      { href: "/travel/partenaire", label: "Partenaire", description: "Gérez vos trajets et véhicules.", icon: Building2, module: "voyage" },
      { href: "/travel/promotions", label: "Promotions", description: "Offres et réductions transport.", icon: BadgeCheck, module: "voyage" },
    ],
  },
  {
    key: "finance",
    title: "Finance / Gestion",
    items: [
      { href: "/wallet", label: "Wallet", description: "Solde, transferts internes, reçus et historique.", icon: Wallet, module: "wallet" },
      { href: "/finance", label: "Finance", description: "Revenus, dépenses, bénéfices et trésorerie.", icon: Landmark, module: "comptabilite", requires: ["canViewAccounting"] },
      { href: "/comptabilite", label: "Comptabilité", description: "Factures, dépenses, trésorerie et paie.", icon: Calculator, module: "comptabilite", requires: ["canViewAccounting"] },
      { href: "/factures", label: "Factures", description: "États des factures : payé, partiel, impayé.", icon: FileText, module: "comptabilite", requires: ["canViewAccounting"] },
      { href: "/camions", label: "Camions", description: "Parc, recettes/dépenses par camion.", icon: Truck, module: "comptabilite", requires: ["canViewAccounting"] },
      { href: "/rapports", label: "Rapports", description: "Rapports d'activité, ventes et performances.", icon: BarChart3, module: "rapports", requires: ["canViewDirectionModules"] },
      { href: "/documents", label: "Documents", description: "Documents et pièces de l'entreprise.", icon: FileText, module: "documents", requires: ["canViewDirectionModules"] },
      { href: "/activites", label: "Activités", description: "Journal des activités et opérations.", icon: Activity, module: "activites", requires: ["isAdminLike"] },
      { href: "/badges", label: "Badges", description: "Générer, imprimer et vérifier les badges QR.", icon: BadgeCheck, module: "badges", requires: ["isAdminLike"] },
    ],
  },
  {
    key: "education",
    title: "École / Éducation",
    items: [
      { href: "/education", label: "Éducation", description: "Écoles, élèves, classes et paiements scolaires.", icon: GraduationCap, module: "education" },
      { href: "/education/eleves", label: "Élèves", description: "Inscriptions, matricules et badges QR.", icon: Users, module: "education" },
      { href: "/education/professeurs", label: "Professeurs", description: "Fiches, matricules et affectations.", icon: Users2, module: "education" },
      { href: "/education/classes", label: "Classes", description: "Niveaux, matières et coefficients.", icon: BookOpen, module: "education" },
      { href: "/education/cours", label: "Cours", description: "Supports, leçons et liens vidéo.", icon: BookOpen, module: "education" },
      { href: "/education/presences", label: "Présences", description: "Appel, retards et absences.", icon: ClipboardCheck, module: "education" },
      { href: "/education/notes", label: "Notes", description: "Évaluations, moyennes et bulletins.", icon: ClipboardPen, module: "education" },
      { href: "/education/paiements", label: "Paiements", description: "Frais, reçus et impayés.", icon: CreditCard, module: "education" },
      { href: "/education/mensualites", label: "Mensualités", description: "Échéanciers de scolarité et reçus.", icon: CalendarDays, module: "education" },
      { href: "/education/inscriptions", label: "Inscriptions", description: "Fiches PDF et frais d'inscription.", icon: FileText, module: "education" },
    ],
  },
  {
    key: "restaurant",
    title: "Restaurant",
    items: [
      { href: "/restaurant", label: "Restaurant", description: "Menus, commandes et livraison de repas.", icon: Utensils, module: "restaurant" },
      { href: "/restaurant/commandes", label: "Commandes", description: "Suivi des commandes en cours.", icon: ClipboardList, module: "restaurant" },
      { href: "/restaurant/cuisine", label: "Cuisine", description: "Écran cuisine et préparation.", icon: UtensilsCrossed, module: "restaurant" },
      { href: "/restaurant/menu", label: "Menu", description: "Plats, catégories et prix.", icon: BookOpen, module: "restaurant" },
      { href: "/restaurant/paiements", label: "Paiements", description: "Encaissements et additions.", icon: CreditCard, module: "restaurant" },
      { href: "/restaurant/tables", label: "Tables", description: "Plan de salle et occupation.", icon: LayoutDashboard, module: "restaurant" },
      { href: "/restaurant/serveurs", label: "Serveurs", description: "Équipe de service et affectations.", icon: Users, module: "restaurant" },
    ],
  },
  {
    key: "immobilier",
    title: "Immobilier / Hôtel",
    items: [
      { href: "/immobilier", label: "Immobilier", description: "Biens, locations, ventes et hôtellerie.", icon: Building2, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/biens", label: "Biens", description: "Catalogue des biens immobiliers.", icon: Building2, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/locations", label: "Locations", description: "Baux et locations en cours.", icon: FileText, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/ventes", label: "Ventes", description: "Transactions et ventes de biens.", icon: Receipt, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/contrats", label: "Contrats", description: "Contrats et documents signés.", icon: FileText, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/hotel", label: "Hôtel", description: "Chambres et gestion hôtelière.", icon: Building2, moduleAny: ["immobilier", "hotel"] },
      { href: "/immobilier/reservations", label: "Réservations", description: "Réservations et disponibilités.", icon: CalendarDays, moduleAny: ["immobilier", "hotel"] },
    ],
  },
  {
    key: "automobile",
    title: "Automobile",
    items: [
      { href: "/automobile", label: "Automobile", description: "Véhicules, ventes, locations et garage.", icon: Car, module: "automobile" },
      { href: "/automobile/vehicules", label: "Véhicules", description: "Parc automobile et disponibilité.", icon: Car, module: "automobile" },
      { href: "/automobile/locations", label: "Locations", description: "Contrats de location de véhicules.", icon: FileText, module: "automobile" },
      { href: "/automobile/ventes", label: "Ventes", description: "Ventes et transactions.", icon: Receipt, module: "automobile" },
      { href: "/automobile/contrats", label: "Contrats", description: "Contrats et documents.", icon: FileText, module: "automobile" },
      { href: "/automobile/paiements", label: "Paiements", description: "Encaissements et échéances.", icon: CreditCard, module: "automobile" },
      { href: "/automobile/documents", label: "Documents", description: "Cartes grises et pièces.", icon: FileText, module: "automobile" },
    ],
  },
  {
    key: "laboratoire",
    title: "Laboratoire",
    items: [
      { href: "/laboratoire", label: "Laboratoire", description: "Analyses, rendez-vous et résultats.", icon: FlaskConical, module: "laboratoire" },
      { href: "/laboratoire/patients", label: "Patients", description: "Dossiers patients.", icon: Users, module: "laboratoire" },
      { href: "/laboratoire/rendez-vous", label: "Rendez-vous", description: "Planning des rendez-vous.", icon: CalendarDays, module: "laboratoire" },
      { href: "/laboratoire/analyses", label: "Analyses", description: "Catalogue et prescriptions.", icon: Stethoscope, module: "laboratoire" },
      { href: "/laboratoire/resultats", label: "Résultats", description: "Résultats et comptes rendus.", icon: FileText, module: "laboratoire" },
      { href: "/laboratoire/paiements", label: "Paiements", description: "Facturation et encaissements.", icon: CreditCard, module: "laboratoire" },
    ],
  },
  {
    key: "communication",
    title: "IA / Communication",
    items: [
      { href: "/assistant", label: "Assistant IA", description: "Assistant intelligent pour vos décisions.", icon: Bot, module: "ia" },
      { href: "/social", label: "Social", description: "Réseau social MaliLink.", icon: Users2, module: "social" },
      { href: "/chat", label: "Chat", description: "Messagerie interne de l'équipe.", icon: MessageCircle, module: "chat" },
      { href: "/notifications", label: "Notifications", description: "Alertes et notifications.", icon: Bell, module: "notifications" },
      { href: "/recherche", label: "Recherche", description: "Recherche globale dans l'application.", icon: Search, alwaysShow: true },
    ],
  },
  {
    key: "administration",
    title: "Administration",
    items: [
      { href: "/utilisateurs", label: "Utilisateurs", description: "Comptes, rôles et permissions.", icon: Users, module: "utilisateurs", requires: ["isAdminLike"] },
      { href: "/parametres/permissions", label: "Droits & permissions", description: "Autorisations des employés par module et sous-module.", icon: ShieldCheck, requires: ["isAdminLike"] },
      { href: "/import", label: "Centre d'importation", description: "Importer Excel/CSV : produits, stock, comptabilité…", icon: Upload, module: "import", requires: ["isAdminLike"] },
      { href: "/entrepots", label: "Entrepôts", description: "Gestion des entrepôts.", icon: Warehouse, module: "entrepots", requires: ["isAdminLike"] },
      { href: "/emplacements", label: "Emplacements", description: "Emplacements de stockage.", icon: MapPin, module: "emplacements", requires: ["isAdminLike"] },
      { href: "/pointage", label: "Pointage", description: "Pointage du personnel.", icon: ClipboardCheck, module: "pointage" },
      { href: "/attendance-scan", label: "Pointage QR", description: "Pointage par scan de badge QR.", icon: QrCode, module: "pointage" },
      { href: "/alertes", label: "Alertes", description: "Alertes stock et opérations.", icon: TriangleAlert, module: "alertes", requiresAny: ["canManageWarehouse", "isReadOnlyRole"] },
      { href: "/support", label: "Support", description: "Aide et assistance MaliLink.", icon: LifeBuoy, alwaysShow: true },
      { href: "/parametres", label: "Paramètres", description: "Réglages de l'entreprise.", icon: Settings, requires: ["isAdminLike"] },
      { href: "/super-admin", label: "Super Admin", description: "Administration de la plateforme.", icon: ShieldCheck, requires: ["isSuperAdmin"] },
    ],
  },
];

/** Un élément est-il visible pour cet utilisateur (module + permissions) ? */
function itemVisible(
  item: DashboardGroup["items"][number],
  moduleEnabled: ModuleEnabledFn,
  permissions: PermissionFlags
): boolean {
  // Module
  if (!item.alwaysShow) {
    if (item.moduleAny && item.moduleAny.length > 0) {
      if (!item.moduleAny.some((key) => moduleEnabled(key))) return false;
    } else if (item.module) {
      if (!moduleEnabled(item.module)) return false;
    }
  }
  // Permissions (toutes)
  if (item.requires && item.requires.length > 0) {
    if (!item.requires.every((flag) => permissions[flag])) return false;
  }
  // Permissions (au moins une)
  if (item.requiresAny && item.requiresAny.length > 0) {
    if (!item.requiresAny.some((flag) => permissions[flag])) return false;
  }
  return true;
}

/** Filtre des groupes : retire les éléments interdits puis les groupes vides. */
export function filterGroups(
  groups: DashboardGroup[],
  moduleEnabled: ModuleEnabledFn,
  permissions: PermissionFlags
): DashboardGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => itemVisible(item, moduleEnabled, permissions)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Ordonne les sections selon le type d'activité de l'entreprise : le métier
 * principal remonte en tête. Réutilise la normalisation accent-insensible.
 */
const BUSINESS_PRIORITIES: Array<{ match: string[]; order: string[] }> = [
  { match: ["ecole", "education", "universite", "institut", "formation"], order: ["education", "communication", "finance"] },
  { match: ["restaurant", "restauration", "cafe", "maquis"], order: ["restaurant", "commerce", "livraison"] },
  { match: ["laboratoire", "labo", "sante", "clinique", "pharmacie"], order: ["laboratoire", "communication", "finance"] },
  { match: ["automobile", "auto", "garage", "vehicule", "voiture"], order: ["automobile", "commerce", "finance"] },
  { match: ["immobilier", "hotel", "residence"], order: ["immobilier", "commerce", "finance"] },
  { match: ["logistique", "transport", "livraison", "coursier"], order: ["livraison", "voyage", "commerce"] },
  { match: ["voyage", "agence de voyage", "tourisme"], order: ["voyage", "commerce", "communication"] },
  { match: ["b2b", "grossiste", "fournisseur", "distribution"], order: ["commerce", "finance", "livraison"] },
  { match: ["commerce", "boutique", "magasin", "vente", "shop"], order: ["commerce", "livraison", "finance"] },
];

export function normalizeBusinessType(businessType: string): string {
  return String(businessType || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function orderSectionsForBusiness(
  sections: DashboardGroup[],
  businessType: string
): { sections: DashboardGroup[]; matched: boolean } {
  const normalized = normalizeBusinessType(businessType);
  const priority = normalized
    ? BUSINESS_PRIORITIES.find(({ match }) => match.some((keyword) => normalized.includes(keyword)))
    : undefined;
  const order = priority?.order || [];
  const orderedKeys = [
    ...order,
    ...sections.map((section) => section.key).filter((key) => !order.includes(key)),
  ];
  const ordered = orderedKeys
    .map((key) => sections.find((section) => section.key === key))
    .filter((section): section is DashboardGroup => Boolean(section));
  return { sections: ordered, matched: Boolean(priority) };
}
