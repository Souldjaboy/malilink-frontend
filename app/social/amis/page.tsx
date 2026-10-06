import { redirect } from "next/navigation";

/* Les relations ont quitté la messagerie : tout est dans Réseau. */
export default function SocialAmisRedirection() {
  redirect("/social/reseau");
}
