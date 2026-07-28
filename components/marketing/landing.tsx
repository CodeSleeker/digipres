import Link from "next/link";

/**
 * Aliamz Digital — the platform's own marketing page, served at the production
 * apex (see lib/marketing/mode.ts for when it renders instead of a tenant).
 *
 * Design: light minimalist, typography-led, zero images and zero client JS —
 * deliberately scoped palette (this file only) so the dark admin/portal/tenant
 * surfaces are untouched. Every claim below is a real shipped capability; no
 * fabricated testimonials, logos, or stats.
 */

/* Palette (AA-verified on the off-white background):
   ink #1c1a17 (~16:1) · muted #57534a (~7:1) · accent #6f5b2d (~6:1)
   decorative gold #c9a96e — large/graphic elements only, never body text. */

const CONTACT = {
  // TODO(aliamz): replace placeholders with the real contact details.
  email: "hello@aliamzdigital.example",
  phone: "+00 000 000 0000",
};

const CAPABILITIES = [
  {
    title: "Professional website",
    body: "A fast, mobile-first site on a proven industry template, carrying your brand, photos and services.",
  },
  {
    title: "Review automation",
    body: "After each visit: a thank-you text, a review request, and one polite reminder — cancelled the moment the review lands.",
  },
  {
    title: "Customer CRM",
    body: "Every customer, visit and preference in one place — searchable, private, and yours.",
  },
  {
    title: "Appointments",
    body: "Bookings and a calendar built into the same dashboard, connected to the review flow.",
  },
  {
    title: "Analytics",
    body: "Appointments, review rate, repeat customers and growth — readable at a glance, not a spreadsheet.",
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
    body: "Edit your website, manage customers and appointments, and watch your numbers — all in one simple back office.",
  },
  {
    title: "Growth runs itself",
    body: "Review requests go out automatically and your site stays fast, indexed and up to date. You focus on the work.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] font-sans text-[#1c1a17]">
      {/* Bypass the header for keyboard users; visible only when focused. */}
      <a
        href="#main"
        className="sr-only z-50 bg-[#1c1a17] px-4 py-2 text-sm text-[#faf9f7] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-[#6f5b2d]"
      >
        Skip to content
      </a>

      <header className="border-b border-[#e8e4dc]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold uppercase tracking-[0.35em]">
            Aliamz<span className="text-[#6f5b2d]"> Digital</span>
          </span>
          <nav aria-label="Primary">
            <Link
              href="/login"
              className="text-sm font-medium text-[#57534a] transition-colors hover:text-[#1c1a17] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6f5b2d]"
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* The one eye-catching flourish: a soft gold glow behind the headline. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,110,0.18),transparent)]"
          />
          <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-24 text-center max-[640px]:pb-16 max-[640px]:pt-16">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.35em] text-[#6f5b2d]">
              Websites · Reviews · Growth
            </p>
            <h1 className="mx-auto max-w-3xl text-balance text-6xl font-semibold leading-[1.05] tracking-tight max-[640px]:text-4xl">
              Your business, professionally online.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-[#57534a]">
              Aliamz Digital builds and runs your website, review automation and
              customer tools — one dashboard, no tech headaches, so you can
              focus on the work.
            </p>
            <div className="mt-10 flex items-center justify-center gap-6 max-[480px]:flex-col max-[480px]:gap-4">
              <a
                href="#contact"
                className="bg-[#1c1a17] px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#faf9f7] transition-colors hover:bg-[#3a352e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5b2d]"
              >
                Get started
              </a>
              <Link
                href="/login"
                className="text-sm font-medium text-[#57534a] underline decoration-[#c9a96e] decoration-2 underline-offset-8 transition-colors hover:text-[#1c1a17] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6f5b2d]"
              >
                Log in to your dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section
          aria-labelledby="capabilities-heading"
          className="border-t border-[#e8e4dc]"
        >
          <div className="mx-auto max-w-5xl px-6 py-20 max-[640px]:py-14">
            <h2
              id="capabilities-heading"
              className="text-xs font-semibold uppercase tracking-[0.35em] text-[#6f5b2d]"
            >
              Everything included
            </h2>
            <ul className="mt-10 grid list-none grid-cols-3 gap-x-10 gap-y-12 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
              {CAPABILITIES.map((item) => (
                <li key={item.title}>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#57534a]">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section
          aria-labelledby="how-heading"
          className="border-t border-[#e8e4dc] bg-[#f4f1ea]"
        >
          <div className="mx-auto max-w-5xl px-6 py-20 max-[640px]:py-14">
            <h2
              id="how-heading"
              className="text-xs font-semibold uppercase tracking-[0.35em] text-[#6f5b2d]"
            >
              How it works
            </h2>
            <ol className="mt-10 grid list-none grid-cols-3 gap-10 max-[720px]:grid-cols-1">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <div
                    aria-hidden="true"
                    className="text-4xl font-semibold text-[#c9a96e]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#57534a]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Contact — the "Get started" target */}
        <section
          id="contact"
          aria-labelledby="contact-heading"
          className="border-t border-[#e8e4dc] scroll-mt-8"
        >
          <div className="mx-auto max-w-5xl px-6 py-20 text-center max-[640px]:py-14">
            <h2
              id="contact-heading"
              className="text-balance text-3xl font-semibold tracking-tight max-[640px]:text-2xl"
            >
              Ready to get your business online?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[#57534a]">
              Reach out and we&apos;ll take it from there — your site can be
              live before your next busy weekend.
            </p>
            <div className="mt-8 grid justify-center gap-2 text-lg font-medium">
              <a
                href={`mailto:${CONTACT.email}`}
                className="text-[#6f5b2d] underline decoration-[#c9a96e] decoration-2 underline-offset-8 transition-colors hover:text-[#1c1a17] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6f5b2d]"
              >
                {CONTACT.email}
              </a>
              <span className="text-[#57534a]">{CONTACT.phone}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e8e4dc]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 text-xs text-[#57534a] max-[480px]:flex-col max-[480px]:gap-3">
          <span>
            © {new Date().getFullYear()} Aliamz Digital. All rights reserved.
          </span>
          <Link
            href="/login"
            className="transition-colors hover:text-[#1c1a17] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6f5b2d]"
          >
            Client log in
          </Link>
        </div>
      </footer>
    </div>
  );
}
