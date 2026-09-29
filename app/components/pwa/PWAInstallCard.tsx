"use client";

import { useEffect, useState } from "react";
import InstallPWAButton from "../../../components/InstallPWAButton";
import { usePWAInstall } from "./PWAInstallProvider";

const KEY = "malilink_install_later_until";
export default function PWAInstallCard() {
  const { installed } = usePWAInstall(); const [hidden,setHidden]=useState(true);
  useEffect(()=>setHidden(Number(localStorage.getItem(KEY)||0)>Date.now()),[]);
  if(installed||hidden)return null;
  return <aside className="flex flex-col gap-4 rounded-2xl border border-[#d4a23c]/40 bg-[#fff9e9] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black text-[#0f1b3d]">Installez MaliLink sur cet appareil</h2><p className="mt-1 text-sm text-slate-600">Accès rapide depuis votre écran d’accueil. La connexion et vos permissions restent obligatoires.</p></div><div className="flex gap-2"><InstallPWAButton/><button type="button" onClick={()=>{localStorage.setItem(KEY,String(Date.now()+3*24*60*60*1000));setHidden(true);}} className="rounded-xl border px-4 py-3 font-bold">Plus tard</button></div></aside>;
}
