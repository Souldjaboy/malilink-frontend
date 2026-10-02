import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/super-admin",
  "/chat",
  "/recherche",
  "/assistant",
  "/notifications",
  "/produits",
  "/partenaires",
  "/stocks",
  "/inventaires",
  "/entrepots",
  "/emplacements",
  "/scanner",
  "/pos",
  "/comptabilite",
  "/laboratoire",
  "/documents",
  "/rapports",
  "/alertes",
  "/activites",
  "/utilisateurs",
  "/badges",
  "/attendance-scan",
  "/pointage",
  "/parametres-pointage",
  "/parametres",
  "/education",
  // Verticales et options de gestion : elles n'exigeaient même pas de
  // connexion côté middleware.
  "/restaurant",
  "/immobilier",
  "/automobile",
  "/travel/partenaire",
  "/wallet",
  "/import",
  "/livreur",
  "/cameras",
  "/marketing",
  "/pharmacie",
  "/reseau",
  "/profil",
];

// Pages publiques placées sous un préfixe protégé (menu QR d'un restaurant).
const publicUnderProtected = ["/restaurant/public"];

const protectedClientRoutes = [
  "/client/dashboard",
  "/client/orders",
  "/client/profile",
  "/client/laboratoire/rendez-vous",
  "/client/laboratoire/resultats",
  "/marketplace/cart",
  "/marketplace/checkout",
  "/marketplace/orders",
  "/livreur",
  "/client/livraison",
];

const moduleRouteMap: Record<string, string> = {
  "/assistant": "ia",
  "/produits": "produits",
  "/stocks": "stock",
  "/entrepots": "entrepots",
  "/emplacements": "emplacements",
  "/scanner": "stock",
  "/pos": "pos",
  "/pos/ventes": "ventes",
  "/pos/historique": "ventes",
  "/pos/recus": "ventes",
  "/pos/paiements": "ventes",
  "/pos/parametres-paiement": "paiements",
  "/comptabilite": "comptabilite",
  "/laboratoire": "laboratoire",
  "/inventaires": "inventaire",
  "/documents": "documents",
  "/rapports": "rapports",
  "/attendance-scan": "pointage",
  "/pointage": "pointage",
  "/parametres-pointage": "pointage",
  "/partenaires": "partenaires",
  // Verticales et options : absentes jusqu'ici, elles s'ouvraient par URL
  // directe même désactivées. Le cookie lu ici porte désormais le verdict
  // « Voir » calculé par le backend (société + droits de l'utilisateur).
  "/restaurant": "restaurant",
  "/education": "education",
  "/immobilier": "immobilier",
  "/automobile": "automobile",
  "/travel/partenaire": "voyage",
  "/wallet": "wallet",
  "/social": "social",
  "/chat": "chat",
  "/utilisateurs": "utilisateurs",
  "/activites": "activites",
  "/badges": "badges",
  "/alertes": "alertes",
  "/import": "import",
  "/livreur": "livraison",
  "/cameras": "cameras",
  "/marketing": "marketing",
  "/parametres/securite/biometrie": "biometrie",
  "/pharmacie": "pharmacie",
  "/reseau": "reseau",
};

function productFromRequest(req: NextRequest) {
  const host = req.nextUrl.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "malilinkglobal.com" || host === "malilink.trianglewmspro.com") return "malilink";
  if (host === "hafiyalab.com" || host === "afia.trianglewmspro.com") return "hafiya";
  return process.env.NEXT_PUBLIC_APP_PRODUCT || "triangle";
}

function isPublicRouteBlockedForProduct(pathname: string, product: string) {
  if (product === "malilink") return false;

  if (product === "hafiya") {
    return [
      "/marketplace",
      "/vendor",
      "/restaurant",
      "/immobilier",
      "/automobile",
      "/pos",
      "/register",
      "/solutions",
      "/services",
      "/a-propos",
    ].some((route) => pathname === route || pathname.startsWith(route + "/"));
  }

  return [
    "/marketplace",
    "/client",
    "/vendor",
    "/restaurant",
    "/immobilier",
    "/automobile",
    "/register",
    "/solutions",
    "/services",
    "/a-propos",
  ].some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function readJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function readModulesCookie(value?: string) {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const product = productFromRequest(req);

  if (pathname === "/" && product !== "malilink") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isPublicRouteBlockedForProduct(pathname, product)) {
    return NextResponse.redirect(new URL("/login?module=indisponible", req.url));
  }

  const isClientProtected = protectedClientRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  const isProtected =
    !publicUnderProtected.some((route) => pathname === route || pathname.startsWith(route + "/")) &&
    protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));

  if (!isProtected && !isClientProtected) return NextResponse.next();

  const token = isClientProtected
    ? req.cookies.get("triangle_client_token")?.value ||
      req.cookies.get("triangle_business_token")?.value ||
      req.cookies.get("triangle_token")?.value
    : req.cookies.get("triangle_business_token")?.value ||
      req.cookies.get("triangle_token")?.value;

  if (!token) {
    const redirectUrl = isClientProtected ? "/client/login" : "/login";
    const redirect = new URL(redirectUrl, req.url);
    redirect.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirect);
  }

  const payload = readJwtPayload(token);
  const role = String(payload?.role || "").toLowerCase();
  const isSuperAdminCookie = req.cookies.get("triangle_super_admin")?.value;
  const tokenSaysSuperAdmin =
    payload?.is_super_admin === true ||
    payload?.is_super_admin === "true" ||
    payload?.is_super_admin === 1 ||
    role === "super_admin";
  const isAdmin = tokenSaysSuperAdmin || role === "admin";
  const isDirection = role === "directeur" || role === "direction";
  const isCustomer = role === "customer";
  const subscriptionStatus = String(
    req.cookies.get("triangle_subscription_status")?.value || payload?.subscription_status || ""
  ).toLowerCase();
  const modules = readModulesCookie(req.cookies.get("triangle_modules")?.value);
  const subscriptionBlocked = [
    "expired",
    "expiré",
    "expire",
    "suspended",
    "suspendu",
    "inactive",
    "inactif"
  ].includes(subscriptionStatus);

  if (isClientProtected) {
    if (isCustomer) return NextResponse.next();

    if (pathname.startsWith("/client/")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/super-admin")) {
    if (isSuperAdminCookie !== "true" && !tokenSaysSuperAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (isCustomer) {
    return NextResponse.redirect(new URL("/client/dashboard", req.url));
  }

  if (!tokenSaysSuperAdmin && subscriptionBlocked) {
    return NextResponse.redirect(new URL("/abonnement-expire", req.url));
  }

  if (!tokenSaysSuperAdmin && modules) {
    const matchedModule = Object.entries(moduleRouteMap)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([route]) => pathname === route || pathname.startsWith(route + "/"))?.[1];

    if (matchedModule && modules[matchedModule] === false) {
      return NextResponse.redirect(
        new URL(`/dashboard?module=${matchedModule}`, req.url)
      );
    }
  }

  /* Biométrie : la direction y a droit côté serveur (centre des droits) ;
     l'écran vérifie ensuite chaque droit. Le reste des paramètres reste
     réservé à l'administration. */
  const pageBiometrie = pathname.startsWith("/parametres/securite/biometrie");

  if (
    pathname.startsWith("/parametres") ||
    pathname.startsWith("/parametres-pointage") ||
    pathname.startsWith("/pos/parametres-paiement")
  ) {
    if (!isAdmin && !(pageBiometrie && isDirection)) {
      return NextResponse.redirect(
        new URL("/dashboard?access=admin", req.url)
      );
    }
  }

  if (pathname.startsWith("/documents") || pathname.startsWith("/rapports")) {
    if (!isAdmin && !isDirection) {
      return NextResponse.redirect(
        new URL("/dashboard?access=direction", req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/super-admin/:path*",
    "/chat/:path*",
    "/recherche/:path*",
    "/assistant/:path*",
    "/notifications/:path*",
    "/produits/:path*",
    "/partenaires/:path*",
    "/stocks/:path*",
    "/inventaires/:path*",
    "/entrepots/:path*",
    "/emplacements/:path*",
    "/scanner/:path*",
    "/pos/:path*",
    "/comptabilite/:path*",
    "/laboratoire/:path*",
    "/documents/:path*",
    "/rapports/:path*",
    "/alertes/:path*",
    "/activites/:path*",
    "/utilisateurs/:path*",
    "/badges/:path*",
    "/attendance-scan/:path*",
    "/pointage/:path*",
    "/parametres-pointage/:path*",
    "/parametres/:path*",
    "/client/dashboard/:path*",
    "/client/orders/:path*",
    "/client/profile/:path*",
    "/client/laboratoire/rendez-vous/:path*",
    "/client/laboratoire/resultats/:path*",
    "/marketplace/cart/:path*",
    "/marketplace/checkout/:path*",
    "/marketplace/orders/:path*",
    "/",
    "/register/:path*",
    "/marketplace/:path*",
    "/client/:path*",
    "/vendor/:path*",
    "/restaurant/:path*",
    "/immobilier/:path*",
    "/automobile/:path*",
    "/education/:path*",
    "/travel/partenaire/:path*",
    "/wallet/:path*",
    "/social/:path*",
    "/import/:path*",
    "/livreur/:path*",
    "/cameras/:path*",
    "/marketing/:path*",
    "/profil/:path*",
    "/solutions/:path*",
    "/services/:path*",
    "/a-propos/:path*",
  ],
};
