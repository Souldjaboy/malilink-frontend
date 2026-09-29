"use client";

import { Languages } from "lucide-react";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "./config";
import { useLocale } from "./LocaleProvider";

export default function LanguageSwitcher({ compact=false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  return <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm">
    <Languages className="h-4 w-4" aria-hidden />
    {!compact && <span className="sr-only">Langue</span>}
    <select aria-label="Langue" value={locale} onChange={(e)=>void setLocale(e.target.value as Locale)} className="bg-transparent outline-none">
      {SUPPORTED_LOCALES.map((item)=><option key={item} value={item}>{LOCALE_LABELS[item]}</option>)}
    </select>
  </label>;
}
