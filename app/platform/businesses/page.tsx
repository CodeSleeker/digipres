import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import { getPlatformBusinesses } from "@/features/platform/queries";

const PAGE_SIZE = 20;

/** Every tenant on the platform, searchable and paginated. */
export default async function PlatformBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const result = await getPlatformBusinesses({ q, page, pageSize: PAGE_SIZE });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-admin-heading text-2xl tracking-[2px]">Businesses</h1>
          <p className="mt-1 text-sm text-admin-muted">
            {result.total} {result.total === 1 ? "business" : "businesses"} on
            the platform.
          </p>
        </div>
        <Link
          href="/platform/businesses/new"
          className="border border-admin-accent px-4 py-2 text-xs uppercase tracking-[2px] text-admin-accent transition-colors hover:bg-admin-accent hover:text-admin-on-accent"
        >
          Onboard business
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or slug…"
          className="h-auto w-full max-w-xs rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg outline-none transition-colors focus:border-admin-accent"
        />
        <SubmitButton
          pendingLabel="Searching…"
          className="inline-flex items-center border border-admin-line px-4 text-xs uppercase tracking-[2px] text-admin-fg/80 transition-colors hover:border-admin-accent hover:text-admin-accent"
        >
          Search
        </SubmitButton>
      </form>

      {result.rows.length === 0 ? (
        <p className="border border-admin-line bg-admin-panel p-5 text-sm text-admin-muted">
          No businesses found.
        </p>
      ) : (
        <div className="min-w-0 overflow-x-auto border border-admin-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-admin-field text-[0.7rem] uppercase tracking-[1px] text-admin-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Business</th>
                <th className="px-4 py-3 font-normal">Slug</th>
                <th className="px-4 py-3 font-normal">Category</th>
                <th className="px-4 py-3 font-normal">Onboarding</th>
                <th className="px-4 py-3 font-normal">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {result.rows.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-admin-field">
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/businesses/${b.id}`}
                      className="text-admin-fg transition-colors hover:text-admin-accent"
                    >
                      {b.name}
                    </Link>
                    {b.deletedAt && (
                      <span className="ml-2 rounded-full border border-[#c1666b]/40 px-2 py-0.5 text-[0.6rem] uppercase tracking-[1px] text-[#c1666b]">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-admin-fg/80">
                    /{b.slug}
                  </td>
                  <td className="px-4 py-3 capitalize text-admin-fg/80">
                    {b.category}
                  </td>
                  <td className="px-4 py-3 text-admin-fg/80">
                    {b.onboardingPercentage}%
                  </td>
                  <td className="px-4 py-3 text-xs text-admin-muted">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pageCount > 1 && (
        <div className="flex items-center gap-4 text-xs text-admin-muted">
          {page > 1 && (
            <Link
              href={`/platform/businesses?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="transition-colors hover:text-admin-accent"
            >
              ← Previous
            </Link>
          )}
          <span>
            Page {page} of {result.pageCount}
          </span>
          {page < result.pageCount && (
            <Link
              href={`/platform/businesses?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="transition-colors hover:text-admin-accent"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
