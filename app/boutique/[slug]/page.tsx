import Link from "next/link";
import PhotoPublique from "../../components/PhotoPublique";
import { notFound } from "next/navigation";
import { Clock, Globe, Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { entreprisePublique, LIBELLES_RESEAUX, type ReseauPublic } from "../../lib/public-api";
import {
  entrepriseJsonLd, filAriane, metadataPage, seoActif,
} from "../../lib/seo";
import { formatFCFA } from "../../lib/format";
import JsonLd from "../../components/JsonLd";

/**
 * VITRINE PUBLIQUE D'UNE ENTREPRISE — RENDUE PAR LE SERVEUR.
 *
 * À ne pas confondre avec `/partenaires/<id>`, qui est la fiche CRM privée
 * d'un partenaire commercial (ventes, encaissements, impayés) et le reste.
 *
 * Ne s'affiche que si l'entreprise a explicitement rendu son profil public
 * (Paramètres → Profil public). Téléphone, email et produits n'apparaissent
 * que si elle a coché de les montrer : le backend ne les renvoie pas
 * autrement.
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
    return metadataPage({ titre: "Entreprise introuvable", description: "", chemin: "/entreprises", noindex: true });
  }

  const e = donnees.company;
  const lieu = [e.quartier, e.city].filter(Boolean).join(", ");
  return metadataPage({
    titre: [e.name, e.activity?.label, lieu].filter(Boolean).join(" — "),
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
  const reseaux = (Object.entries(e.social_links || {}) as Array<[ReseauPublic, string]>).filter(([, lien]) => lien);
  const services = e.services || [];
  const whatsapp = e.social_links?.whatsapp || "";
  const carte = e.latitude && e.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}`
    : lieu ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.name}, ${lieu}`)}` : "";

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      {seoActif && (
        <>
          <JsonLd data={entrepriseJsonLd(e)} />
          <JsonLd
            data={filAriane([
              { nom: "Accueil", chemin: "/" },
              { nom: "Entreprises", chemin: "/entreprises" },
              { nom: e.name, chemin: e.url },
            ])}
          />
        </>
      )}

      <header className="bg-[var(--ml-blue-deep,#0a1330)] px-4 pb-10 pt-5 text-white md:px-8">
        <nav aria-label="Fil d'Ariane" className="mx-auto max-w-6xl text-sm text-white/70">
          <Link href="/" className="text-white/70 hover:text-white hover:underline">Accueil</Link>
          {" › "}
          <Link href="/entreprises" className="text-white/70 hover:text-white hover:underline">Entreprises</Link>
          {" › "}
          <span className="text-white">{e.name}</span>
        </nav>

        <div className="mx-auto mt-6 flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center">
          {e.logo_url ? (
            <PhotoPublique
              src={e.logo_url}
              alt={`Logo ${e.name}`}
              width={112}
              height={112}
              priority
              className="h-24 w-24 shrink-0 rounded-2xl bg-white object-cover sm:h-28 sm:w-28"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-4xl font-black text-[var(--ml-gold,#d4a23c)] sm:h-28 sm:w-28"
            >
              {e.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            {e.activity?.label && (
              <p className="inline-flex rounded-full border border-[var(--ml-gold,#d4a23c)]/50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--ml-gold-light,#e8c464)]">
                {e.activity.label}
              </p>
            )}
            <h1 className="mt-2 break-words text-3xl font-black text-white md:text-4xl">{e.name}</h1>
            {lieu && (
              <p className="mt-1 flex items-center gap-1.5 font-semibold text-white/80">
                <MapPin size={16} aria-hidden="true" /> {lieu}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:px-8 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 shadow lg:col-span-2" aria-labelledby="presentation">
          <h2 id="presentation" className="text-xl font-black">Présentation</h2>
          {e.description ? (
            <p className="mt-3 whitespace-pre-line text-gray-700">{e.description}</p>
          ) : (
            <p className="mt-3 text-gray-500">L&apos;entreprise n&apos;a pas encore rédigé de présentation.</p>
          )}

          {services.length > 0 && (
            <>
              <h2 className="mt-8 text-xl font-black">Services</h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {services.map((s, i) => (
                  <li key={`${i}-${s.name}`} className="rounded-xl border border-gray-200 p-4">
                    <p className="font-bold">{s.name}</p>
                    {s.description && <p className="mt-1 text-sm text-gray-600">{s.description}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow" aria-labelledby="coordonnees">
          <h2 id="coordonnees" className="text-xl font-black">Coordonnées</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {e.address_line && (
              <div className="flex gap-2">
                <dt className="sr-only">Adresse</dt>
                <MapPin size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
                <dd>{e.address_line}{e.city ? `, ${e.city}` : ""}</dd>
              </div>
            )}
            {e.phone && (
              <div className="flex gap-2">
                <dt className="sr-only">Téléphone</dt>
                <Phone size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
                <dd><a href={`tel:${e.phone.replace(/\s+/g, "")}`} className="font-bold underline">{e.phone}</a></dd>
              </div>
            )}
            {e.email && (
              <div className="flex gap-2">
                <dt className="sr-only">Email</dt>
                <Mail size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
                <dd className="min-w-0 break-words"><a href={`mailto:${e.email}`} className="underline">{e.email}</a></dd>
              </div>
            )}
            {horaires && (
              <div className="flex gap-2">
                <dt className="sr-only">Horaires</dt>
                <Clock size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
                <dd>{horaires}</dd>
              </div>
            )}
            {e.website && (
              <div className="flex gap-2">
                <dt className="sr-only">Site web</dt>
                <Globe size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
                <dd className="min-w-0 break-words">
                  {/* Lien sortant déclaré par un tiers : on ne lui transmet
                      pas de référencement et on isole l'onglet ouvert. */}
                  <a href={e.website} rel="nofollow noopener noreferrer" target="_blank" className="underline">
                    {e.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-5 grid gap-2">
            {e.phone && <a href={`tel:${e.phone.replace(/\s+/g, "")}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ml-gold,#d4a23c)] px-4 py-3 font-black text-[var(--ml-blue-deep,#0a1330)]"><Phone size={18}/>Appeler</a>}
            {whatsapp && <a href={whatsapp} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-black text-white"><MessageCircle size={18}/>Écrire sur WhatsApp</a>}
            {carte && <a href={carte} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 font-bold"><Navigation size={18}/>Voir l’itinéraire</a>}
          </div>
          {!e.address_line && !e.phone && !e.email && !horaires && !e.website && (
            <p className="mt-3 text-sm text-gray-500">Aucune coordonnée publiée.</p>
          )}

          {reseaux.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-gray-500">Réseaux officiels</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {reseaux.map(([cle, lien]) => (
                  <li key={cle}>
                    <a
                      href={lien}
                      rel="nofollow noopener noreferrer"
                      target="_blank"
                      className="inline-flex rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-50"
                    >
                      {LIBELLES_RESEAUX[cle] || cle}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {e.products_public && (
          <section className="lg:col-span-3" aria-labelledby="produits">
            <h2 id="produits" className="text-2xl font-black">
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
          </section>
        )}
      </main>
    </div>
  );
}
