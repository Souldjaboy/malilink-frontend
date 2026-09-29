"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/api";
import { DEFAULT_LOCALE, isLocale, localeDirection, type Locale } from "./config";
import { dictionaries, type TranslationKey } from "./dictionaries";

type Value = { locale: Locale; setLocale: (locale: Locale) => Promise<void>; t: (key: TranslationKey) => string };
const Context = createContext<Value | null>(null);

function localLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const saved = window.localStorage.getItem("malilink_locale");
  if (isLocale(saved)) return saved;
  const browser = navigator.language;
  if (browser.startsWith("ar")) return "ar";
  if (browser.startsWith("en")) return "en";
  if (browser.startsWith("zh")) return "zh-CN";
  return "fr";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  const apply = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    document.documentElement.dir = localeDirection(next);
    document.documentElement.dataset.locale = next;
    window.localStorage.setItem("malilink_locale", next);
    document.cookie = `malilink_locale=${encodeURIComponent(next)};path=/;max-age=31536000;samesite=lax`;
  }, []);

  useEffect(() => {
    const initial = localLocale(); apply(initial);
    const hasToken = Boolean(localStorage.getItem("token") || localStorage.getItem("business_token") || localStorage.getItem("admin_token"));
    if (hasToken) authFetch("/preferences/language", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (isLocale(data?.language)) apply(data.language); })
      .catch(() => {});
  }, [apply]);

  const setLocale = useCallback(async (next: Locale) => {
    apply(next);
    const hasToken = Boolean(localStorage.getItem("token") || localStorage.getItem("business_token") || localStorage.getItem("admin_token"));
    if (hasToken) await authFetch("/preferences/language", { method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({language:next}) }).catch(() => null);
  }, [apply]);

  const value = useMemo<Value>(() => ({ locale, setLocale, t: (key) => dictionaries[locale]?.[key] || dictionaries.fr[key] }), [locale, setLocale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLocale() {
  const value = useContext(Context);
  if (!value) throw new Error("useLocale doit être utilisé dans LocaleProvider");
  return value;
}
