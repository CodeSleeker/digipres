import { guardPage } from "@/lib/features/guard";
import { getMyDomains } from "@/features/domains/actions";
import { getMyBusiness } from "@/features/business/actions";
import { tenantCanonicalUrl } from "@/lib/tenant/urls";
import { DomainsManager } from "./_components/domains-manager";

/**
 * Custom domains for the tenant's public website. Owners connect their own
 * hostname(s); once DNS is verified the site serves from that domain and the
 * platform URL redirects to it.
 */
export default async function DomainsPage() {
  await guardPage("custom_domains");
  const [domains, business] = await Promise.all([
    getMyDomains(),
    getMyBusiness(),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-admin-heading text-2xl tracking-[2px]">Domains</h1>
        <p className="mt-1 max-w-2xl text-sm text-admin-muted">
          Use your own domain for your website. Add it here, point the DNS
          records at us, then verify. Your primary domain becomes the canonical
          address — every other one redirects to it.
        </p>
      </div>

      <DomainsManager
        domains={domains}
        platformUrl={business ? tenantCanonicalUrl(business.slug) : null}
      />
    </div>
  );
}
