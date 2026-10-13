"use client";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="h-3 w-24 rounded-md bg-slate-200" />
            <div className="mt-3 h-8 w-32 rounded-lg bg-slate-200" />
            <div className="mt-2 h-3 w-20 rounded-md bg-slate-100" />
            {/* Shimmer light */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        ))}
      </div>

      {/* Main Charts & Categories Row Skeleton */}
      <div className="grid gap-6 xl:grid-cols-[1.8fr_1.2fr]">
        {/* Cash Flow Forecast Card Skeleton */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4">
            <div>
              <div className="h-5 w-40 rounded-md bg-slate-200" />
              <div className="mt-2 h-3 w-56 rounded-md bg-slate-100" />
            </div>
            <div className="h-8 w-24 rounded-xl bg-slate-100" />
          </div>
          <div className="mt-6 h-64 w-full rounded-xl bg-slate-100" />
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>

        {/* Budgets Card Skeleton */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4">
            <div className="h-5 w-36 rounded-md bg-slate-200" />
            <div className="h-4 w-16 rounded-md bg-slate-100" />
          </div>
          <div className="mt-6 space-y-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-20 rounded bg-slate-200" />
                  <div className="h-3.5 w-28 rounded bg-slate-200" />
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Transactions Row Skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4">
          <div className="h-5 w-36 rounded-md bg-slate-200" />
          <div className="h-4 w-14 rounded-md bg-slate-100" />
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((k) => (
            <div key={k} className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-3 w-20 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-4 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}
