import { getMyBusiness } from "@/features/business/actions";
import { ContactDetailsForm } from "./_components/contact-details-form";

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
        <h1 className="font-heading text-2xl tracking-[2px]">
          Contact details
        </h1>
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
            notifyPhone: business.notifyPhone ?? "",
            notifyEmail: business.notifyEmail ?? "",
            notifyCustomerSms: business.notifyCustomerSms,
          }}
        />
      ) : (
        <p className="text-sm text-gray">
          Create your business profile first — contact details attach to it.
        </p>
      )}
    </div>
  );
}
