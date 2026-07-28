import Link from "next/link";
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
          <h1 className="font-heading text-2xl tracking-[2px]">Businesses</h1>
          <p className="mt-1 text-sm text-gray">
            {result.total} {result.total === 1 ? "business" : "businesses"} on
            the platform.
          </p>
        </div>
        <Link
          href="/platform/businesses/new"
          className="border border-gold px-4 py-2 text-xs uppercase tracking-[2px] text-gold transition-colors hover:bg-gold hover:text-black"
        >
          Onboard business
        </Link>
      </div>

      <form className="flex gap-3">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or slug…"
          className="h-auto w-full max-w-xs rounded-none border border-dark-border bg-charcoal px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold"
        />
        <button
          type="submit"
          className="border border-dark-border px-4 text-xs uppercase tracking-[2px] text-gray-light transition-colors hover:border-gold hover:text-gold"
        >
          Search
        </button>
      </form>

      {result.rows.length === 0 ? (
        <p className="border border-dark-border bg-dark p-5 text-sm text-gray">
          No businesses found.
        </p>
      ) : (
        <div className="overflow-x-auto border border-dark-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-charcoal text-[0.7rem] uppercase tracking-[1px] text-gray">
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
                <tr key={b.id} className="transition-colors hover:bg-charcoal">
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/businesses/${b.id}`}
                      className="text-white transition-colors hover:text-gold"
                    >
                      {b.name}
                    </Link>
                    {b.deletedAt && (
                      <span className="ml-2 rounded-full border border-[#c1666b]/40 px-2 py-0.5 text-[0.6rem] uppercase tracking-[1px] text-[#c1666b]">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-light">
                    /{b.slug}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-light">
                    {b.category}
                  </td>
                  <td className="px-4 py-3 text-gray-light">
                    {b.onboardingPercentage}%
                  </td>
                  <td className="px-4 py-3 text-xs text-gray">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pageCount > 1 && (
        <div className="flex items-center gap-4 text-xs text-gray">
          {page > 1 && (
            <Link
              href={`/platform/businesses?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="transition-colors hover:text-gold"
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
              className="transition-colors hover:text-gold"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
