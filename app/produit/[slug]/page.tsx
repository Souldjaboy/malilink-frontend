import Link from "next/link";
import PhotoPublique from "../../components/PhotoPublique";
import { notFound, permanentRedirect } from "next/navigation";
import { produitPublic } from "../../lib/public-api";
import { filAriane, metadataPage, produitJsonLd, seoActif } from "../../lib/seo";
import { formatFCFA } from "../../lib/format";
import JsonLd from "../../components/JsonLd";
import AjouterAuPanier from "./AjouterAuPanier";

/**
 * FICHE PRODUIT PUBLIQUE — RENDUE PAR LE SERVEUR.
 *
 * Le nom, la description, le prix, la disponibilité, le vendeur et les images
 * sont présents dans le HTML. C'est la condition pour être indexé, et surtout
 * pour qu'un partage WhatsApp ou Facebook affiche un aperçu : ces robots-là
 * n'exécutent pas de JavaScript.
 *
 * URL : `/produit/<slug>-<id>`. L'identifiant final est la seule chose lue ;
 * le slug est un libellé. Un slug obsolète mène donc à la bonne fiche, puis
 * l'URL canonique est rétablie par redirection permanente.
 *
 * Aucune donnée d'entrepôt n'est disponible ici : le backend n'en renvoie pas.
 */

type Props = { params: Promise<{ slug: string }> };

const idDepuisSlug = (slug: string) => {
  const m = String(slug || "").match(/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const produit = await produitPublic(idDepuisSlug(slug));
  if (!produit) return metadataPage({ titre: "Produit introuvable", description: "", chemin: "/marketplace", noindex: true });

  /* Le lieu du vendeur n'entre dans le titre que s'il est réellement connu :
     c'est ce qui fait ressortir la fiche sur « produit + Bamako », et
     l'inventer produirait une promesse fausse. */
  const lieu = [produit.vendor.quartier, produit.vendor.city].filter(Boolean).join(", ");
  const vendeur = produit.vendor.name;

  return metadataPage({
    titre: [produit.title, lieu || vendeur].filter(Boolean).join(" — "),
    description:
      produit.description ||
      [
        produit.title,
        vendeur ? `proposé par ${vendeur}` : "",
        lieu ? `à ${lieu}` : "",
        "sur MaliLink Global.",
      ].filter(Boolean).join(" "),
    chemin: produit.url,
    images: produit.images,
    type: "article",
  });
}

export default async function FicheProduit({ params }: Props) {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  const produit = await produitPublic(id);
  if (!produit) notFound();

  /* Une seule URL canonique par produit : tout autre libellé y est renvoyé en
     301, pour ne pas disperser le référencement sur des doublons. */
  if (produit.url !== `/produit/${slug}`) permanentRedirect(produit.url);

  const lieu = [produit.vendor.quartier, produit.vendor.city].filter(Boolean).join(", ");
  const disponible = produit.availability === "InStock";
  const pageVendeur = produit.vendor.slug || produit.vendor.company_id;

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black md:p-8">
      {seoActif && (
        <>
          <JsonLd data={produitJsonLd(produit)} />
          <JsonLd
            data={filAriane([
              { nom: "Accueil", chemin: "/" },
              { nom: "Marketplace", chemin: "/marketplace" },
              ...(produit.category
                ? [{ nom: produit.category, chemin: `/marketplace?categorie=${encodeURIComponent(produit.category)}` }]
                : []),
              { nom: produit.title, chemin: produit.url },
            ])}
          />
        </>
      )}

      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Accueil</Link>
        {" › "}
        <Link href="/marketplace" className="font-bold hover:underline">Marketplace</Link>
        {produit.category && <> {" › "} <span>{produit.category}</span></>}
      </nav>

      <article className="grid grid-cols-1 gap-8 rounded-2xl bg-white p-6 shadow lg:grid-cols-2">
        <div>
          {produit.image_url ? (
            <PhotoPublique
              src={produit.image_url}
              alt={produit.title}
              width={800}
              height={800}
              /* Image principale : c'est le plus gros élément affiché, donc le
                 LCP de la page. Elle est prioritaire et jamais différée. */
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-96 w-full rounded-2xl bg-gray-100 object-cover"
            />
          ) : (
            <div className="flex h-96 items-center justify-center rounded-2xl bg-gray-100 font-bold text-gray-400">
              Image produit
            </div>
          )}
          {produit.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {produit.images.slice(1, 5).map((src) => (
                <PhotoPublique
                  key={src}
                  src={src}
                  alt={produit.title}
                  width={200}
                  height={200}
                  sizes="25vw"
                  className="h-20 w-full rounded-lg bg-gray-100 object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <section>
          <p className="font-bold text-gray-500">
            {produit.vendor.name ? (
              <>
                Publié par{" "}
                <Link href={`/boutique/${pageVendeur}`} className="underline">
                  {produit.vendor.name}
                </Link>
                {lieu && <span className="font-normal text-gray-500"> — {lieu}</span>}
              </>
            ) : (
              "Vendeur marketplace"
            )}
          </p>

          <h1 className="mt-2 text-4xl font-black">{produit.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-gray-600">
            {produit.description || "Aucune description."}
          </p>
          <p className="mt-6 text-4xl font-black text-green-700">{formatFCFA(produit.price)}</p>

          <dl className="mt-5 rounded-xl bg-gray-50 p-4">
            {produit.reference && (
              <div className="flex gap-2">
                <dt className="font-bold">Référence :</dt>
                <dd>{produit.reference}</dd>
              </div>
            )}
            {produit.category && (
              <div className="flex gap-2">
                <dt className="font-bold">Catégorie :</dt>
                <dd>{produit.category}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="font-bold">Disponibilité :</dt>
              <dd className={disponible ? "text-green-700" : "text-gray-500"}>
                {disponible ? "En stock" : "Momentanément indisponible"}
              </dd>
            </div>
          </dl>

          <AjouterAuPanier
            produitId={produit.id}
            companyId={produit.vendor.company_id}
            chemin={produit.url}
            disponible={disponible}
          />
        </section>
      </article>

      <p className="mt-6">
        <Link href="/marketplace" className="font-bold text-gray-600 hover:underline">
          ← Retour au marketplace
        </Link>
      </p>
    </div>
  );
}
