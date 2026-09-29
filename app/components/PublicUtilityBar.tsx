"use client";
import { usePathname } from "next/navigation";
import InstallPWAButton from "../../components/InstallPWAButton";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
const PUBLIC=["/","/login","/register","/mot-de-passe-oublie","/solutions","/a-propos","/services"];
export default function PublicUtilityBar(){const path=usePathname()||"";if(!PUBLIC.some(p=>path===p||path.startsWith(`${p}/`)))return null;return <div className="fixed bottom-3 left-3 right-3 z-50 flex items-center justify-between gap-2 sm:bottom-auto sm:left-auto sm:right-4 sm:top-4"><LanguageSwitcher compact/><InstallPWAButton className="px-3 py-2 text-sm"/></div>}
