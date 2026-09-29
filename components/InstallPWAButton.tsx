"use client";

import { Download } from "lucide-react";
import { usePWAInstall } from "../app/components/pwa/PWAInstallProvider";

export default function InstallPWAButton({ className = "" }: { className?: string }) {
  const { installed, install } = usePWAInstall();
  if (installed) return null;

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black shadow hover:bg-yellow-400 ${className}`}
    >
      <Download className="h-5 w-5" aria-hidden /> Installer MaliLink
    </button>
  );
}
