import { notFound } from "next/navigation";
import { resolveDevBusiness } from "@/lib/businesses";
import { getMyWebsite } from "@/features/website-cms/actions";
import {
  WEBSITE_SECTIONS,
  type WebsiteContent,
  type WebsiteSection,
} from "@/types/website-content";
import type { BusinessProfile } from "@/types/business";
import { templateSections } from "@/templates/registry";
import { toBarberEntry } from "@/lib/website/build-profile";
import { HeroForm } from "../_forms/hero-form";
import { AboutForm } from "../_forms/about-form";
import { ServicesForm } from "../_forms/services-form";
import { BarbersForm } from "../_forms/barbers-form";
import { GalleryForm } from "../_forms/gallery-form";
import { ProductsForm } from "../_forms/products-form";
import { ContactForm } from "../_forms/contact-form";
import { FooterForm } from "../_forms/footer-form";

/**
 * A CMS editor page for one website section. Prefills the form with the stored
 * content, falling back to the template default so an un-customized section is
 * still editable. Saving publishes instantly (the action revalidates "/").
 */
export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!WEBSITE_SECTIONS.includes(section as WebsiteSection)) notFound();
  const active = section as WebsiteSection;

  const base = resolveDevBusiness();
  const business = await getMyWebsite();
  const content = business?.content ?? null;

  // A section this tenant's template doesn't render isn't editable — no form,
  // no route. The save action refuses it too; this is the visible half.
  if (!templateSections(business?.templateCode).includes(active)) notFound();

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl capitalize tracking-[2px]">
          {active} Section
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
      {renderForm(active, base, content, business?.id ?? null)}
    </div>
  );
}

function renderForm(
  section: WebsiteSection,
  base: BusinessProfile,
  content: WebsiteContent | null,
  businessId: string | null,
) {
  switch (section) {
    case "hero":
      return (
        <HeroForm
          defaultValues={content?.hero ?? base.hero}
          businessId={businessId}
        />
      );
    case "about":
      return <AboutForm defaultValues={content?.about ?? base.about} />;
    case "services":
      return (
        <ServicesForm defaultValues={content?.services ?? base.services} />
      );
    case "barbers":
      // The template default carries rendered SocialLinks; the form edits bare
      // profile URLs, so convert when falling back to it.
      return (
        <BarbersForm
          defaultValues={
            content?.barbers ?? {
              heading: base.barbers.heading,
              items: base.barbers.items.map(toBarberEntry),
            }
          }
        />
      );
    case "gallery":
      return <GalleryForm defaultValues={content?.gallery ?? base.gallery} />;
    case "products":
      return (
        <ProductsForm defaultValues={content?.products ?? base.products} />
      );
    case "contact":
      return (
        <ContactForm
          defaultValues={
            content?.contact ?? {
              label: base.contact.label,
              titleLines: base.contact.titleLines,
              intro: base.contact.intro,
              serviceOptions: base.contact.serviceOptions,
              barberOptions: base.contact.barberOptions,
            }
          }
        />
      );
    case "footer":
      return (
        <FooterForm
          defaultValues={
            content?.footer ?? {
              description: base.footer.description,
              columns: base.footer.columns,
              copyright: base.footer.copyright,
              credit: base.footer.credit,
            }
          }
        />
      );
  }
}
