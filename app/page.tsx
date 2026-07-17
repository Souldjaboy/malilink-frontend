import Link from "next/link";
import {
  Bike,
  Bot,
  Building2,
  Calculator,
  Car,
  FlaskConical,
  GraduationCap,
  Handshake,
  HeartHandshake,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  Truck,
  Utensils,
  UserRound,
} from "lucide-react";
import { appProduct } from "./lib/product-config";

const ROLE_CARDS = [
  {
    href: "/client/register",
    icon: UserRound,
    title: "Je suis client / acheteur",
    description:
      "Achetez sur la marketplace, commandez une livraison ou un taxi, suivez vos commandes.",
    button: "Créer un compte client",
  },
  {
    href: "/livreur/inscription",
    icon: Bike,
    title: "Je suis livreur / coursier / taxi",
    description:
      "Recevez des missions près de vous, livrez, et suivez vos revenus chaque jour.",
    button: "Devenir livreur",
  },
  {
    href: "/register",
    icon: Store,
    title: "Je suis une entreprise",
    description:
      "École, boutique, restaurant, labo, garage… Gérez toute votre activité au même endroit.",
    button: "Créer un compte entreprise",
  },
  {
    href: "/social",
    icon: HeartHandshake,
    title: "MaliLink Social",
    description:
      "Publications, amis, entreprises et réseau professionnel : rejoignez la communauté MaliLink.",
    button: "Rejoindre MaliLink Social",
  },
];

const WHY_MALILINK = [
  {
    icon: Smartphone,
    title: "Simple, sur votre téléphone",
    description: "Inscription avec votre numéro de téléphone. Pas besoin d’email.",
  },
  {
    icon: Handshake,
    title: "Adapté à votre métier",
    description: "Le tableau de bord s’adapte : école, commerce, restaurant, labo, transport…",
  },
  {
    icon: Bot,
    title: "Assistant IA intégré",
    description: "Posez vos questions en français : ventes, commandes, livraisons, école.",
  },
  {
    icon: ShieldCheck,
    title: "Vos données protégées",
    description: "Chaque entreprise et chaque client ne voit que ses propres données.",
  },
];

const MODULES = [
  { icon: ShoppingCart, label: "Marketplace" },
  { icon: Truck, label: "Livraison & taxi" },
  { icon: GraduationCap, label: "École / Éducation" },
  { icon: Utensils, label: "Restaurant" },
  { icon: Store, label: "POS / Caisse" },
  { icon: Package, label: "Stocks & produits" },
  { icon: FlaskConical, label: "Laboratoire" },
  { icon: Building2, label: "Immobilier / Hôtel" },
  { icon: Car, label: "Automobile" },
  { icon: Calculator, label: "Comptabilité" },
  { icon: Handshake, label: "B2B & partenaires" },
  { icon: Bot, label: "Assistant IA" },
];

function MaliLinkLanding() {
  return (
    <main className="min-h-screen bg-[var(--ml-blue,#0f1b3d)] text-white">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <img
            src="/brands/malilink-logo-officiel.jpg"
            alt="Logo MaliLink Global"
            className="h-12 w-12 rounded-xl object-cover"
          />
          <p className="text-lg font-black leading-tight text-white">
            MaliLink <span className="text-[var(--ml-gold,#d4a23c)]">Global</span>
          </p>
        </div>
        <Link
          href="/login"
          className="rounded-xl bg-[var(--ml-gold,#d4a23c)] px-5 py-3 font-bold text-[var(--ml-blue-deep,#0a1330)]"
        >
          Connexion
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 text-center md:px-6 md:pt-16">
        <p className="mx-auto inline-block rounded-full border border-[var(--ml-gold,#d4a23c)]/50 px-4 py-1.5 text-sm font-semibold text-[var(--ml-gold-light,#e8c464)]">
          La super-plateforme africaine
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">
          Vendez, achetez, livrez et gérez votre activité.{" "}
          <span className="text-[var(--ml-gold,#d4a23c)]">Au même endroit.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">
          MaliLink connecte les entreprises, les clients et les livreurs du Mali et d’Afrique.
          Marketplace, livraison, école, restaurant, comptabilité et assistant IA — dans un seul
          outil, en français.
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="rounded-2xl bg-[var(--ml-gold,#d4a23c)] px-8 py-4 text-lg font-black text-[var(--ml-blue-deep,#0a1330)] shadow-lg"
          >
            Créer un compte entreprise
          </Link>
          <Link
            href="/marketplace"
            className="rounded-2xl border-2 border-white/25 px-8 py-4 text-lg font-bold text-white hover:bg-white/10"
          >
            Explorer la marketplace
          </Link>
          <Link
            href="/social"
            className="rounded-2xl border-2 border-[var(--ml-gold,#d4a23c)]/70 px-8 py-4 text-lg font-bold text-[var(--ml-gold-light,#e8c464)] hover:bg-white/10"
          >
            Découvrir MaliLink Social
          </Link>
        </div>
      </section>

      {/* Choix du rôle */}
      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
        <h2 className="text-center text-2xl font-black text-white md:text-3xl">
          Choisissez votre compte
        </h2>
        <p className="mt-2 text-center text-white/70">
          Chaque profil a son espace dédié, dès l’inscription.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {ROLE_CARDS.map((card) => (
            <div
              key={card.href}
              className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-[var(--ml-gold,#d4a23c)]/60 hover:bg-white/10"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ml-gold,#d4a23c)] text-[var(--ml-blue-deep,#0a1330)]">
                <card.icon size={30} />
              </div>
              <h3 className="mt-4 text-xl font-black text-white">{card.title}</h3>
              <p className="mt-2 flex-1 text-white/75">{card.description}</p>
              <Link
                href={card.href}
                className="mt-5 rounded-xl bg-[var(--ml-gold,#d4a23c)] px-5 py-3.5 text-center font-black text-[var(--ml-blue-deep,#0a1330)]"
              >
                {card.button}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Pourquoi MaliLink */}
      <section className="bg-white px-4 py-14 md:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-black text-[var(--ml-blue,#0f1b3d)] md:text-3xl">
            Pourquoi MaliLink ?
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_MALILINK.map((item) => (
              <div key={item.title} className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ml-blue,#0f1b3d)] text-[var(--ml-gold,#d4a23c)]">
                  <item.icon size={24} />
                </div>
                <h3 className="mt-4 text-lg font-black text-[var(--ml-blue,#0f1b3d)]">{item.title}</h3>
                <p className="mt-1.5 text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Modules */}
          <h2 className="mt-14 text-center text-2xl font-black text-[var(--ml-blue,#0f1b3d)] md:text-3xl">
            Tous vos outils, un seul compte
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {MODULES.map((module) => (
              <div
                key={module.label}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ml-blue,#0f1b3d)]/5 text-[var(--ml-blue,#0f1b3d)]">
                  <module.icon size={20} />
                </span>
                <p className="text-sm font-bold text-[var(--ml-blue,#0f1b3d)]">{module.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final + footer */}
      <section className="px-4 py-14 text-center md:px-6">
        <h2 className="text-2xl font-black text-white md:text-3xl">Prêt à commencer ?</h2>
        <p className="mx-auto mt-2 max-w-xl text-white/75">
          Créez votre compte en 2 minutes avec votre numéro de téléphone.
        </p>
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href="/client/register"
            className="rounded-2xl bg-[var(--ml-gold,#d4a23c)] px-7 py-4 font-black text-[var(--ml-blue-deep,#0a1330)]"
          >
            Créer un compte client
          </Link>
          <Link
            href="/livreur/inscription"
            className="rounded-2xl border-2 border-[var(--ml-gold,#d4a23c)] px-7 py-4 font-bold text-[var(--ml-gold-light,#e8c464)]"
          >
            Devenir livreur / taxi
          </Link>
        </div>
        <footer className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm text-white/60">
          <Link href="/login" className="text-white/60 hover:text-white">Connexion</Link>
          <Link href="/marketplace" className="text-white/60 hover:text-white">Marketplace</Link>
          <Link href="/solutions" className="text-white/60 hover:text-white">Solutions</Link>
          <Link href="/contact" className="text-white/60 hover:text-white">Contact</Link>
          <Link href="/installer-application" className="text-white/60 hover:text-white">
            Installer l’application
          </Link>
          <span className="flex items-center gap-1.5">
            <MapPin size={14} /> Bamako, Mali — MaliLink Global
          </span>
        </footer>
      </section>
    </main>
  );
}

function LegacyHomePage() {
  return (
    <main className="min-h-screen bg-[#071B38] text-white overflow-hidden">
      <section className="relative min-h-screen flex items-center justify-center px-6 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#0A4F9A_0%,#071B38_35%,#020817_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#D4AF37]/25 to-transparent" />

        <div className="relative z-10 grid max-w-7xl w-full grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#D4AF37]/40 px-5 py-2 text-[#D4AF37]">
              Marketplace • IA • SaaS • Services numériques
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-tight">
              MALILINK <br />
              <span className="text-[#D4AF37]">GLOBAL</span>
            </h1>

            <p className="mt-6 text-xl text-blue-100 max-w-xl">
              Connecter l’Afrique, propulser le monde. Une plateforme moderne pour marketplace, entreprises, services, IA, paiements et gestion digitale.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a href="/login" className="rounded-xl bg-[#D4AF37] px-8 py-4 font-bold text-[#071B38] shadow-lg hover:bg-[#C9A227]">
                Se connecter
              </a>
              <a href="/marketplace" className="rounded-xl border border-white/20 px-8 py-4 font-bold hover:bg-white/10">
                Ouvrir Marketplace
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-8 shadow-2xl">
            <div className="rounded-2xl bg-[#020817]/80 p-6 border border-[#D4AF37]/30">
              <h2 className="text-2xl font-black text-[#D4AF37] mb-6">Tableau de bord MaliLink</h2>

              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Utilisateurs", "12,450"],
                  ["Entreprises", "320"],
                  ["Commandes", "1,850"],
                  ["Revenus", "25,850,000 CFA"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/10 p-5">
                    <p className="text-sm text-blue-200">{label}</p>
                    <p className="mt-2 text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-white/10 p-5">
                <p className="text-blue-200 mb-3">Modules principaux</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <span>✅ Marketplace</span>
                  <span>✅ Entreprises</span>
                  <span>✅ Paiements</span>
                  <span>✅ IA & Services</span>
                  <span>✅ Formations</span>
                  <span>✅ Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  if (appProduct === "malilink") {
    return <MaliLinkLanding />;
  }
  return <LegacyHomePage />;
}
