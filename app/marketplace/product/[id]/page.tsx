import { notFound, permanentRedirect } from "next/navigation";
import { produitPublic } from "../../../lib/public-api";

/**
 * ANCIENNE URL DE FICHE PRODUIT — CONSERVÉE, REDIRIGÉE.
 *
 * `/marketplace/product/<id>` a pu être partagée, mise en favori ou déjà
 * indexée. Elle est donc maintenue et renvoie en 301 vers l'URL canonique
 * `/produit/<slug>-<id>`, ce qui transfère le référencement acquis au lieu de
 * le perdre.
 *
 * Aucun contenu n'est rendu ici : deux pages affichant le même produit
 * seraient un doublon que le moteur devrait arbitrer lui-même.
 */
type Props = { params: Promise<{ id: string }> };

export default async function AncienneFicheProduit({ params }: Props) {
  const { id } = await params;
  const produit = await produitPublic(Number(id) || 0);
  if (!produit) notFound();
  permanentRedirect(produit.url);
}
