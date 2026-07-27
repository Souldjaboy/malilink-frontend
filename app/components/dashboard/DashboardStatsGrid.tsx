"use client";

import type { StatCardData } from "./dashboardTypes";

const TONE_CLASSES: Record<NonNullable<StatCardData["tone"]>, string> = {
  navy: "text-[#0f1b3d]",
  gold: "text-[#b3862e]",
  green: "text-green-600",
  red: "text-red-600",
  orange: "text-orange-500",
  purple: "text-purple-600",
  blue: "text-blue-600",
  slate: "text-slate-600",
};

/** Une valeur est-elle réellement disponible (on n'invente jamais de chiffre) ? */
function hasValue(value: StatCardData["value"]): boolean {
  return value !== null && value !== undefined && value !== "";
}

export default function DashboardStatsGrid({ stats }: { stats: StatCardData[] }) {
  const visible = stats.filter((stat) => hasValue(stat.value));
  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-5">
      {visible.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.key}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{stat.label}</p>
              {Icon && <Icon size={18} className="text-gray-300" aria-hidden="true" />}
            </div>
            <p className={`mt-1 text-2xl font-black md:text-3xl ${TONE_CLASSES[stat.tone || "navy"]}`}>
              {typeof stat.value === "number" ? stat.value.toLocaleString("fr-FR") : stat.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
