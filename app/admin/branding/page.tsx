import { getMyBusiness } from "@/features/business/actions";
import { BrandingForm } from "./_components/branding-form";

/**
 * Branding editor: the logo, the browser-tab icon, and the wordmark.
 *
 * Not part of /admin/website/[section] — those are the tenant's editable page
 * SECTIONS, declared per template. Branding is a property of the business
 * itself (it lives on the business row, feeds the header, the footer and the
 * favicon, and applies whatever template the tenant is on), so it gets its own
 * route rather than pretending to be a section of the page.
 */
export default async function BrandingPage() {
  const business = await getMyBusiness();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl tracking-[2px]">Branding</h1>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-gray transition-colors hover:text-gold"
        >
          View live ↗
        </a>
      </div>

      {business ? (
        <BrandingForm
          businessId={business.id}
          businessName={business.name}
          defaultValues={{
            logoUrl: business.logoUrl ?? "",
            faviconUrl: business.faviconUrl ?? "",
            namePrimary: business.brand?.namePrimary ?? "",
            nameAccent: business.brand?.nameAccent ?? "",
            initial: business.brand?.initial ?? "",
          }}
        />
      ) : (
        <p className="text-sm text-gray">
          Create your business profile first — branding attaches to it.
        </p>
      )}
    </div>
  );
}
