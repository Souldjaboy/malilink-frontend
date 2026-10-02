import WhatsAppSupportButton from "../../components/WhatsAppSupportButton";
import AbonnementClient from "../components/abonnement/AbonnementClient";
import { appProduct, productConfig } from "../lib/product-config";

/* MaliLink : écran de verrouillage complet (offre, montant dû, paiement,
   factures, support, déconnexion). Les autres produits gardent l'écran
   d'origine : leur backend n'a pas la facturation de la plateforme. */
export default function AbonnementExpirePage() {
  if (appProduct === "malilink") {
    return (
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <AbonnementClient modeVerrou />
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black md:p-8">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <div className="rounded-3xl bg-white p-8 text-center shadow-2xl md:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500 text-3xl font-black">
            T
          </div>
          <h1 className="mb-4 text-3xl font-bold md:text-4xl">
            Abonnement expiré
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            Votre abonnement {productConfig.name} a expiré. Veuillez renouveler
            votre licence pour continuer.
          </p>
          <div className="flex flex-col justify-center gap-3 md:flex-row">
            <a href="/support" className="rounded-xl bg-yellow-500 px-6 py-4 font-bold text-black">
              Renouveler abonnement
            </a>
            <WhatsAppSupportButton className="bg-black" />
            <a
              href="/login"
              className="rounded-xl border px-6 py-4 font-bold text-black"
            >
              Retour connexion
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
