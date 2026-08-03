import Link from "next/link";
import { Monogram } from "./monogram";
import {
  BookingForm,
  ContactForm,
  FormNotice,
} from "./lead-forms";

/**
 * Aliamz Digital — the platform's own marketing page, served at the production
 * apex (see lib/marketing/mode.ts for when it renders instead of a tenant).
 *
 * Design: light minimalist and typography-led, with a deliberately scoped
 * palette (this file only) so the dark admin/portal/tenant surfaces are
 * untouched.
 *
 * Almost no client JavaScript: the brand mark is an <Image>, and the two form
 * submit buttons are client components so they can show progress. Everything
 * else renders on the server, and both forms still post as plain HTML with
 * scripting disabled.
 *
 * TWO OFFERINGS, kept visually distinct so they don't blur into each other:
 *
 *  - SERVICES — custom software built to order. Bordered cards.
 *  - PLATFORM — the local-business product this codebase actually is
 *    (websites, reviews, CRM). Plain typographic grid.
 *
 * Both sections describe work offered, not work proven: no invented clients,
 * testimonials, logos or statistics anywhere on this page. If social proof is
 * added later it has to be real and attributable.
 */

/* Palette — sampled from the logo (design/aliamz.png), not chosen by eye.
   See components/marketing/theme.ts for the derivation; these are the same
   values, inlined because this page's surface is scoped to this file.

   Measured on #f8f9fb:
     ink    #171920  16.66:1     muted  #555c6b  6.37:1
     accent #7f6333   5.19:1  (on the alt band #eef1f5 it is still 4.82:1)

   #d4a555 is the logo's own gold and manages only 2.14:1 — GRAPHICS ONLY,
   never text. `accent` is that same hue darkened until it passes AA on the
   darkest surface the brand uses, so one value is safe everywhere.

   The neutrals are cool because the logo's dark is a blue-black (#01030b),
   not the warm brown-black this palette used to assume. That cool grey family
   is also where the logo's silver lives — a second saturated metal accent
   would fight the gold on a page this minimal, so it stays in the neutrals. */

const CONTACT = {
  email: "hello@aliamz.com",
  phone: "+639977436111",
};

/**
 * Every anchored section, in page order. Declared once and rendered twice — the
 * inline header row on wide screens, the compact row beneath it on narrow ones
 * — so the two can never fall out of step with each other or with the page.
 */
const SECTIONS = [
  { href: "#services", label: "Services" },
  { href: "#platform", label: "Platform" },
  { href: "#how", label: "How it works" },
  { href: "#booking", label: "Book a call" },
  { href: "#contact", label: "Contact" },
];

const NAV_LINK =
  "shrink-0 transition-colors hover:text-[#171920] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7f6333]";

/**
 * Custom software services.
 *
 * "Mobile applications" and "native applications" are split on a real axis
 * rather than listed as near-synonyms: one codebase across both stores, versus
 * per-platform builds when the work needs the hardware or the last of the
 * performance. Anyone shopping for either will recognise which one they want.
 */
const SERVICES = [
  {
    title: "Custom software development",
    body: "Systems built for how your business actually works, instead of bending the business around off-the-shelf software.",
  },
  {
    title: "Web applications & portals",
    body: "Dashboards, booking systems, customer and partner portals, built to stay fast as they grow.",
  },
  {
    title: "Mobile applications",
    body: "One codebase across iOS and Android, so a feature ships to both stores at once rather than twice.",
  },
  {
    title: "Native applications",
    body: "Swift and Kotlin builds for work that needs the hardware directly: camera, sensors, offline, or the last of the performance.",
  },
  {
    title: "AI solutions",
    body: "Assistants, document understanding, search and forecasting, scoped to a task worth automating rather than to the hype.",
  },
  {
    title: "IoT solutions",
    body: "Devices, gateways and dashboards that collect and act on real-world data, from firmware through to the screen you read it on.",
  },
  {
    title: "Enterprise systems",
    body: "ERP, inventory, HR and operations platforms, with the roles, audit trails and reporting that scale demands.",
  },
  {
    title: "Systems integration & APIs",
    body: "Making the tools you already pay for talk to each other, so data stops being re-typed between them.",
  },
  {
    title: "Cloud, DevOps & hosting",
    body: "Deployment pipelines, monitoring and infrastructure that recovers on its own instead of paging someone.",
  },
  {
    title: "Data engineering & analytics",
    body: "Pipelines, warehousing and reporting that turn scattered records into numbers you can act on.",
  },
  {
    title: "UI/UX design",
    body: "Interface and flow design grounded in how people actually use the thing. Accessible by default, not as a retrofit.",
  },
  {
    title: "Support & maintenance",
    body: "Updates, security patches and improvements after launch. Software is not finished the day it ships.",
  },
];

const CAPABILITIES = [
  {
    title: "Professional website",
    body: "A fast, mobile-first site on a proven industry template, carrying your brand, photos and services.",
  },
  {
    title: "Review automation",
    body: "After each visit: a thank-you text, a review request, and one polite reminder. All cancelled the moment the review lands.",
  },
  {
    title: "Customer CRM",
    body: "Every customer, visit and preference in one place. Searchable, private, and yours.",
  },
  {
    title: "Appointments",
    body: "Bookings and a calendar built into the same dashboard, connected to the review flow.",
  },
  {
    title: "Analytics",
    body: "Appointments, review rate, repeat customers and growth. Readable at a glance, not a spreadsheet.",
  },
  {
    title: "SEO & AI visibility",
    body: "Structured data, sitemaps and clean semantics so search engines and AI assistants can find and cite you.",
  },
];

const STEPS = [
  {
    title: "We set you up",
    body: "Tell us about your business. We build your site from a proven template with your branding and content, and hand you the keys.",
  },
  {
    title: "You own your dashboard",
    body: "Edit your website, manage customers and appointments, and watch your numbers, all in one simple back office.",
  },
  {
    title: "Growth runs itself",
    body: "Review requests go out automatically and your site stays fast, indexed and up to date. You focus on the work.",
  },
];

export function LandingPage({
  /**
   * Set by the redirect the form action performs
   * (`/?sent=ok&form=consultation#booking`). The page is a pure server render,
   * so this is how feedback reaches the visitor without shipping a client
   * component to a marketing page.
   *
   * `form` is what keeps the notice in ONE section: the fragment scrolls the
   * browser but never reaches the server, so it cannot be used to tell the two
   * forms apart.
   */
  sent,
  form,
}: {
  sent?: string;
  form?: string;
} = {}) {
  const bookingNotice = form === "consultation" ? sent : undefined;
  const contactNotice = form === "contact" ? sent : undefined;

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans text-[#171920]">
      {/* Bypass the header for keyboard users; visible only when focused. */}
      <a
        href="#main"
        className="sr-only z-50 bg-[#171920] px-4 py-2 text-sm text-[#f8f9fb] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-[#7f6333]"
      >
        Skip to content
      </a>

      {/* Pinned. Needs its own opaque background — once content scrolls beneath
          a sticky header, inheriting the page colour is no longer enough. */}
      <header className="sticky top-0 z-40 border-b border-[#dfe3e9] bg-[#f8f9fb]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em]">
            <Monogram size={28} />
            <span>
              Aliamz<span className="text-[#7f6333]"> Digital</span>
            </span>
          </span>
          <nav
            aria-label="Primary"
            className="flex items-center gap-6 text-sm font-medium text-[#555c6b]"
          >
            {/* Inline only where all five fit beside the wordmark. Below that
                they move to their own row rather than wrapping into the logo
                or being dropped, which is what used to happen. */}
            <span className="hidden items-center gap-6 lg:flex">
              {SECTIONS.map((s) => (
                <a key={s.href} href={s.href} className={NAV_LINK}>
                  {s.label}
                </a>
              ))}
            </span>
            <Link href="/login" className={NAV_LINK}>
              Log in
            </Link>
          </nav>
        </div>

        {/*
          The same links on narrow screens, as their own scrollable row.

          A dropdown would be the usual answer, but this page ships no client
          JavaScript, and a CSS-only <details> menu has no way to close itself
          after an in-page anchor is followed — it would sit open over the
          content you just jumped to. A scroll row has no state to get wrong.
        */}
        <div className="border-t border-[#dfe3e9] lg:hidden">
          <nav
            aria-label="Sections"
            className="mx-auto flex max-w-5xl gap-4 overflow-x-auto px-6 py-3 text-xs font-medium text-[#555c6b]"
          >
            {SECTIONS.map((s) => (
              <a key={s.href} href={s.href} className={NAV_LINK}>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className="scroll-mt-28 lg:scroll-mt-20">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* The one eye-catching flourish: a soft gold glow behind the headline. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(212,165,85,0.18),transparent)]"
          />
          <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-24 text-center max-[640px]:pb-16 max-[640px]:pt-16">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.35em] text-[#7f6333]">
              Software · Web · Mobile · AI
            </p>
            <h1 className="mx-auto max-w-3xl text-balance text-6xl font-semibold leading-[1.05] tracking-tight max-[640px]:text-4xl">
              Software built around your business.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-[#555c6b]">
              Aliamz Digital designs and builds custom software: web, mobile,
              AI and IoT. We also run a ready-made platform for local businesses
              that need a website and customers, not a project.
            </p>
            <div className="mt-10 flex items-center justify-center gap-6 max-[480px]:flex-col max-[480px]:gap-4">
              <a
                href="#contact"
                className="bg-[#171920] px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#f8f9fb] transition-colors hover:bg-[#2b2f3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f6333]"
              >
                Get started
              </a>
              <Link
                href="/login"
                className="text-sm font-medium text-[#555c6b] underline decoration-[#d4a555] decoration-2 underline-offset-8 transition-colors hover:text-[#171920] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7f6333]"
              >
                Log in to your dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Services — custom software, built to order. Bordered cards, so this
            reads as a different offering from the platform grid below rather
            than as more of the same list. */}
        <section
          id="services"
          aria-labelledby="services-heading"
          className="scroll-mt-28 lg:scroll-mt-20 border-t border-[#dfe3e9]"
        >
          <div className="mx-auto max-w-5xl px-6 py-20 max-[640px]:py-14">
            <h2
              id="services-heading"
              className="text-xs font-semibold uppercase tracking-[0.35em] text-[#7f6333]"
            >
              What we build
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-[#555c6b]">
              Custom work, scoped to the problem. We start with what the
              business needs to do and build only what serves it.
            </p>
            {/* Negative margin + per-cell borders: one hairline grid rather than
                twelve separate boxes, which keeps the minimalist feel. */}
            <ul className="mt-10 grid list-none grid-cols-3 border-l border-t border-[#dfe3e9] max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
              {SERVICES.map((item) => (
                <li
                  key={item.title}
                  className="border-b border-r border-[#dfe3e9] p-6 max-[560px]:p-5"
                >
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#555c6b]">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-[#555c6b]">
              Something not listed?{" "}
              <a
                href="#contact"
                className="font-medium text-[#7f6333] underline decoration-[#d4a555] decoration-2 underline-offset-4 transition-colors hover:text-[#171920] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7f6333]"
              >
                Tell us what you need
              </a>
              .
            </p>
          </div>
        </section>

        {/* Platform — the productised offering, distinct from bespoke work. */}
        <section
          id="platform"
          aria-labelledby="capabilities-heading"
          className="scroll-mt-28 lg:scroll-mt-20 border-t border-[#dfe3e9]"
        >
          <div className="mx-auto max-w-5xl px-6 py-20 max-[640px]:py-14">
            <h2
              id="capabilities-heading"
              className="text-xs font-semibold uppercase tracking-[0.35em] text-[#7f6333]"
            >
              The local business platform
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-[#555c6b]">
              Already built, running today. For barbers, clinics, contractors
              and shops that need to be online and getting customers this month,
              not commissioning a project.
            </p>
            <ul className="mt-10 grid list-none grid-cols-3 gap-x-10 gap-y-12 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
              {CAPABILITIES.map((item) => (
                <li key={item.title}>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#555c6b]">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          aria-labelledby="how-heading"
          className="scroll-mt-28 lg:scroll-mt-20 border-t border-[#dfe3e9] bg-[#eef1f5]"
        >
          <div className="mx-auto max-w-5xl px-6 py-20 max-[640px]:py-14">
            <h2
              id="how-heading"
              className="text-xs font-semibold uppercase tracking-[0.35em] text-[#7f6333]"
            >
              How the platform works
            </h2>
            <ol className="mt-10 grid list-none grid-cols-3 gap-10 max-[720px]:grid-cols-1">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <div
                    aria-hidden="true"
                    className="text-4xl font-semibold text-[#d4a555]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#555c6b]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Booking — the "Get started" target. A consultation is the step
            almost everyone actually wants first, so it comes before the
            general contact form rather than after it. */}
        <section
          id="booking"
          aria-labelledby="booking-heading"
          // scroll-mt clears the sticky header — without it the anchor lands
          // with the heading tucked underneath.
          className="scroll-mt-28 lg:scroll-mt-20 border-t border-[#dfe3e9] bg-[#eef1f5]"
        >
          <div className="mx-auto max-w-5xl px-6 py-20 max-[640px]:py-14">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
              <div>
                <h2
                  id="booking-heading"
                  className="text-xs font-semibold uppercase tracking-[0.35em] text-[#7f6333]"
                >
                  Book a consultation
                </h2>
                <p className="mt-4 text-balance text-3xl font-semibold tracking-tight max-[640px]:text-2xl">
                  Thirty minutes, no obligation.
                </p>
                <p className="mt-4 text-pretty leading-relaxed text-[#555c6b]">
                  Tell us what you&apos;re trying to build and when suits you.
                  We&apos;ll come back with an honest view of what it takes:
                  scope, rough cost, and whether we&apos;re the right people
                  for it at all.
                </p>
                <ul className="mt-6 grid list-none gap-2 text-sm text-[#555c6b]">
                  {[
                    "A real conversation, not a sales call",
                    "We'll say if an off-the-shelf tool would serve you better",
                    "Nothing is charged until scope is agreed",
                  ].map((point) => (
                    <li key={point} className="flex gap-3">
                      {/* A dot, not a dash: the page deliberately carries no
                          em dashes, and a hyphen reads as a stray character. */}
                      <span aria-hidden="true" className="text-[#d4a555]">
                        •
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-[#dfe3e9] bg-[#f8f9fb] p-6 max-[640px]:p-5">
                <FormNotice status={bookingNotice} />
                <BookingForm />
              </div>
            </div>
          </div>
        </section>

        {/* Contact — for everything that isn't a consultation. */}
        <section
          id="contact"
          aria-labelledby="contact-heading"
          className="scroll-mt-28 lg:scroll-mt-20 border-t border-[#dfe3e9]"
        >
          <div className="mx-auto max-w-5xl px-6 py-20 max-[640px]:py-14">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
              <div>
                <h2
                  id="contact-heading"
                  className="text-xs font-semibold uppercase tracking-[0.35em] text-[#7f6333]"
                >
                  Contact us
                </h2>
                <p className="mt-4 text-balance text-3xl font-semibold tracking-tight max-[640px]:text-2xl">
                  Or just send us a message.
                </p>
                <p className="mt-4 text-pretty leading-relaxed text-[#555c6b]">
                  A question, a quote, or an existing system that needs looking
                  at. We read everything and reply to all of it.
                </p>

                <dl className="mt-8 grid gap-4 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.2em] text-[#555c6b]">
                      Email
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={`mailto:${CONTACT.email}`}
                        className="text-[#7f6333] underline decoration-[#d4a555] decoration-2 underline-offset-8 transition-colors hover:text-[#171920] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7f6333]"
                      >
                        {CONTACT.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.2em] text-[#555c6b]">
                      Phone
                    </dt>
                    {/* tel: so a phone dials it instead of the reader copying digits. */}
                    <dd className="mt-1">
                      <a
                        href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`}
                        className="text-[#171920] transition-colors hover:text-[#7f6333] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7f6333]"
                      >
                        {CONTACT.phone}
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="border border-[#dfe3e9] bg-[#f8f9fb] p-6 max-[640px]:p-5">
                <FormNotice status={contactNotice} />
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dfe3e9]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 text-xs text-[#555c6b] max-[480px]:flex-col max-[480px]:gap-3">
          <span>
            © {new Date().getFullYear()} Aliamz Digital. All rights reserved.
          </span>
          <Link
            href="/login"
            className="transition-colors hover:text-[#171920] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7f6333]"
          >
            Client log in
          </Link>
        </div>
      </footer>
    </div>
  );
}
