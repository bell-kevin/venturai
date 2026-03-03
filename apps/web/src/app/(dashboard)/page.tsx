"use client";

import { RiskHeatmapCell } from "@/components/RiskHeatmapCell";
import { useSelectedOrg } from "@/hooks/useSelectedOrg";
import { getRiskTier } from "@/lib/risk";
import { api } from "@venturai/backend";
import type { Id } from "@venturai/backend/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";

function InspectionIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}
function ReportIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
export default function DashboardPage() {
  const { orgId, orgs } = useSelectedOrg();
  const assets = useQuery(
    api.assets.queries.listByOrg,
    orgId ? { orgId } : "skip",
  );
  const openWorkItems = useQuery(
    api.work_items.listOpenByOrgOrGroup,
    orgId ? { orgId } : "skip",
  );

  const openCountByAsset = new Map<Id<"assets">, number>();
  for (const wi of openWorkItems ?? []) {
    openCountByAsset.set(
      wi.assetId,
      (openCountByAsset.get(wi.assetId) ?? 0) + 1,
    );
  }

  const totalAssets = assets?.length ?? 0;
  const issuesFound = openWorkItems?.length ?? 0;
  const highRiskCount = assets?.filter((a) => a.riskScore > 75).length ?? 0;
  const avgRiskScoreNum = totalAssets > 0
    ? (assets ?? []).reduce((s, a) => s + a.riskScore, 0) / totalAssets
    : 0;
  const avgRiskScore = avgRiskScoreNum.toFixed(1);

  const riskDistribution = (assets ?? []).reduce(
    (acc, a) => {
      const tier = getRiskTier(a.riskScore);
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const noIssuesCount = riskDistribution.low ?? 0;
  const lowCount = riskDistribution.low ?? 0;
  const mediumCount = riskDistribution.medium ?? 0;
  const highCount = riskDistribution.high ?? 0;
  const criticalCount = riskDistribution.critical ?? 0;

  const pieSegments = [
    { label: "No Issues", value: noIssuesCount, color: "#00D68F", pct: totalAssets ? (noIssuesCount / totalAssets) * 100 : 93 },
    { label: "Medium", value: mediumCount, color: "#FBBF24", pct: totalAssets ? (mediumCount / totalAssets) * 100 : 0 },
    { label: "High Risk", value: highCount + criticalCount, color: "#F87171", pct: totalAssets ? ((highCount + criticalCount) / totalAssets) * 100 : 0 },
  ].filter((s) => s.value > 0);

  const operationalCount = lowCount;
  const maintenanceCount = mediumCount;
  const criticalStatusCount = highCount + criticalCount;
  const offlineCount = 0;

  if (orgs === undefined) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-8">
        <div className="text-foreground/60">Loading…</div>
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-center text-foreground/70">
          Create an organization to view assets.
        </p>
        <Link href="/orgs" className="text-primary hover:underline">
          Go to Organizations →
        </Link>
      </div>
    );
  }

  if (orgId && assets === undefined) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-8">
        <div className="text-foreground/60">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* KPI cards row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="rounded-xl border border-card-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Total Assets</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalAssets}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Issues Found</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{issuesFound}</p>
          <p className="mt-0.5 text-sm text-foreground/60">
            {totalAssets > 0 ? Math.round((issuesFound / totalAssets) * 100) : 0}% rate
          </p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">High Risk</p>
          <p className="mt-1 text-2xl font-bold text-risk-critical">{highRiskCount}</p>
          <p className="mt-0.5 text-sm text-risk-critical">Requires Action</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Open Actions</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{issuesFound}</p>
          <p className="mt-0.5 text-sm text-risk-high">Pending</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Completed</p>
          <p className="mt-1 text-2xl font-bold text-foreground">—</p>
          <p className="mt-0.5 text-sm text-foreground/60">Last 24h</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Avg Risk Score</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {avgRiskScore}
          </p>
          <div className="relative mt-3 h-8 w-full">
            <span
              className="absolute bottom-2 left-0 text-sm leading-none"
              style={{
                color: "var(--foreground)",
                transform: "translateX(-50%)",
                left: `${Math.min(Math.max(avgRiskScoreNum, 0), 100)}%`,
              }}
              aria-hidden
            >
              ▼
            </span>
            <div
              className="absolute bottom-0 left-0 right-0 h-2 overflow-hidden rounded-full"
              style={{
                background: "linear-gradient(90deg, #00D68F, #FBBF24, #f97316, #F87171)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-2 lg:flex-row">
      <div className="order-2 min-w-0 flex-1 lg:order-1">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Assets</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Sorted by risk. Tap an asset to view details or open work items.
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border border-card-border bg-card shadow-[0_0_20px_rgba(0,212,255,0.06)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-card-border bg-card/80">
                <th className="px-6 py-4 font-medium text-foreground/80">
                  Asset
                </th>
                <th className="px-6 py-4 font-medium text-foreground/80">
                  Location
                </th>
                <th className="px-6 py-4 font-medium text-foreground/80">
                  Risk
                </th>
                <th className="px-6 py-4 font-medium text-foreground/80">
                  Open items
                </th>
                <th className="px-6 py-4 font-medium text-foreground/80" />
              </tr>
            </thead>
            <tbody>
              {(assets ?? []).map((asset) => (
                <tr
                  key={asset._id}
                  className="border-b border-card-border/50 transition-colors hover:bg-card-border/20"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/assets/${asset._id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {asset.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-foreground/70">
                    {asset.locationText ?? "—"}
                  </td>
                  <RiskHeatmapCell riskScore={asset.riskScore} />
                  <td className="px-6 py-4 text-foreground/70">
                    {openCountByAsset.get(asset._id) ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/work-items?asset=${asset._id}`}
                      className="text-primary hover:underline"
                    >
                      View work items →
                    </Link>
                  </td>
                </tr>
              ))}
              {(assets ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-sm text-foreground/60"
                  >
                    No assets found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right column */}
      <div className="flex w-full max-w-sm flex-col gap-6 lg:w-80">
          {/* Risk Distribution */}
          <div className="rounded-xl border border-card-border bg-card p-5">
            <h2 className="mb-4 font-semibold text-foreground">Risk Distribution</h2>
            <div className="flex items-center justify-center gap-4">
              <div className="relative h-40 w-40 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  {pieSegments.length === 0 ? (
                    <circle cx="18" cy="18" r="16" fill="#64748b" opacity="0.3" />
                  ) : (
                    pieSegments.map((seg, i) => {
                      const offset = pieSegments
                        .slice(0, i)
                        .reduce((s, p) => s + (p.pct / 100) * 100, 0);
                      const dash = `${seg.pct} ${100 - seg.pct}`;
                      return (
                        <circle
                          key={seg.label}
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="4"
                          strokeDasharray={dash}
                          strokeDashoffset={-offset}
                        />
                      );
                    })
                  )}
                </svg>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                {pieSegments.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-foreground/80">{s.label}</span>
                    <span className="text-foreground/60">{s.pct.toFixed(1)}%</span>
                  </div>
                ))}
                {pieSegments.length === 0 && (
                  <p className="text-foreground/60">No data</p>
                )}
              </div>
            </div>
          </div>

          {/* Asset Status */}
          <div className="rounded-xl border border-card-border bg-card p-5">
            <h2 className="mb-4 font-semibold text-foreground">Asset Status</h2>
            <ul className="space-y-3">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-risk-low" />
                  Operational
                </span>
                <span className="font-medium text-foreground">{operationalCount}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-risk-high" />
                  Maintenance
                </span>
                <span className="font-medium text-foreground">{maintenanceCount}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-risk-critical" />
                  Critical
                </span>
                <span className="font-medium text-foreground">{criticalStatusCount}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-foreground/30" />
                  Offline
                </span>
                <span className="font-medium text-foreground">{offlineCount}</span>
              </li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-card-border bg-card p-5">
            <h2 className="mb-4 font-semibold text-foreground">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              <Link
                href="/assets"
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary/90"
              >
                <InspectionIcon />
                View all assets
              </Link>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <ReportIcon />
                Export Report
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <CalendarIcon />
                Schedule Maintenance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
