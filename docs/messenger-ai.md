# Messenger AI Agent

An AI assistant that answers a business's Facebook Messenger conversations,
collects complete booking details in a human-sounding chat, and submits them
into the platform's existing booking pipeline.

Rolled out to **Aliamz Digital's own Page first**, then to client Pages. The
platform code is the same for both — only the channel record differs.

---

## 0. Prerequisites — do you need a registered business?

**To build and test: no. To go live: yes.**

| Stage                                  | Registered business? | Who can talk to the bot                       |
| -------------------------------------- | -------------------- | --------------------------------------------- |
| Development mode (Phases 1–3)          | Not required         | Only people with a role on the Meta app        |
| Public / real customers / client Pages | **Required**         | Anyone                                         |

Going public requires **App Review** for Advanced Access to `pages_messaging`,
which requires **Meta Business Verification**, which requires legal documents.

**Philippines — documents Meta accepts:**

- **DTI Certificate** (sole proprietorship) or **SEC Registration**
  (corporation / partnership) — a sole proprietorship is sufficient; you do not
  need to incorporate
- **BIR Form 2303** (Certificate of Registration)
- **Mayor's / Business Permit**
- Supporting: utility bill or bank statement showing the business name and
  address

The business name, address and phone entered in Meta Business Manager **must
match the documents exactly**. Mismatches are the most common rejection.

> **Confirm, don't assume.** Because Aliamz manages other businesses' Pages,
> Meta's flow may require registering as a **Tech Provider** rather than a plain
> business. Meta revises this requirement matrix regularly. The authority is the
> **requirements panel in your own App Dashboard**, not this document.

**Start verification early.** It takes days to weeks and is the critical path
for launch — but it does **not** block development. Build against test users in
parallel.

---

## 1. Meta setup

Each step says how to verify it worked.

### 1.1 Business Portfolio

1. Create (or open) a **Meta Business Portfolio** at
   [business.facebook.com](https://business.facebook.com).
2. **Claim the Facebook Page** into the portfolio — Business Settings →
   Accounts → Pages. Claimed, not merely "connected": an unclaimed Page cannot
   issue the tokens the webhook needs.
3. Start **Business Verification** (Business Settings → Security Center) with
   the documents in §0.

Verify: the Page appears under **Accounts → Pages** and you hold full control
of it.

### 1.2 Meta App

1. [developers.facebook.com](https://developers.facebook.com) → **Create App** →
   type **Business** → link it to the portfolio from §1.1.
2. Add the **Messenger** product.
3. Add the **Webhooks** product.

Verify: the app dashboard lists both products, and App ID / App Secret are
visible under Settings → Basic.

### 1.3 Record the credentials

| Value            | Where                                      | Goes to                            |
| ---------------- | ------------------------------------------ | ---------------------------------- |
| App ID           | Settings → Basic                           | `META_APP_ID`                      |
| App Secret       | Settings → Basic (reveal)                  | `META_APP_SECRET` — **secret**     |
| Page ID          | Page → About, or Messenger → Settings      | `messaging_channels.page_id` (DB)  |
| Page Access Token| Messenger → Settings → Generate Token      | encrypted in DB, never in env      |
| Verify Token     | You invent it — a long random string       | `META_WEBHOOK_VERIFY_TOKEN`        |

The **Page Access Token is not an env var.** It is per-Page and there will be
one per client, so it lives encrypted in `messaging_channels`. A leaked Page
token lets anyone post as that business.

### 1.4 Webhook subscription

1. Messenger → Settings → **Webhooks** → Add Callback URL:
   `https://<root-domain>/api/messenger/webhook`
2. Verify Token: the string from §1.3.
3. Subscribe to the fields: `messages`, `messaging_postbacks`,
   `messaging_optins`, `message_reads`, `messaging_handovers`.
4. Subscribe the app to the **Page** itself (same screen, Page subscription).

Verify: Meta's callback verification succeeds (it GETs the URL with
`hub.challenge`) and a test message to the Page appears in
`messenger_messages`. **The endpoint must exist and be deployed before this
step will pass.**

### 1.5 Testers

Roles → add yourself and anyone testing as **Administrator**, **Developer** or
**Tester**. In development mode these are the only people the bot may reply to.

### 1.6 App Review (before public launch only)

Request **Advanced Access** to:

| Permission              | Why                                          |
| ----------------------- | -------------------------------------------- |
| `pages_messaging`       | Send and receive messages                    |
| `pages_manage_metadata` | Subscribe the app to a Page's webhooks        |
| `pages_show_list`       | Let a client pick which Page to connect       |
| `business_management`   | Connect Pages owned by client portfolios      |
| Human Agent Access      | *Optional* — extends replies from 24h to 7d   |

Submission needs a **screencast of the real flow** and a written use case. Meta
rejects vague submissions; show a customer asking a question, the bot
collecting details, and the booking arriving.

---

## 2. Hard constraints

These shape the design and cannot be worked around.

- **The 24-hour messaging window.** A Page may only message someone within 24h
  of *their* last message. The AI must therefore complete data collection **in
  the conversation** — it can never say "I'll follow up tomorrow." Message tags
  or Human Agent Access extend this; neither is a general escape hatch.
- **Webhook ACK deadline.** Meta retries if a `200` doesn't arrive in ~20s and
  will disable a persistently failing subscription. The response must **not**
  wait on an LLM call.
- **Webhooks are redelivered.** Message `mid` is the dedupe key, enforced by a
  unique index — not by application logic.
- **Outbound-only messaging is impossible.** Meta gives no way to message a
  Page owner who never wrote to the Page. This is already documented at
  [templates/retreat/lodge/lib/messenger.ts](../templates/retreat/lodge/lib/messenger.ts)
  and remains true: owner alerts go by SMS/email, never Messenger.
- **PSIDs are page-scoped.** The same person has a different ID on each Page.
  Never treat a PSID as a cross-Page identity.

---

## 3. Architecture

```
Customer → Messenger → Meta webhook
                          ↓
        POST /api/messenger/webhook
        verify X-Hub-Signature-256 over the RAW body
                          ↓
        entry[].id = PAGE ID → resolve channel → business (or platform)
                          ↓
        persist inbound message, ACK 200 IMMEDIATELY
                          ↓
        background: grounded context → LLM turn → extract slots
                          ↓
        ├── question          → reply from grounded facts only
        ├── slots incomplete  → ask the ONE next missing detail
        ├── slots complete    → read back → confirm → submit
        └── low confidence    → hand off, notify owner, mute AI
```

Two rules carry the security of the whole feature:

1. **Tenant identity comes from the Page ID in the webhook payload**, never
   from message content. This mirrors host-based tenancy in
   [app/api/bookings/route.ts](../app/api/bookings/route.ts).
2. **The AI submits through the existing public endpoints**, not through SQL.
   It gets no privileged write path — same Zod schema, same rate limits, same
   "status is always `scheduled`" rule. If the model is ever prompt-injected,
   the worst outcome is a bad booking, not an arbitrary write.

---

## 4. Data model

Three migrations.

**`messaging_channels`** — one row per connected Page.

- `page_id` (unique), `page_name`, `page_access_token_encrypted`
- `business_id` **nullable**, `channel_kind` in `('platform','tenant')`, with a
  check constraint that `channel_kind = 'tenant'` ⟺ `business_id is not null`.

  Aliamz's own Page owns no `businesses` row, so it is a `platform` channel and
  its conversations produce `leads`. This mirrors
  [0029_leads.sql](../supabase/migrations/0029_leads.sql) — rather than a
  nullable `business_id` that means nothing, the constraint makes the two cases
  explicit and un-mixable.
- `ai_enabled`, `persona` jsonb, `status`, `connected_at`

**`conversations`** — one per (channel, PSID).

- `psid`, `state` (`ai_active | collecting | awaiting_confirm | human |
  closed`), `intent`, `collected` jsonb (the slot bag), `outcome_ref`,
  `last_customer_message_at` (drives the 24h window), `ai_message_count`

**`messenger_messages`** — the transcript.

- `direction`, `mid` **unique** (dedupe), `text`, `payload` jsonb, `ai_model`,
  `tokens`, `latency_ms`

**RLS:** tenant rows gated by `owns_business()` from
[0007_tenant_rls_helpers.sql](../supabase/migrations/0007_tenant_rls_helpers.sql);
platform-kind rows readable by platform admins only, as `leads` is. No anon
policies — service-role writes only.

**Token encryption is mandatory.** Encrypted at rest, never returned to the
browser, never logged, revocable.

**Retention:** these tables hold third-party personal data and hook into
[lib/jobs/retention.ts](../lib/jobs/retention.ts) from day one, not later.

---

## 5. Accuracy

The design assumption is that **a wrong answer is the client's reputation**, so
the bot is built to decline rather than guess.

**Grounded context pack.** Each turn assembles a compact factual block from the
tenant's own database — name, address, hours, phone, services, prices, FAQ,
policies, staff — reusing
[lib/website/build-profile.ts](../lib/website/build-profile.ts) so the bot and
the website cannot disagree.

**Rules enforced in the system prompt:**

- Answer only from the context pack. No inference, no "typically."
- No price, availability or promise that isn't in the data.
- Unknown → "let me check with the team on that" → flag for the owner.
- Never confirm a slot as *booked*. The platform creates booking **requests**;
  the schema is honest about that and so must the bot be.

**Owner-authored knowledge is the real lever.** The CMS FAQ is extended with a
**Messenger Knowledge** section (deposits, parking, cancellation, pets…).
Clients correct wrong answers by editing content — not by us editing prompts.
That is what makes this scale past a handful of clients.

**Prompt injection:** customer text is passed as untrusted data, never
concatenated as instructions. The model's tool surface is limited to
`save_details`, `submit`, `escalate`.

---

## 6. Sounding human

- **Persona per business**, derived from the brand and configurable.
- **One question at a time.** Nothing breaks the illusion faster than a form
  dumped into a chat bubble.
- **`mark_seen` + `typing_on`** with a delay proportional to reply length.
- **Short messages.** No bullet lists, no "As an AI", no emoji spam, no
  repeating the customer's name every turn.
- **Mirror the customer's language** — including Taglish.
- **Acknowledge before asking:** "ah, for two nights — got it. what date were
  you thinking?"
- **Disclosure, once, lightly.** Meta's platform policy — and several
  jurisdictions, e.g. California's B.O.T. Act — require disclosing automation.
  An "assistant" framing in the greeting satisfies this without wrecking the
  tone. A bot posing as a named staff member puts the Page at risk.

---

## 7. Slot filling

Required slots per intent, validated with the **existing** Zod schemas so the
bot cannot collect something the API will reject:

| Intent                     | Required                                                             | Target                            |
| -------------------------- | -------------------------------------------------------------------- | --------------------------------- |
| Tenant booking             | name, phone (E.164), service, date, time (+ staff, notes optional)   | `POST /api/bookings`              |
| Tenant enquiry             | name, contact, message                                                | `POST /api/enquiries`             |
| Aliamz consultation        | name, email, phone, project type, preferred date/time, message        | `leads` (`kind = 'consultation'`) |

**The loop:** extract slots from every turn via structured output → merge into
`collected` → ask for the single highest-priority missing one → when complete,
**read the whole thing back for confirmation** → only then submit.

Submission is **idempotent on `conversation_id`**, so a double "yes" cannot
create two bookings.

The owner is then alerted through the existing SMS/email path
([lib/notifications/booking-notice.ts](../lib/notifications/booking-notice.ts))
— no new notification channel.

---

## 8. Human handoff

Escalate on: an explicit request; complaint / refund / legal language; the same
question failing twice; low confidence; or a cap on AI turns per conversation.

On escalation the AI is muted on that thread, the owner is notified, and thread
control is passed to the **Page Inbox** via the Handover Protocol so the owner
replies natively in Messenger. The owner can also toggle the AI off per-thread
from the dashboard.

---

## 9. Phasing

| Phase | Deliverable                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | Business verification, Meta app, Page connect (§0–§1). No code. **Start now.**                                                            |
| **1** | Webhook: GET verify, signature check on raw body, dedupe, persist, fast ACK.                                                              |
| **2** | Grounded Q&A for Aliamz — answers from real content, escalates otherwise.                                                                 |
| **3** | Slot filling → `leads` + confirmation + owner alert. **A working Aliamz bot.**                                                            |
| **4** | Handoff, per-thread AI toggle, conversation inbox for platform staff.                                                                     |
| **5** | Multi-tenant: client Page connect via Facebook Login, tenant grounding pack, → `/api/bookings` + `/api/enquiries`, `messenger_ai` feature flag, Messenger Knowledge CMS. |
| **6** | Cost caps per tenant, conversion analytics, retention, alerting.                                                                          |

**Phases 1–3 ship as one milestone.** Phase 5 is the product.

---

## 10. Environment

| Variable                          | Note                                                    |
| --------------------------------- | ------------------------------------------------------- |
| `META_APP_ID`                     | Settings → Basic                                        |
| `META_APP_SECRET`                 | **Secret.** Signs `X-Hub-Signature-256`                  |
| `META_WEBHOOK_VERIFY_TOKEN`       | **Secret.** Long random string you invent                |
| `META_GRAPH_VERSION`              | Pinned, e.g. `v23.0` — never "latest"                    |
| `MESSENGER_TOKEN_ENCRYPTION_KEY`  | **Secret.** Encrypts Page tokens at rest                 |
| `AI_CHAT_PROVIDER`                | `openai` \| `anthropic`; unset ⇒ auto-detect by key      |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Existing vars, reused                               |

Page IDs and Page Access Tokens are **not** env vars — they are per-Page and
live in `messaging_channels`.

---

## 11. Risks

1. **App Review is the schedule risk**, not engineering. Verification plus
   review can run weeks, and a vague submission gets rejected.
2. **The 24-hour window shapes the UX.** The AI must close the loop in-session.
3. **Serverless + webhooks.** Generating the reply inline risks blowing the ACK
   deadline and getting double deliveries. Ack-then-process
   (Trigger.dev per the stack) is the intended design.
4. **Wrong answers cost the client, not us.** Ship Phase 2 escalation-heavy and
   loosen as the knowledge base fills.
5. **Page tokens are keys to a client's business Page.** Encrypted, revocable,
   audited, never client-side.
6. **AI cost is per-conversation and uncapped by default.** Phase 6 adds
   per-tenant caps; until then, watch it.
