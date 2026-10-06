import { redirect } from "next/navigation";

/* Les échéanciers sont désormais créés à l'inscription et suivis dans
   « Frais & paiements » : l'ancien écran redirige (aucune donnée retirée). */
export default function MensualitesPage() {
  redirect("/education/paiements");
}
