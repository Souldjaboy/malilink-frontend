"use client";
import Link from "next/link";
import LanguageSwitcher from "../../i18n/LanguageSwitcher";
import { useLocale } from "../../i18n/LocaleProvider";
export default function Page(){const {t}=useLocale();return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow"><Link href="/parametres" className="font-bold text-slate-500">← Paramètres</Link><h1 className="mt-5 text-3xl font-black">{t("language.title")}</h1><p className="mt-2 text-slate-600">{t("language.description")}</p><div className="mt-6"><LanguageSwitcher/></div><p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">Le choix est mémorisé immédiatement sur cet appareil et sauvegardé sur votre compte lorsque vous êtes connecté. العربية active automatiquement l’affichage RTL.</p></div></main>}
