import Link from "next/link";
import PhotoPublique from "../../components/PhotoPublique";
import { notFound } from "next/navigation";
import { entreprisePublique } from "../../lib/public-api";
import {
  entrepriseJsonLd, filAriane, metadataPage, seoActif,
} from "../../lib/seo";
import { formatFCFA } from "../../lib/format";
import JsonLd from "../../components/JsonLd";

/**
 * VITRINE PUBLIQUE D'UN VENDEUR — RENDUE PAR LE SERVEUR.
 *
 * À ne pas confondre avec `/partenaires/<id>`, qui est la fiche CRM privée
 * d'un partenaire commercial (ventes, encaissements, impayés) et le reste.
 *
 * Ne s'affiche que si l'entreprise a explicitement rendu son profil public.
 * Téléphone et email n'apparaissent que si elle a coché de les montrer : le
 * backend ne les renvoie pas autrement.
 *
 * Les données de localisation viennent uniquement de ce que l'entreprise a
 * saisi. Rien n'est déduit, complété ni approché : une ville absente reste
 * absente, du contenu comme du JSON-LD.
 */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const donnees = await entreprisePublique(slug);
  if (!donnees) {
    return metadataPage({ titre: "Boutique introuvable", description: "", chemin: "/marketplace", noindex: true });
  }

  const e = donnees.company;
  const lieu = [e.quartier, e.city, e.region].filter(Boolean).join(", ");
  return metadataPage({
    titre: [e.name, lieu].filter(Boolean).join(" — "),
    description:
      e.description ||
      [
        e.name,
        lieu ? `est présent à ${lieu}` : "",
        donnees.products.length ? `et propose ${donnees.products.length} produit(s)` : "",
        "sur MaliLink Global.",
      ].filter(Boolean).join(" "),
    chemin: e.url,
    images: e.logo_url ? [e.logo_url] : [],
  });
}

export default async function Boutique({ params }: Props) {
  const { slug } = await params;
  const donnees = await entreprisePublique(slug);
  if (!donnees) notFound();

  const e = donnees.company;
  const produits = donnees.products;
  const lieu = [e.quartier, e.city, e.region, e.country].filter(Boolean).join(", ");
  const horaires = typeof e.opening_hours === "string" ? e.opening_hours : "";

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black md:p-8">
      {seoActif && (
        <>
          <JsonLd data={entrepriseJsonLd(e)} />
          <JsonLd
            data={filAriane([
              { nom: "Accueil", chemin: "/" },
              { nom: "Marketplace", chemin: "/marketplace" },
              { nom: e.name, chemin: e.url },
            ])}
          />
        </>
      )}

      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Accueil</Link>
        {" › "}
        <Link href="/marketplace" className="font-bold hover:underline">Marketplace</Link>
      </nav>

      <header className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow sm:flex-row sm:items-center">
        {e.logo_url && (
          <PhotoPublique
            src={e.logo_url}
            alt={e.name}
            width={112}
            height={112}
            priority
            className="h-28 w-28 shrink-0 rounded-2xl bg-gray-100 object-cover"
          />
        )}
        <div>
          <h1 className="text-3xl font-black md:text-4xl">{e.name}</h1>
          {lieu && <p className="mt-1 font-bold text-gray-600">{lieu}</p>}
          {e.description && <p className="mt-3 max-w-2xl text-gray-600">{e.description}</p>}

          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {e.address_line && (
              <div className="flex gap-2"><dt className="font-bold">Adresse :</dt><dd>{e.address_line}</dd></div>
            )}
            {e.phone && (
              <div className="flex gap-2">
                <dt className="font-bold">Téléphone :</dt>
                <dd><a href={`tel:${e.phone}`} className="underline">{e.phone}</a></dd>
              </div>
            )}
            {e.email && (
              <div className="flex gap-2">
                <dt className="font-bold">Email :</dt>
                <dd><a href={`mailto:${e.email}`} className="underline">{e.email}</a></dd>
              </div>
            )}
            {horaires && (
              <div className="flex gap-2"><dt className="font-bold">Horaires :</dt><dd>{horaires}</dd></div>
            )}
            {e.website && (
              <div className="flex gap-2">
                <dt className="font-bold">Site :</dt>
                <dd>
                  {/* Lien sortant déclaré par un tiers : on ne lui transmet
                      pas de référencement et on isole l'onglet ouvert. */}
                  <a href={e.website} rel="nofollow noopener noreferrer" target="_blank" className="underline">
                    {e.website}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      <h2 className="mt-8 text-2xl font-black">
        {produits.length ? `${produits.length} produit(s) en vente` : "Aucun produit publié pour le moment"}
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {produits.map((p, index) => (
          <Link key={p.id} href={p.url} className="rounded-2xl bg-white p-4 shadow hover:shadow-md">
            {p.image_url ? (
              <PhotoPublique
                src={p.image_url}
                alt={p.title}
                width={400}
                height={300}
                /* Seules les vignettes visibles d'emblée sont chargées tout de
                   suite ; les suivantes attendent le défilement. */
                priority={index < 4}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="h-40 w-full rounded-xl bg-gray-100 object-cover"
              />
            ) : (
              <div className="h-40 w-full rounded-xl bg-gray-100" />
            )}
            <h3 className="mt-3 font-bold">{p.title}</h3>
            <p className="mt-1 font-black text-green-700">{formatFCFA(p.price)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
