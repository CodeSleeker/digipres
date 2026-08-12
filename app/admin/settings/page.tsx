import { getMyBusiness } from "@/features/business/actions";
import { ContactDetailsForm } from "./_components/contact-details-form";
import { LodgingDetailsForm } from "./_components/lodging-details-form";

/**
 * Contact details for the business.
 *
 * These previously existed only inside the Google Business onboarding wizard's
 * step 1, which made them effectively unreachable: an owner wanting to change
 * where booking alerts land had to re-enter a wizard titled "Google Profile"
 * and walk to a step that never mentioned notifications. They belong on a page
 * of their own.
 */
export default async function SettingsPage() {
  const business = await getMyBusiness();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-admin-heading text-2xl tracking-[2px]">
          Contact details
        </h1>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-admin-muted transition-colors hover:text-admin-accent"
        >
          View live ↗
        </a>
      </div>

      {business ? (
        <ContactDetailsForm
          defaults={{
            name: business.name,
            phone: business.phone ?? "",
            email: business.email ?? "",
            address: business.address ?? "",
            addressLocality: business.addressLocality ?? "",
            addressRegion: business.addressRegion ?? "",
            addressPostalCode: business.addressPostalCode ?? "",
            addressCountry: business.addressCountry ?? "",
            // Shown back as the pair rather than the link the owner pasted:
            // the link isn't stored, and the numbers are what we actually hold.
            mapLocation:
              business.latitude !== null && business.longitude !== null
                ? `${business.latitude}, ${business.longitude}`
                : "",
            notifyPhone: business.notifyPhone ?? "",
            notifyEmail: business.notifyEmail ?? "",
            notifyCustomerSms: business.notifyCustomerSms,
          }}
        />
      ) : (
        <p className="text-sm text-admin-muted">
          Create your business profile first — contact details attach to it.
        </p>
      )}

      {/*
       * Category-specific facts. Only a place to stay has a check-in time, so
       * only a place to stay is asked for one — the alternative is a form full
       * of fields that mean nothing to a barber. The action re-checks the
       * category; this is the visible half of that rule.
       */}
      {business?.category === "lodging" && (
        <div className="border-t border-admin-line pt-8">
          <LodgingDetailsForm defaults={business.lodgingDetails} />
        </div>
      )}
    </div>
  );
}
