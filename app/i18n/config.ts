export const SUPPORTED_LOCALES = ["fr", "en", "ar", "zh-CN"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
export const localeDirection = (locale: Locale) => locale === "ar" ? "rtl" : "ltr";

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
  "zh-CN": "中文",
};
