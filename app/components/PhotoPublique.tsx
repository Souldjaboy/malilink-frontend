import Image from "next/image";

/**
 * Photo d'une page publique, optimisée quand c'est possible et sûr.
 *
 * Les images du catalogue existent sous deux formes en base : un chemin
 * relatif `/uploads/…` et une URL absolue `…/api/uploads/…`. S'y ajoutent des
 * URL externes saisies par les vendeurs, dont l'hôte n'est pas connu à
 * l'avance.
 *
 * `next/image` exige que chaque hôte distant soit déclaré dans next.config :
 * une URL venant d'un domaine non déclaré ne dégrade pas l'affichage, elle
 * lève une erreur et casse la page. Comme la liste des hôtes ne peut pas être
 * établie d'avance, on optimise ce qui est servi par notre propre origine et
 * on rend les autres avec une balise simple — dimensionnée et différée, donc
 * sans décalage de mise en page.
 */

/** Ramène les chemins internes derrière le proxy `/api`, seul chemin servi. */
export function sourceImage(url: string) {
  const brut = String(url || "").trim();
  if (!brut) return "";
  if (/^https?:\/\//i.test(brut)) return brut;
  if (brut.startsWith("/api/")) return brut;
  if (brut.startsWith("/uploads/")) return `/api${brut}`;
  return brut;
}

const estInterne = (src: string) => src.startsWith("/");

export default function PhotoPublique({
  src, alt, width, height, className, priority = false, sizes,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** À réserver à l'image principale : c'est elle qui décide du LCP. */
  priority?: boolean;
  sizes?: string;
}) {
  const source = sourceImage(src);
  if (!source) return <div className={className} aria-hidden />;

  if (estInterne(source)) {
    return (
      <Image
        src={source}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <img
      src={source}
      alt={alt}
      width={width}
      height={height}
      /* Dimensions explicites : le navigateur réserve la place avant le
         chargement, ce qui évite le décalage de mise en page. */
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
