"use client";

import { AlertTriangle, RotateCw, SearchX } from "lucide-react";
import type { ReactNode } from "react";

/** Squelette d'une carte résultat pendant le chargement. */
export function ResultSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl border border-[var(--ml-border)] bg-white p-5 dark:border-white/10 dark:bg-white/5"
      aria-hidden="true"
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-1/4 rounded bg-slate-100 dark:bg-white/5" />
        </div>
        <div className="h-8 w-24 rounded-lg bg-slate-200 dark:bg-white/10" />
      </div>
      <div className="mt-4 flex gap-6">
        <div className="h-3 w-20 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-3 w-20 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-3 w-16 rounded bg-slate-100 dark:bg-white/5" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Chargement des offres">
      {Array.from({ length: count }).map((_, i) => (
        <ResultSkeleton key={i} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  children,
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--ml-border)] bg-white/60 px-6 py-14 text-center dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--ml-blue)]/5 text-[var(--ml-blue)] dark:bg-white/10 dark:text-yellow-400">
        {icon || <SearchX className="h-7 w-7" />}
      </div>
      <h3 className="text-lg font-bold text-[var(--ml-blue)] dark:text-white">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-[var(--ml-text-soft)] dark:text-white/60">{message}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-500/30 dark:bg-red-500/10"
    >
      <AlertTriangle className="mb-3 h-8 w-8 text-red-500" />
      <h3 className="text-lg font-bold text-red-700 dark:text-red-300">Une erreur est survenue</h3>
      <p className="mt-1 max-w-md text-sm text-red-600/90 dark:text-red-200/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <RotateCw className="h-4 w-4" />
          Réessayer
        </button>
      )}
    </div>
  );
}
