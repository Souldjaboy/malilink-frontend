"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Platform = "android" | "ios" | "windows" | "macos" | "other";
type InstallState = {
  installed: boolean;
  canPrompt: boolean;
  platform: Platform;
  showInstructions: boolean;
  install: () => Promise<void>;
  closeInstructions: () => void;
};

const Context = createContext<InstallState | null>(null);

function platformFromNavigator(): Platform {
  const value = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  const ipadDesktop = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(value) || ipadDesktop) return "ios";
  if (/android/.test(value)) return "android";
  if (/windows/.test(value)) return "windows";
  if (/mac/.test(value)) return "macos";
  return "other";
}

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    setPlatform(platformFromNavigator());
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const appInstalled = () => { setInstalled(true); setPrompt(null); setShowInstructions(false); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (installed) return;
    if (!prompt) { setShowInstructions(true); return; }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setPrompt(null);
  }, [installed, prompt]);

  const value = useMemo(() => ({ installed, canPrompt: Boolean(prompt), platform, showInstructions, install, closeInstructions: () => setShowInstructions(false) }), [installed, prompt, platform, showInstructions, install]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePWAInstall() {
  const value = useContext(Context);
  if (!value) throw new Error("usePWAInstall doit être utilisé dans PWAInstallProvider");
  return value;
}

export function PWAInstructions() {
  const { showInstructions, closeInstructions, platform } = usePWAInstall();
  if (!showInstructions) return null;
  const text = platform === "ios"
    ? "Ouvrez MaliLink dans Safari, touchez Partager, puis Ajouter à l’écran d’accueil et confirmez Ajouter."
    : platform === "macos"
      ? "Dans Chrome ou Edge, ouvrez le menu du navigateur puis choisissez Installer MaliLink. Dans Safari récent, utilisez Fichier puis Ajouter au Dock."
      : platform === "windows"
        ? "Dans Chrome ou Edge, utilisez l’icône d’installation dans la barre d’adresse ou le menu Applications."
        : "Utilisez le menu de votre navigateur puis Ajouter à l’écran d’accueil ou Installer l’application.";
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="pwa-help-title">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
      <h2 id="pwa-help-title" className="text-xl font-black">Installer MaliLink</h2>
      <p className="mt-3 leading-7">{text}</p>
      <p className="mt-3 text-sm text-slate-600">Une installation réussie est confirmée uniquement par votre navigateur ou votre système.</p>
      <button type="button" onClick={closeInstructions} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">Fermer</button>
    </div>
  </div>;
}
