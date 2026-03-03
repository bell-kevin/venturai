"use client";

import type { Id } from "@venturai/backend/dataModel";
import { useSelectedOrg } from "@/hooks/useSelectedOrg";

import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { orgId, orgs, setOrgId } = useSelectedOrg();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-4 border-b border-card-border bg-background px-6 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-card-border bg-background px-3 py-2 text-foreground/60 focus-within:border-primary focus-within:text-foreground">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search assets, IDs, reports..."
                className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-foreground/50"
              />
            </div>
            {orgs && orgs.length > 1 ? (
              <select
                value={orgId ?? ""}
                onChange={(e) => setOrgId(e.target.value as Id<"orgs">)}
                className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {orgs.map((org) => (
                  <option key={org._id} value={org._id}>
                    Site: {org.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option>Group: All Maint.</option>
            </select>
            <select className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option>Last 24 Hours</option>
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-risk-low" aria-hidden />
              <span className="font-medium text-foreground">LIVE DATA</span>
            </span>
            <ThemeToggle />
            <button
              type="button"
              className="rounded-lg p-2 text-foreground/70 hover:bg-card-border/50 hover:text-foreground"
              aria-label="Notifications"
            >
              <BellIcon />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-foreground/70 hover:bg-card-border/50 hover:text-foreground"
              aria-label="Profile"
            >
              <ProfileIcon />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
