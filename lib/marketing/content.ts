/**
 * The platform's own marketing copy, in one place.
 *
 * Extracted from components/marketing/landing.tsx so the Messenger bot can
 * ground its answers in exactly what the site says. Two copies would drift, and
 * a bot that contradicts the page it is answering about is worse than one that
 * declines — this mirrors the reason the tenant grounding pack reuses
 * lib/website/build-profile.ts rather than restating a business's details.
 *
 * The landing page renders these; the bot reads them. Neither owns them.
 */

export const CONTACT = {
  email: "hello@aliamz.com",
  phone: "+639977436111",
} as const;

/**
 * Custom software services.
 *
 * "Mobile applications" and "native applications" are split on a real axis
 * rather than listed as near-synonyms: one codebase across both stores, versus
 * per-platform builds when the work needs the hardware or the last of the
 * performance. Anyone shopping for either will recognise which one they want.
 */
export const SERVICES = [
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
] as const;

export const CAPABILITIES = [
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
] as const;

export const STEPS = [
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
] as const;
