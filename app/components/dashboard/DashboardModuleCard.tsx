"use client";

import Link from "next/link";
import type { DashboardItem } from "./dashboardTypes";

/**
 * Carte de module : hauteur homogène (flex + h-full), icône dorée sur fond bleu
 * nuit, titre lisible, description courte, état hover et focus visibles.
 */
export default function DashboardModuleCard({ item }: { item: DashboardItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-[#d4a23c] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#0f1b3d]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f1b3d] text-[#d4a23c] transition group-hover:bg-[#d4a23c] group-hover:text-[#0f1b3d]">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="mt-3 text-base font-black text-[#0f1b3d]">{item.label}</p>
      {item.description && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{item.description}</p>
      )}
    </Link>
  );
}
