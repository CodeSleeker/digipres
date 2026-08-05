# Client onboarding: the FAQ section

A guide for walking a client through their FAQ, and the reasoning behind how it
behaves. Written to be usable in front of a client — the questions in
"Interview script" can be asked verbatim.

## Why this section matters more than it looks

Everything else on a client's site is marketing prose. The FAQ is the only place
where their business facts are stored as **discrete question/answer pairs**, and
that shape is what machines can use:

- It is published as `FAQPage` structured data (see `lib/seo/json-ld.ts`), which
  is the format AI assistants quote from most readily. A fact buried in an About
  paragraph has to be inferred; an `acceptedAnswer` can be lifted whole.
- It answers the objections that stop a booking — price, parking, walk-ins —
  at the point in the page where the visitor is deciding.

**Set expectations honestly on rich results.** Google restricted FAQ rich
results in August 2023 to authoritative government and health sites. A normal
local business will *not* get expandable snippets in search from this. Say so
before a client infers otherwise. The value is AI answer engines and on-page
conversion, and that value is real — just not the one clients assume.

## What the client can do

Everything is under **Website → FAQ** in their admin.

| Action | How |
| --- | --- |
| Add a question | **Add question**, fill both fields, **Save changes** |
| Edit | Change the text, **Save changes** |
| Remove one | **Remove** on that question's card, then **Save changes** |
| Remove all | Remove every card and save — the section disappears from the site |

Removing every question is a supported, deliberate outcome, not an error state.
The FAQ is the one section allowed to save empty. When it is:

- the section stops rendering on the public site,
- the `FAQPage` structured data is withdrawn with it,
- the **FAQ** link is dropped from the site navigation, so nothing is left
  pointing at a section that no longer exists.

Every other section falls back to template content when a client saves nothing,
so an empty save there would publish a blank strip. The FAQ is different by
design — an owner has to be able to take a published answer down.

## What a new client starts with

**Nothing.** The template ships a heading and zero questions.

This is deliberate, and it is worth understanding before someone "helpfully"
seeds defaults. Template placeholder content has already caused two real
incidents on live client sites: testimonials attributed to named people who were
never anyone's customers, and a demo phone number published as the client's own.

An FAQ is the same hazard in a worse place. "Do you accept walk-ins? Yes" is a
factual promise, and once it is inside `FAQPage` markup an assistant will repeat
it as the business's own words to someone about to drive over. There is no
seeding it and hiding it either: Google's structured-data policy requires FAQ
markup to match content visible on the page.

So the section and its schema both stay absent until the owner writes real
answers. **Filling this in is an onboarding task, not a launch blocker.**

## Interview script

Ask these in person. They map one-to-one onto good questions, and every answer
is a fact only the owner has.

1. Do people need to book, or can they walk in? When is it busiest?
2. What does each service cost, and what is included in the price?
3. How long does each service take?
4. What are your opening hours? When is the last booking you will take?
5. What is the exact address, and where do customers park?
6. How can people pay? Cash, GCash, cards, bank transfer?
7. Can a customer request a specific staff member?
8. Do you serve children? Any age limit?
9. What happens if someone cancels or is late? Any fee?
10. Is there anything customers ask you constantly that is not covered above?

Question 10 is usually the most valuable one. Owners know their real FAQ
already; they just have not written it down.

## Writing guidance to give the client

- **Answer so it stands alone.** An assistant quotes the answer without the
  question around it. "Yes" is useless; "Walk-ins are welcome, but booking ahead
  guarantees your slot" survives being quoted on its own.
- **Be specific.** Numbers, prices, times and street names are the whole point.
  "We offer competitive pricing" is worth nothing to a reader or a machine.
- **Keep it short.** Answers are capped at 1200 characters. An answer that runs
  to essay length stops being quotable, which defeats the purpose.
- **Never promise what you cannot honour.** This text is republished by third
  parties you do not control and cannot correct.
- Three questions is the minimum that reads as real coverage — that is the
  threshold the visibility score uses.

## How it scores

The AI Visibility report (`services/visibility-service.ts`) checks the client's
own questions, not whether the platform supports the feature:

| Published questions | Status |
| --- | --- |
| 0 | fail |
| 1–2 | warn |
| 3 or more | pass |

A question missing either half is not counted — it is dropped from the markup
too, so scoring it would credit something no assistant can read.

## Related fields worth capturing in the same visit

The FAQ interview surfaces answers that belong in structured fields as well.
Capture them once and they feed the FAQ, the `LocalBusiness` schema, the share
card and the Google Business Profile together:

- **Address** (street, locality, region, postal code) — `addressLocality` is the
  load-bearing one. Without it nothing on the page states which town this is,
  and the tenant's share card has no locality line under the business name.
- **Phone**, **email**, **opening hours** — all emitted in `LocalBusiness`
  JSON-LD when present, and silently omitted when not.
- **Category** — drives the schema.org subtype (`barber` → `HairSalon`).
  Left as `other` it emits a generic `LocalBusiness`, which says far less.
- **Description** — if this is blank the site publishes the *template's*
  description, which will be identical across every client on that template.
  Duplicate descriptions across tenants are a real liability once you have more
  than one client live.

## Technical notes

- Storage: `businesses.faq_content` (jsonb, migration `0031_faq_content.sql`).
  `null` means no FAQ, exactly as for the other `*_content` columns.
- Rendering: `templates/barber/luxury/sections/faq.tsx`, built on native
  `<details>`/`<summary>`. Answers stay in the DOM while collapsed, so crawlers
  read text the visitor has not clicked. A JS accordion that mounted panels on
  open would hide precisely the content this section exists to publish.
- Structured data is built from the resolved profile — the same array the
  template renders — so the markup can never describe questions the page does
  not show.
- The section is opt-in per template via `sections` in `templates/registry.ts`.
  A new template must add `"faq"` to its list to expose it.
- Public pages are ISR with `revalidate = 3600`. Saving through the admin
  revalidates immediately; a direct database write can take up to an hour to
  appear.
