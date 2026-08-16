/**
 * Données structurées injectées dans le HTML rendu par le serveur.
 *
 * Le contenu est sérialisé puis les `<` sont échappés : une description
 * produit contenant « </script> » refermerait sinon la balise et injecterait
 * du balisage arbitraire dans la page.
 */
export default function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // Le contenu vient de notre propre sérialisation, jamais du visiteur.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
