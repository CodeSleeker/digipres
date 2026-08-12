import { notFound } from "next/navigation";
import { getMyWebsite } from "@/features/website-cms/actions";
import {
  WEBSITE_SECTIONS,
  type WebsiteContent,
  type WebsiteSection,
} from "@/types/website-content";
import type { BusinessProfile } from "@/types/business";
import {
  loadTemplate,
  templateFields,
  templateSections,
  type TemplateFields,
} from "@/templates/registry";
import { toBarberEntry } from "@/lib/website/build-profile";
import { TestimonialsForm } from "../_forms/testimonials-form";
import { HeroForm } from "../_forms/hero-form";
import { AboutForm } from "../_forms/about-form";
import { ServicesForm } from "../_forms/services-form";
import { BarbersForm } from "../_forms/barbers-form";
import { GalleryForm } from "../_forms/gallery-form";
import { JournalForm } from "../_forms/journal-form";
import { RetreatForm } from "../_forms/retreat-form";
import { ProductsForm } from "../_forms/products-form";
import { FaqForm } from "../_forms/faq-form";
import { ContactForm } from "../_forms/contact-form";
import { FooterForm } from "../_forms/footer-form";
import { SocialLinksForm } from "../_forms/social-links-form";

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

  const business = await getMyWebsite();
  const content = business?.content ?? null;

  // A section this tenant's template doesn't render isn't editable — no form,
  // no route. The save action refuses it too; this is the visible half.
  if (!templateSections(business?.templateCode).includes(active)) notFound();

  // The prefill for an un-customized section is THIS TENANT'S TEMPLATE default,
  // resolved the same way the public page resolves it. It used to be whatever
  // DEV_BUSINESS_SLUG pointed at, which was indistinguishable from correct
  // while one template existed and silently wrong the moment a second did — a
  // patisserie owner would have opened their gallery form prefilled with a
  // barber's photographs, and saved them.
  const { defaultProfile: base } = await loadTemplate(business?.templateCode);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-admin-heading text-2xl capitalize tracking-[2px]">
          {active} Section
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
      {renderForm(
        active,
        base,
        content,
        templateFields(business?.templateCode),
        business?.id ?? null,
        Boolean(business?.newsletterVerified),
        {
          facebookUrl: business?.facebookUrl ?? "",
          instagramUrl: business?.instagramUrl ?? "",
          tiktokUrl: business?.tiktokUrl ?? "",
        },
      )}
    </div>
  );
}

function renderForm(
  section: WebsiteSection,
  base: BusinessProfile,
  content: WebsiteContent | null,
  /** Which optional inputs this tenant's template asks for. */
  fields: TemplateFields,
  businessId: string | null,
  /** Whether this tenant may collect addresses at all. */
  newsletterEnabled: boolean,
  socialDefaults: {
    facebookUrl: string;
    instagramUrl: string;
    tiktokUrl: string;
  },
) {
  switch (section) {
    case "hero":
      return (
        <HeroForm
          defaultValues={content?.hero ?? base.hero}
          fields={fields}
          businessId={businessId}
        />
      );
    case "about":
      return (
        <AboutForm
          defaultValues={content?.about ?? base.about}
          fields={fields}
          businessId={businessId}
        />
      );
    case "services":
      return (
        <ServicesForm
          defaultValues={content?.services ?? base.services}
          fields={fields}
          businessId={businessId}
        />
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
          businessId={businessId}
        />
      );
    case "gallery":
      return (
        <GalleryForm
          defaultValues={content?.gallery ?? base.gallery}
          fields={fields}
          businessId={businessId}
        />
      );
    case "journal":
      /*
       * Like the FAQ, the fallback here is the template's own heading with
       * whatever entries it ships — and unlike every other section, a tenant
       * emptying the list is a legitimate save that hides the section.
       *
       * `base.journal` is optional on the profile (only some templates have
       * one), so a template that declared the section without shipping a
       * default would otherwise hand the form `undefined` and blank its
       * heading inputs.
       */
      return (
        <JournalForm
          defaultValues={
            content?.journal ??
            base.journal ?? {
              heading: { label: "Journal", title: "Latest from us" },
              items: [],
            }
          }
          businessId={businessId}
        />
      );
    case "retreat":
      /*
       * `base.retreat` is optional on the profile — only one template has
       * these blocks. A template that declared the section without shipping a
       * default would otherwise hand the form `undefined` and blank every
       * input, so it is guarded even though the pairing is enforced by the
       * registry.
       */
      return base.retreat ? (
        <RetreatForm
          defaultValues={content?.retreat ?? base.retreat}
          businessId={businessId}
        />
      ) : (
        <p className="text-sm text-admin-muted">
          This section isn&rsquo;t part of your website template.
        </p>
      );
    case "products":
      return (
        <ProductsForm
          defaultValues={content?.products ?? base.products}
          fields={fields}
          businessId={businessId}
        />
      );
    case "testimonials":
      // `initials` is derived, so the template default is narrowed rather than
      // passed through — the form has no field for it.
      return (
        <TestimonialsForm
          defaultValues={
            content?.testimonials ?? {
              heading: base.testimonials.heading,
              items: base.testimonials.items.map(
                ({ rating, text, author, meta }) => ({
                  rating,
                  text,
                  author,
                  meta,
                }),
              ),
            }
          }
        />
      );
    case "faq":
      // The only section whose default is genuinely empty — the template ships
      // a heading and no questions, so a new tenant starts from a blank list
      // rather than from someone else's answers.
      return <FaqForm defaultValues={content?.faq ?? base.faq} />;
    case "contact":
      return (
        <ContactForm
          fields={fields}
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
        <div className="grid gap-10">
          <FooterForm
            defaultValues={
              content?.footer ?? {
                description: base.footer.description,
                columns: base.footer.columns,
                copyright: base.footer.copyright,
                credit: base.footer.credit,
                newsletter: base.footer.newsletter,
              }
            }
            newsletterEnabled={newsletterEnabled}
          />
          {/* Social links live on the business record, not in footer_content —
              the contact card and JSON-LD `sameAs` read the same values. */}
          <SocialLinksForm defaults={socialDefaults} />
        </div>
      );
  }
}
