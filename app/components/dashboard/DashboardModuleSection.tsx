"use client";

import DashboardModuleCard from "./DashboardModuleCard";
import type { DashboardGroup } from "./dashboardTypes";

/**
 * Section de modules : titre avec accent doré, badge optionnel « prioritaire »,
 * et grille régulière de cartes de même hauteur.
 */
export default function DashboardModuleSection({
  group,
  highlighted = false,
}: {
  group: DashboardGroup;
  highlighted?: boolean;
}) {
  return (
    <section className="mt-8 first:mt-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-6 w-1.5 rounded-full bg-[#d4a23c]" aria-hidden="true" />
        <h3 className="text-lg font-black text-[#0f1b3d]">{group.title}</h3>
        {highlighted && (
          <span className="rounded-full border border-[#d4a23c] bg-[#fbf4e6] px-3 py-0.5 text-xs font-bold text-[#9a6f1f]">
            Prioritaire pour votre activité
          </span>
        )}
      </div>
      {group.description && <p className="mt-1 text-sm text-gray-500">{group.description}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {group.items.map((item) => (
          <DashboardModuleCard key={item.href} item={item} />
        ))}
      </div>
    </section>
  );
}
