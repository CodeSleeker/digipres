import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { logout } from "@/lib/auth/actions";
import { PLATFORM_ROLE_LABEL } from "@/types/platform";
import { SubmitButton } from "@/components/ui/submit-button";

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
    <div className="flex min-h-screen bg-black text-white">
      {/* Pinned nav — see the note in app/admin/layout.tsx for why `self-start`
          is required for `sticky` to do anything inside a flex row. */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-6 self-start overflow-y-auto border-r border-dark-border p-6">
        <Link
          href="/platform"
          className="font-heading text-lg tracking-[2px] text-gold"
        >
          PLATFORM
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/platform"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            Overview
          </Link>
          <Link
            href="/platform/businesses"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            Businesses
          </Link>
          <Link
            href="/platform/analytics"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            Analytics
          </Link>
          <Link
            href="/platform/audit"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            Audit Trail
          </Link>
          <Link
            href="/platform/health"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            System Health
          </Link>
        </nav>
        <Link
          href="/admin"
          className="mt-auto text-xs text-gray transition-colors hover:text-gold"
        >
          ← My business back office
        </Link>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-dark-border px-8 py-4">
          <div className="flex flex-col">
            <span className="text-sm text-white">
              {PLATFORM_ROLE_LABEL[role]}
            </span>
            <span className="text-[0.7rem] text-gray">{user.email}</span>
          </div>
          <form action={logout}>
            <SubmitButton
              pendingLabel="SIGNING OUT…"
              className="inline-flex h-8 items-center rounded-none border border-dark-border px-4 text-xs tracking-[2px] text-white transition-colors hover:border-gold hover:text-gold"
            >
              LOG OUT
            </SubmitButton>
          </form>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
