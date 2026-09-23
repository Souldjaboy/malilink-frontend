import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Package, Phone, Search } from "lucide-react";
import PhotoPublique from "../components/PhotoPublique";
import JsonLd from "../components/JsonLd";
import { annuairePublic } from "../lib/public-api";
import { annuaireJsonLd, filAriane, metadataPage, seoActif } from "../lib/seo";
import { appProduct } from "../lib/product-config";

/**
 * ANNUAIRE DES ENTREPRISES MALILINK — RENDU PAR LE SERVEUR.
 *
 * N'y figurent que les entreprises qui ont publié leur profil ET accepté
 * d'apparaître dans l'annuaire (Paramètres → Profil public). Aucune fiche
 * n'est ajoutée d'office, aucune n'est inventée pour « remplir » la page.
 *
 * Les filtres sont un simple formulaire GET : la page fonctionne sans
 * JavaScript et chaque combinaison a sa propre URL. Une recherche libre n'est
 * pas indexée (contenu trop volatil) ; les pages par ville ou par activité le
 * sont, avec leur propre URL canonique.
 *
 * MaliLink ne garantit aucun affichage dans les moteurs de recherche :
 * l'indexation et le classement relèvent du moteur.
 */

type Recherche = { q?: string; ville?: string; activite?: string; page?: string };
type Props = { searchParams: Promise<Recherche> };

function lireFiltres(sp: Recherche) {
  const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const page = Math.max(Math.floor(Number(sp.page) || 1), 1);
  return {
    q: texte(sp.q, 80),
    ville: texte(sp.ville, 80),
    activite: texte(sp.activite, 40).toLowerCase(),
    page,
  };
}

function cheminAvec(f: { ville?: string; activite?: string; q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.ville) params.set("ville", f.ville);
  if (f.activite) params.set("activite", f.activite);
  if (f.page && f.page > 1) params.set("page", String(f.page));
  const suite = params.toString();
  return `/entreprises${suite ? `?${suite}` : ""}`;
}

export async function generateMetadata({ searchParams }: Props) {
  const f = lireFiltres(await searchParams);
  const donnees = await annuairePublic(f);
  const activite = donnees?.facets.activities.find((a) => a.key === f.activite)?.label;
  const ville = donnees?.facets.cities.find((v) => v.name.toLowerCase() === f.ville.toLowerCase())?.name;

  const sujet = [activite, ville ? `à ${ville}` : ""].filter(Boolean).join(" ");
  const titre = sujet ? `Entreprises ${sujet} — Annuaire MaliLink` : "Annuaire des entreprises MaliLink";
  return metadataPage({
    titre: f.page > 1 ? `${titre} (page ${f.page})` : titre,
    description: sujet
      ? `Entreprises ${sujet} présentes sur MaliLink Global : coordonnées, services et produits publiés par les entreprises elles-mêmes.`
      : "Annuaire des entreprises présentes sur MaliLink Global : commerces, restaurants, écoles, services… Coordonnées, services et produits publiés par les entreprises elles-mêmes.",
    chemin: cheminAvec({ ville: f.ville, activite: f.activite, page: f.page }),
    // Recherche libre, filtre inconnu ou page vide : rien d'utile à indexer.
    noindex: Boolean(f.q) || !donnees || donnees.companies.length === 0,
  });
}

export default async function Entreprises({ searchParams }: Props) {
  // Annuaire propre à MaliLink : Triangle et Hafiya n'exposent rien ici.
  if (appProduct !== "malilink") notFound();

  const f = lireFiltres(await searchParams);
  const donnees = await annuairePublic(f);
  const fiches = donnees?.companies ?? [];
  const filtre = Boolean(f.q || f.ville || f.activite);

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      {seoActif && fiches.length > 0 && (
        <>
          <JsonLd data={annuaireJsonLd(fiches, (f.page - 1) * (donnees?.per_page ?? 24))} />
          <JsonLd data={filAriane([{ nom: "Accueil", chemin: "/" }, { nom: "Entreprises", chemin: "/entreprises" }])} />
        </>
      )}

      <header className="bg-[var(--ml-blue-deep,#0a1330)] px-4 pb-8 pt-5 text-white md:px-8">
        <nav aria-label="Fil d'Ariane" className="mx-auto max-w-6xl text-sm text-white/70">
          <Link href="/" className="text-white/70 hover:text-white hover:underline">Accueil</Link>
          {" › "}
          <span className="text-white">Entreprises</span>
        </nav>
        <div className="mx-auto mt-6 max-w-6xl">
          <h1 className="text-3xl font-black text-white md:text-5xl">Annuaire des entreprises</h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Les entreprises présentes sur MaliLink Global qui ont choisi de publier leur profil :
            coordonnées, services et produits, renseignés par elles-mêmes.
          </p>

          <form method="get" action="/entreprises" role="search" className="mt-6 grid grid-cols-1 gap-3 rounded-2xl bg-white/10 p-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <label className="relative block">
              <span className="sr-only">Rechercher une entreprise ou un service</span>
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                name="q"
                defaultValue={f.q}
                placeholder="Nom, service, quartier…"
                className="w-full rounded-xl bg-white py-3 pl-10 pr-3 text-black placeholder:text-gray-500"
              />
            </label>
            <label className="block">
              <span className="sr-only">Ville</span>
              <select name="ville" defaultValue={f.ville} className="w-full rounded-xl bg-white p-3 text-black">
                <option value="">Toutes les villes</option>
                {(donnees?.facets.cities ?? []).map((v) => (
                  <option key={v.name} value={v.name}>{v.name} ({v.total})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Activité</span>
              <select name="activite" defaultValue={f.activite} className="w-full rounded-xl bg-white p-3 text-black">
                <option value="">Toutes les activités</option>
                {(donnees?.facets.activities ?? []).map((a) => (
                  <option key={a.key} value={a.key}>{a.label} ({a.total})</option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-xl bg-[var(--ml-gold,#d4a23c)] px-6 py-3 font-black text-[var(--ml-blue-deep,#0a1330)]">
              Rechercher
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        {!donnees ? (
          <p className="rounded-2xl bg-white p-6 shadow">
            L&apos;annuaire est momentanément indisponible. Réessayez dans quelques instants.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold text-gray-700" aria-live="polite">
                {donnees.total === 0
                  ? filtre ? "Aucune entreprise ne correspond à ces critères." : "Aucune entreprise n'a encore publié son profil."
                  : `${donnees.total} entreprise${donnees.total > 1 ? "s" : ""}`}
              </p>
              {filtre && (
                <Link href="/entreprises" className="text-sm font-bold underline">Effacer les filtres</Link>
              )}
            </div>

            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fiches.map((e) => (
                <li key={e.company_id}>
                  <Link
                    href={e.url}
                    className="flex h-full flex-col rounded-2xl bg-white p-5 shadow transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ml-gold,#d4a23c)]"
                  >
                    <div className="flex items-center gap-3">
                      {e.logo_url ? (
                        <PhotoPublique
                          src={e.logo_url}
                          alt=""
                          width={56}
                          height={56}
                          className="h-14 w-14 shrink-0 rounded-xl bg-gray-100 object-cover"
                        />
                      ) : (
                        <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--ml-blue-deep,#0a1330)] text-xl font-black text-[var(--ml-gold,#d4a23c)]">
                          {e.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black">{e.name}</h2>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{e.activity.label}</p>
                      </div>
                    </div>

                    {e.description && <p className="mt-3 text-sm text-gray-700">{e.description}</p>}

                    {e.services.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Services">
                        {e.services.map((s) => (
                          <li key={s} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{s}</li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-sm text-gray-600">
                      {(e.city || e.quartier) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} aria-hidden="true" /> {[e.quartier, e.city].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {e.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={14} aria-hidden="true" /> {e.phone}
                        </span>
                      )}
                      {e.products_count > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Package size={14} aria-hidden="true" /> {e.products_count} produit{e.products_count > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {donnees.pages > 1 && (
              <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
                {f.page > 1 && (
                  <Link href={cheminAvec({ ...f, page: f.page - 1 })} rel="prev" className="rounded-xl bg-white px-4 py-2 font-bold shadow">
                    ← Précédente
                  </Link>
                )}
                <span className="text-sm text-gray-600">Page {Math.min(f.page, donnees.pages)} sur {donnees.pages}</span>
                {f.page < donnees.pages && (
                  <Link href={cheminAvec({ ...f, page: f.page + 1 })} rel="next" className="rounded-xl bg-white px-4 py-2 font-bold shadow">
                    Suivante →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}

        <section className="mt-10 rounded-2xl bg-[var(--ml-blue-deep,#0a1330)] p-6 text-white">
          <h2 className="text-xl font-black text-white">Votre entreprise dans l&apos;annuaire</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/80">
            Clients MaliLink : publiez votre profil depuis Paramètres → Profil public. Vous choisissez ce qui
            est affiché (téléphone, email, produits) et pouvez le retirer à tout moment. Votre page devient
            accessible à tous ; son apparition dans Google ou d&apos;autres moteurs dépend de leur indexation,
            que MaliLink ne peut pas garantir.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="rounded-xl bg-[var(--ml-gold,#d4a23c)] px-5 py-3 text-center font-black text-[var(--ml-blue-deep,#0a1330)]">
              Créer mon espace entreprise
            </Link>
            <Link href="/parametres/profil-public" className="rounded-xl border border-white/30 px-5 py-3 text-center font-bold text-white">
              Déjà client : mon profil public
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
