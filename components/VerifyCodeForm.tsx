"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../app/lib/api";

type Props = {
  targetType: "email" | "phone";
};

export default function VerifyCodeForm({ targetType }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = searchParams.get("token") || "";
  const userId = searchParams.get("user_id") || "";
  const initialTarget = searchParams.get("target") || "";
  // État réel de l'envoi transmis par l'inscription : « accepte » = accepté
  // par le serveur d'envoi (pas encore une preuve de réception).
  const envoiInitial = searchParams.get("envoi") || "";
  const [attente, setAttente] = useState(0);

  const title = targetType === "email" ? "Vérifiez votre email" : "Vérifiez votre téléphone";
  const inputLabel = targetType === "email" ? "Email" : "Téléphone";

  useEffect(() => {
    setTargetValue(initialTarget);
  }, [initialTarget]);

  // Compte à rebours avant un nouveau renvoi (60 s imposées par le serveur).
  useEffect(() => {
    if (attente <= 0) return;
    const t = setTimeout(() => setAttente((a) => a - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  const canSubmit = useMemo(() => Boolean(token || code.trim()), [token, code]);

  const verify = async (event: any) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(apiUrl("/verification/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          code: code || undefined,
          target_type: targetType,
          target_value: targetValue,
          user_id: userId || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Erreur vérification.");
        return;
      }

      setMessage(data.message || "Vérification réussie.");
      if (data.token && data.user) {
        const role = String(data.user.role || "").toLowerCase();
        const isCustomer = role === "customer";
        const isSuperAdmin =
          data.user?.is_super_admin === true ||
          data.user?.is_super_admin === "true" ||
          data.user?.is_super_admin === 1 ||
          role === "super_admin";

        if (isCustomer) {
          localStorage.removeItem("business_token");
          localStorage.removeItem("business_user");
          localStorage.removeItem("admin_token");
          localStorage.setItem("client_token", data.token);
          localStorage.setItem("client_user", JSON.stringify(data.user));
          document.cookie = "triangle_business_token=; path=/; max-age=0";
          document.cookie = `triangle_client_token=${encodeURIComponent(data.token)}; path=/; max-age=86400; SameSite=Lax`;
        } else {
          localStorage.removeItem("client_token");
          localStorage.removeItem("client_user");
          localStorage.setItem("business_token", data.token);
          localStorage.setItem("business_user", JSON.stringify(data.user));
          if (isSuperAdmin) localStorage.setItem("admin_token", data.token);
          else localStorage.removeItem("admin_token");
          document.cookie = "triangle_client_token=; path=/; max-age=0";
          document.cookie = `triangle_business_token=${encodeURIComponent(data.token)}; path=/; max-age=86400; SameSite=Lax`;
        }
        localStorage.setItem("triangle_token", data.token);
        localStorage.setItem("triangle_user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        document.cookie = `triangle_token=${encodeURIComponent(data.token)}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `triangle_role=${encodeURIComponent(data.user.role || "")}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `triangle_super_admin=${isSuperAdmin ? "true" : "false"}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `triangle_subscription_status=${encodeURIComponent(data.user.subscription_status || "")}; path=/; max-age=86400; SameSite=Lax`;
      }
      const verifiedRole = String(data.user?.role || "").toLowerCase();
      const redirect =
        verifiedRole === "customer"
          ? "/client/dashboard"
          : data.redirect || (data.token ? "/dashboard" : "/login");
      setTimeout(() => router.push(redirect), 1200);
    } catch (err) {
      console.error(err);
      setError("Erreur serveur.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(apiUrl("/verification/resend"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_value: targetValue,
          user_id: userId || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 429 && data.retry_after) setAttente(Number(data.retry_after));
      if (!response.ok) {
        setError(data.error || "Le code n'a pas pu être renvoyé.");
        return;
      }

      // Message exact du serveur : envoyé (accepté par le serveur d'envoi),
      // déjà vérifié, ou réponse neutre si le contact ne correspond à aucun compte.
      setMessage(data.message || "Demande enregistrée.");
      setAttente(60);
    } catch (err) {
      console.error(err);
      setError("Erreur serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={verify} className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-black">{title}</h1>
        <p className="mt-2 text-gray-600">
          Saisissez le code reçu. Le code expire après 10 minutes.
        </p>
      </div>

      {!message && !error && !token && envoiInitial && envoiInitial !== "accepte" && (
        <div className="rounded-xl bg-amber-100 p-4 font-bold text-amber-800">
          L&apos;email de vérification n&apos;a pas pu être envoyé lors de l&apos;inscription. Utilisez « Renvoyer le code » ou contactez le support.
        </div>
      )}
      {!message && !error && !token && envoiInitial === "accepte" && (
        <div className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-900">
          Un code a été envoyé et accepté par le serveur d&apos;envoi. S&apos;il n&apos;arrive pas, vérifiez vos courriers indésirables.
        </div>
      )}
      {message && <div className="rounded-xl bg-green-100 p-4 font-bold text-green-700">{message}</div>}
      {error && <div className="rounded-xl bg-red-100 p-4 font-bold text-red-700">{error}</div>}

      {!token && (
        <>
          <label className="block font-bold text-black">{inputLabel}</label>
          <input
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
            className="w-full rounded-xl border p-4 text-black"
            placeholder={inputLabel}
          />

          <label className="block font-bold text-black">Code OTP</label>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border p-4 text-black"
            placeholder="123456"
            inputMode="numeric"
          />
        </>
      )}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full rounded-xl bg-yellow-500 py-4 font-bold text-black"
      >
        {loading ? "Vérification..." : "Valider la vérification"}
      </button>

      {!token && (
        <button
          type="button"
          onClick={resend}
          disabled={loading || attente > 0 || !targetValue.trim()}
          className="w-full rounded-xl bg-black py-4 font-bold text-white disabled:opacity-50"
        >
          {attente > 0 ? `Renvoyer le code (${attente} s)` : "Renvoyer le code"}
        </button>
      )}
    </form>
  );
}
