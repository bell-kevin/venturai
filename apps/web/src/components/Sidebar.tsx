"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@venturai/backend";
import { useSelectedOrg } from "@/hooks/useSelectedOrg";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import venturaiBanner from "@/assets/banner.png";

function DashboardIcon() {
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
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function AssetsIcon() {
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
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function ActionsIcon() {
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
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function ReportsIcon() {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function AdminIcon() {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function LogoutIcon() {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const nav = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/assets", label: "Assets", icon: AssetsIcon },
  {
    href: "/work-items",
    label: "Actions",
    icon: ActionsIcon,
    badgeKey: "work-items",
  },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
  { href: "/orgs", label: "Admin", icon: AdminIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { orgId } = useSelectedOrg();
  const { signOut } = useAuthActions();
  const openWorkItems = useQuery(
    api.work_items.listOpenByOrgOrGroup,
    orgId ? { orgId } : "skip",
  );
  const openActionCount = openWorkItems?.length ?? 0;

  const appendOrg = (href: string) => {
    if (!orgId || href.startsWith("/orgs")) return href;
    return `${href}${href.includes("?") ? "&" : "?"}org=${orgId}`;
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/signin");
    router.refresh();
  };

  return (
    <aside className="flex w-56 flex-col border-r border-card-border bg-[#090712] p-4">
      <div className="mb-6 flex w-full justify-center">
        <Link href="/" className="block w-full">
          <Image
            src={venturaiBanner}
            alt="Venturai"
            className="h-28 w-full object-contain object-center"
            priority
          />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map(({ href, label, icon: Icon, badgeKey }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const navHref = appendOrg(href);
          const badge = badgeKey === "work-items" ? openActionCount : null;

          return (
            <Link
              key={href}
              href={navHref}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "border-l-2 border-l-primary bg-primary/15 text-primary"
                  : "border-l-2 border-l-transparent text-foreground/70 hover:bg-card-border/50 hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon />
                {label}
              </span>
              {badge != null ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isActive ? "bg-white/20" : "bg-risk-critical/90 text-white"}`}
                >
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        <div className="mt-auto space-y-4 pt-6">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card-border text-foreground/70">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                User
              </p>
              <p className="truncate text-xs text-foreground/60">Member</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground/70 transition-all hover:bg-card-border/50 hover:text-foreground"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </nav>
    </aside>
  );
}
