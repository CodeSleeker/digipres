import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { logout } from "@/lib/auth/actions";
import { PLATFORM_ROLE_LABEL } from "@/types/platform";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  DashboardShell,
  NavLink,
} from "@/components/admin/dashboard-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Super admin portal shell. Guards the whole /platform plane — a signed-in user
 * who isn't platform staff is redirected to their own tenant back office.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requirePlatformAdmin();

  return (
    <DashboardShell
      brandLabel="PLATFORM"
      brandHref="/platform"
      nav={
        <nav className="flex flex-col gap-1 text-sm">
          <NavLink href="/platform">Overview</NavLink>
          <NavLink href="/platform/businesses">Businesses</NavLink>
          <NavLink href="/platform/analytics">Analytics</NavLink>
          <NavLink href="/platform/audit">Audit Trail</NavLink>
          <NavLink href="/platform/health">System Health</NavLink>
        </nav>
      }
      navFooter={
        <Link
          href="/admin"
          className="text-xs text-gray transition-colors hover:text-gold"
        >
          ← My business back office
        </Link>
      }
      headerLeft={
        <>
          <span className="truncate text-sm text-white">
            {PLATFORM_ROLE_LABEL[role]}
          </span>
          <span className="truncate text-[0.7rem] text-gray">{user.email}</span>
        </>
      }
      headerRight={
        <form action={logout}>
          <SubmitButton
            pendingLabel="SIGNING OUT…"
            className="inline-flex h-8 items-center rounded-none border border-dark-border px-3 text-xs tracking-[2px] text-white transition-colors hover:border-gold hover:text-gold sm:px-4"
          >
            LOG OUT
          </SubmitButton>
        </form>
      }
    >
      {children}
    </DashboardShell>
  );
}
