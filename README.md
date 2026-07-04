# new-crm

An internal, Close-CRM-style CRM built on Next.js 15 (App Router) + Prisma +
Postgres, deployable to Vercel. Light UI, Kanban pipeline, API keys, signed
outbound webhooks, inbound event endpoint for n8n/Zapier, and Gmail inbox
sync + send.

## Features

- **Contacts / Leads / Opportunities** with custom fields (admin-configurable)
- **Kanban board** for opportunities with drag-and-drop between stages
- **Customizable sales pipelines** (multiple pipelines, custom stages, win probability)
- **Activities / tasks / notes / calls / meetings** attached to contacts & opps
- **Gmail sync**: inbox polling via Vercel Cron (every 5 min), send from within the app
- **API keys** (`Authorization: Bearer nck_…`) for REST API under `/api/v1/*`
- **Outgoing webhooks** with per-endpoint HMAC-SHA256 signatures (`x-crm-signature`)
- **Inbound events** endpoint at `POST /api/v1/events` for n8n / Zapier
- **Admin dashboard**: users & roles, custom fields, pipelines, webhooks
- **Role-based access**: `ADMIN` vs `USER`

## Quick start (local)

```bash
pnpm install   # or npm install / yarn
cp .env.example .env
# fill in DATABASE_URL, GOOGLE_CLIENT_ID/SECRET, AUTH_SECRET
npx prisma db push
npx tsx prisma/seed.ts  # creates default pipeline + admin if BOOTSTRAP_ADMIN_EMAIL is set
pnpm dev
```

Open http://localhost:3000 and sign in with Google.

## Deploy to Vercel

1. Create a Postgres database (Vercel Postgres / Neon / Supabase) and set
   `DATABASE_URL` in the project env.
2. In Google Cloud Console, create an OAuth 2.0 Client (Web) with authorized
   redirect URI `https://<your-domain>/api/auth/callback/google` and enable the
   **Gmail API**. Copy client ID + secret to Vercel env.
3. Set env vars: `AUTH_SECRET` (32-byte base64), `AUTH_URL`, `NEXTAUTH_URL`,
   `WEBHOOK_SIGNING_SECRET`, `BOOTSTRAP_ADMIN_EMAIL` (your email), optional
   `CRON_SECRET` to lock the cron route.
4. `vercel deploy`. Prisma migrations run on build (`prisma generate` +
   `prisma db push` via the `build` script; for production you may swap to
   `prisma migrate deploy`).
5. Sign in — on first login your email is promoted to `ADMIN`.

## REST API (for n8n, Zapier, scripts)

Authentication:

```
Authorization: Bearer nck_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Base URL: `https://<your-domain>/api/v1`

Endpoints:

| Method | Path                         | Purpose                                        |
|-------:|:-----------------------------|:-----------------------------------------------|
|    GET | `/contacts`                  | list contacts (`?q=…&limit=…`)                 |
|   POST | `/contacts`                  | create contact                                 |
|    GET | `/contacts/:id`              | fetch                                          |
|  PATCH | `/contacts/:id`              | update                                         |
| DELETE | `/contacts/:id`              | delete                                         |
|    GET | `/leads`                     | list leads                                     |
|   POST | `/leads`                     | create lead (supports `contactEmail`)          |
|    GET | `/opportunities`             | list opps                                      |
|   POST | `/opportunities`             | create (supports `stageName` + `contactEmail`) |
|   POST | `/events`                    | generic inbound event (see below)              |

### Inbound events (n8n / Zapier)

`POST /api/v1/events` with `{"type": "<type>", "data": { … }}`:

- `contact.upsert` — `{ email, firstName?, lastName?, company?, phone?, title?, customData? }`
- `lead.create` — `{ title, contactEmail?, value?, source? }`
- `activity.log` — `{ contactEmail?, title, body?, type? }`
- `opportunity.move` — `{ id, stageName }`

All of these fire the corresponding outbound webhooks so you can build two-way
automation loops.

## Outbound webhooks

Admin → Webhooks lets you register endpoint URLs and subscribe to events.
Each endpoint gets its own HMAC secret (viewable/copy from the UI). Every
delivery sends:

```
POST <your endpoint>
Content-Type: application/json
x-crm-event: OPPORTUNITY_STAGE_CHANGED
x-crm-delivery: <delivery-id>
x-crm-signature: sha256=<hex>
```

Body:

```json
{
  "id": "uuid",
  "event": "OPPORTUNITY_STAGE_CHANGED",
  "created_at": "2026-04-14T00:00:00.000Z",
  "data": { ... }
}
```

To verify in n8n (Function node):

```js
const crypto = require("crypto");
const body = JSON.stringify($input.item.json);
const signature = $input.item.json.headers["x-crm-signature"].split("=")[1];
const expected = crypto.createHmac("sha256", "<your-secret>").update(body).digest("hex");
return { ok: crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex")) };
```

## Meta Conversions API (lead-quality feedback loop)

Facebook/Instagram Lead Ads are sent into the CRM (via Zapier → `POST
/api/v1/leads`). When your team then qualifies or **disqualifies** a lead, the
CRM sends a server event back to Meta's **Conversions API** so Meta learns which
leads are good and which are junk — and optimizes ad delivery toward the good
ones. This is Meta's "CRM integration for Conversions API" (Events Manager →
Connect data).

**How it works**

1. At ingest, `POST /api/v1/leads` stores Meta's `lead_id` on the lead
   (`metaLeadId`). Send it as `metaLeadId`, `lead_id`, `fbLeadId`, or
   `fb_lead_id` — in Zapier's *Facebook Lead Ads* trigger this is the lead's
   `id` field. This is the highest-priority match key, so map it.
2. When a lead is created, an initial `Lead` event fires (the raw-lead stage).
3. When a lead's **status** changes, `PATCH /api/internal/leads/:id` fires an
   event for the new stage. The CRM status → Meta `event_name` map defaults to:

   | CRM status  | Meta event_name    | Meaning                     |
   | ----------- | ------------------ | --------------------------- |
   | `POTENTIAL` | `Lead`             | raw lead                    |
   | `QUALIFIED` | `QualifiedLead`    | good lead                   |
   | `CUSTOMER`  | `Purchase`         | converted                   |
   | `BAD_FIT`   | `DisqualifiedLead` | **junk / unqualified lead** |
   | `CHURNED`   | `ChurnedLead`      | lost customer               |

   Override with `META_CAPI_EVENT_MAP` (JSON); set a stage to `""` to skip it.

All PII (email, phone, name) is SHA-256 hashed before it leaves the server, per
Meta's requirement. Every attempt is logged to the `MetaCapiEvent` table
(HTTP status, `fbtrace_id`, `events_received`, errors) for debugging — cross-check
against Events Manager → Diagnostics.

**Setup** — set these env vars (all optional; blank `DATASET_ID`/`ACCESS_TOKEN`
disables the integration):

```
META_CAPI_DATASET_ID=523876770030049   # your dataset/pixel ID
META_CAPI_ACCESS_TOKEN=...             # Events Manager → Create endpoint → Generate Access Token
META_CAPI_API_VERSION=v25.0
META_CAPI_TEST_EVENT_CODE=TEST12345    # optional; routes to the Test events tab while verifying
META_CAPI_DEFAULT_COUNTRY_CODE=91      # optional; prefixes bare 10-digit phones before hashing
```

## Events emitted

`CONTACT_CREATED`, `CONTACT_UPDATED`, `CONTACT_DELETED`,
`LEAD_CREATED`, `LEAD_UPDATED`, `LEAD_DELETED`,
`OPPORTUNITY_CREATED`, `OPPORTUNITY_UPDATED`, `OPPORTUNITY_STAGE_CHANGED`,
`OPPORTUNITY_DELETED`, `ACTIVITY_CREATED`, `EMAIL_SENT`, `EMAIL_RECEIVED`.

## Architecture

- **Next.js 15 App Router** with Server Components for fast list pages and
  Server Actions for auth flows.
- **Prisma** with Postgres; all entities indexed for common access patterns.
- **Auth.js v5** (NextAuth) with Google OAuth and database sessions. We ask for
  Gmail scopes (`readonly`, `send`, `modify`) so the CRM can sync & send mail.
- **`src/lib/webhooks.ts`** fans out events asynchronously from route handlers;
  every delivery is recorded in `WebhookDelivery` for debugging.
- **`src/lib/gmail.ts`** refreshes tokens using the stored `refresh_token` on
  the user's Google `Account`, polls recent messages, and sends mail.
- **`/api/cron/gmail-sync`** runs every 5 minutes on Vercel Cron.
- **Kanban**: `@dnd-kit` with optimistic reorder + single PATCH per move.

## Perf notes

- All list pages use `force-dynamic` with tight `take` limits.
- Kanban reorder writes in one transaction.
- No client JS on read-heavy pages (Dashboard, Activities, Leads list).
- Tailwind-only CSS with no runtime-in-JS styling.

## Suggested follow-ups

- Webhook delivery retries with exponential backoff (currently one-shot).
- Row-level ownership filtering on the `/api/v1/*` routes.
- Per-user, per-key rate limits (Upstash Redis) in `src/lib/api-auth.ts`.
- Email threading view (group by `threadId`).
- Gmail push notifications via Pub/Sub instead of polling.
