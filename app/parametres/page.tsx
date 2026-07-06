"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import { appProduct, productConfig } from "../lib/product-config";

const isMaliLink = appProduct === "malilink";

export default function ParametresPage() {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
  });

  const [formData, setFormData] = useState({
    company_name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo_url: "",
    slogan: "",
    business_type: "",
    city: "",
    country: "",
    description: "",
    currency: "FCFA",
    opening_hours: "",
    whatsapp_number: "",
    facebook_url: "",
    instagram_url: "",
  });

  const fetchSettings = async () => {
    // /company-settings/current renvoie les paramètres de l'entreprise
    // connectée (identité + colonnes étendues + business_type).
    const response = await authFetch("/company-settings/current", { cache: "no-store" });
    const data = await response.json().catch(() => null);

    if (data) {
      setFormData((current) => ({
        ...current,
        company_name: data.company_name || "",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        website: data.website || "",
        logo_url: data.logo_url || "",
        slogan: data.slogan || "",
        business_type: data.business_type || "",
        city: data.city || "",
        country: data.country || "Mali",
        description: data.description || "",
        currency: data.currency || "FCFA",
        opening_hours: data.opening_hours || "",
        whatsapp_number: data.whatsapp_number || "",
        facebook_url: data.facebook_url || "",
        instagram_url: data.instagram_url || "",
      }));
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setIsReadOnly(user.role === "direction" || user.role === "client");
    }
    fetchSettings();
  }, []);

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogoUpload = async (e: any) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setMessage("");

    const uploadData = new FormData();
    uploadData.append("logo", file);

    const response = await fetch("/api/upload-logo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: uploadData,
    });

    const data = await response.json();

    if (data.logo_url) {
      setFormData({
        ...formData,
        logo_url: data.logo_url,
      });

      setMessage("Logo uploadé avec succès. N’oublie pas d’enregistrer les paramètres.");
    }

    setUploading(false);
  };

  const handleDownloadLogo = () => {
    if (!formData.logo_url) return;

    const link = document.createElement("a");
    link.href = formData.logo_url;
    link.download = "logo-entreprise";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (isReadOnly) {
      setMessage("Vous avez un accès lecture seule.");
      return;
    }

    await fetch("/api/company-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: JSON.stringify(formData),
    });

    setMessage("Paramètres entreprise enregistrés avec succès.");
  };

  const handlePasswordSubmit = async (e: any) => {
    e.preventDefault();
    setMessage("");

    const response = await fetch("/api/me/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: JSON.stringify(passwordForm),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Erreur changement mot de passe.");
      return;
    }

    setPasswordForm({ current_password: "", new_password: "" });
    setMessage("Mot de passe modifié avec succès.");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <h1 className="text-4xl font-bold text-black mb-2">
        Paramètres entreprise
      </h1>

      <p className="text-gray-500 mb-8">
        Informations utilisées dans les rapports, PDF et documents officiels.
      </p>

      {message && (
        <div className="bg-green-100 text-green-700 p-4 rounded-xl mb-6 font-bold">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-2xl shadow grid grid-cols-1 gap-4"
        >
          <input
            type="text"
            name="company_name"
            placeholder="Nom entreprise"
            value={formData.company_name}
            onChange={handleChange}
            className="border p-3 rounded-xl text-black"
          />

          <textarea
            name="address"
            placeholder="Adresse"
            value={formData.address}
            onChange={handleChange}
            className="border p-3 rounded-xl text-black"
          />

          <input
            type="text"
            name="phone"
            placeholder="Téléphone"
            value={formData.phone}
            onChange={handleChange}
            className="border p-3 rounded-xl text-black"
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="border p-3 rounded-xl text-black"
          />

          <input
            type="text"
            name="website"
            placeholder="Site web"
            value={formData.website}
            onChange={handleChange}
            className="border p-3 rounded-xl text-black"
          />

          {isMaliLink && (
            <>
              <select
                name="business_type"
                value={formData.business_type}
                onChange={handleChange}
                className="border p-3 rounded-xl text-black bg-white"
              >
                <option value="">Type d&apos;activité...</option>
                <option value="commerce">Commerce / Boutique</option>
                <option value="restaurant">Restaurant</option>
                <option value="ecole">École / Éducation</option>
                <option value="laboratoire">Laboratoire</option>
                <option value="immobilier">Immobilier / Hôtel</option>
                <option value="automobile">Automobile / Garage</option>
                <option value="logistique">Livraison / Transport</option>
                <option value="sante">Santé / Clinique</option>
                <option value="services">Services</option>
                <option value="b2b">B2B / Grossiste</option>
                <option value="autre">Autre</option>
              </select>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  name="city"
                  placeholder="Ville (ex : Bamako)"
                  value={formData.city}
                  onChange={handleChange}
                  className="border p-3 rounded-xl text-black"
                />
                <input
                  type="text"
                  name="country"
                  placeholder="Pays"
                  value={formData.country}
                  onChange={handleChange}
                  className="border p-3 rounded-xl text-black"
                />
              </div>

              <textarea
                name="description"
                placeholder="Description de l'entreprise (visible par les clients)"
                value={formData.description}
                onChange={handleChange}
                className="border p-3 rounded-xl text-black"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  name="opening_hours"
                  placeholder="Horaires (ex : Lun-Sam 8h-18h)"
                  value={formData.opening_hours}
                  onChange={handleChange}
                  className="border p-3 rounded-xl text-black"
                />
                <input
                  type="text"
                  name="whatsapp_number"
                  placeholder="WhatsApp (ex : +223 ...)"
                  value={formData.whatsapp_number}
                  onChange={handleChange}
                  className="border p-3 rounded-xl text-black"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  name="facebook_url"
                  placeholder="Page Facebook (optionnel)"
                  value={formData.facebook_url}
                  onChange={handleChange}
                  className="border p-3 rounded-xl text-black"
                />
                <input
                  type="text"
                  name="instagram_url"
                  placeholder="Instagram (optionnel)"
                  value={formData.instagram_url}
                  onChange={handleChange}
                  className="border p-3 rounded-xl text-black"
                />
              </div>
            </>
          )}

          <div className="border rounded-xl p-4">
            <p className="font-bold text-black mb-3">
              Logo entreprise
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="border p-3 rounded-xl text-black w-full"
            />

            {uploading && (
              <p className="text-blue-600 font-bold mt-3">
                Upload en cours...
              </p>
            )}

            <input
              type="text"
              name="logo_url"
              placeholder="URL du logo"
              value={formData.logo_url}
              onChange={handleChange}
              className="border p-3 rounded-xl text-black w-full mt-3"
            />
          </div>

          <textarea
            name="slogan"
            placeholder="Slogan"
            value={formData.slogan}
            onChange={handleChange}
            className="border p-3 rounded-xl text-black"
          />

          <button
            type="submit"
            disabled={isReadOnly}
            className="bg-yellow-500 text-black font-bold rounded-xl py-3"
          >
            {isReadOnly ? "Lecture seule" : "Enregistrer les paramètres"}
          </button>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="bg-white p-6 rounded-2xl shadow grid grid-cols-1 gap-4"
        >
          <h2 className="text-2xl font-bold text-black">
            Changer mon mot de passe
          </h2>
          <input
            type="password"
            placeholder="Mot de passe actuel"
            value={passwordForm.current_password}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                current_password: event.target.value,
              }))
            }
            className="border p-3 rounded-xl text-black"
            required
          />
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={passwordForm.new_password}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                new_password: event.target.value,
              }))
            }
            className="border p-3 rounded-xl text-black"
            required
          />
          <button
            type="submit"
            className="bg-black text-white font-bold rounded-xl py-3"
          >
            Modifier mon mot de passe
          </button>
        </form>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-2xl font-bold text-black mb-5">
            Aperçu PDF entreprise
          </h2>

          <div className="border rounded-2xl p-6 bg-white">
            <div className="flex items-center gap-5 border-b pb-5 mb-5">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Logo entreprise"
                  className="w-28 h-28 object-contain border rounded-xl"
                />
              ) : (
                <div className="w-28 h-28 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500">
                  Logo
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-black">
                  {formData.company_name || "Nom entreprise"}
                </h3>

                <p className="text-gray-500 mt-1">
                  {formData.slogan || "Slogan entreprise"}
                </p>

                <p className="text-sm text-gray-600 mt-3">
                  {formData.address || "Adresse entreprise"}
                </p>

                <p className="text-sm text-gray-600">
                  {formData.phone || "Téléphone"} | {formData.email || "Email"}
                </p>

                <p className="text-sm text-gray-600">
                  {formData.website || "Site web"}
                </p>
              </div>
            </div>

            <h4 className="text-lg font-bold text-black mb-3">
              Exemple : Rapport de stock
            </h4>

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2">Référence</th>
                  <th>Produit</th>
                  <th>Stock</th>
                  <th>Emplacement</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-bold">REF-001</td>
                  <td>Produit exemple</td>
                  <td>25</td>
                  <td>W/EM2S-A-A-R1-E2</td>
                </tr>
              </tbody>
            </table>

            <div className="border-t mt-6 pt-4 text-xs text-gray-500 flex justify-between">
              <span>Document généré par {productConfig.name}</span>
              <span>Signature / Validation</span>
            </div>
          </div>

          {formData.logo_url && (
            <button
              type="button"
              onClick={handleDownloadLogo}
              className="bg-black text-white font-bold rounded-xl px-5 py-3 mt-5"
            >
              Télécharger l’image du logo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
