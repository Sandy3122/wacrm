# wacrm — Complete Setup & Usage Guide

A self-hostable CRM template for WhatsApp built on **Next.js 16 (App
Router) + React 19 + Supabase + Tailwind v4**. This guide walks through
everything: what the system is, how to set it up, how each integration
works end to end, and how to use every module.

> This is the product repo. You clone/fork it, point it at *your own*
> Supabase project and *your own* Meta WhatsApp app, and host it
> yourself. No SaaS, no seat pricing — your code, your data.

---

## Table of contents

1. [Architecture at a glance](#1-architecture-at-a-glance)
2. [Prerequisites](#2-prerequisites)
3. [Environment variables](#3-environment-variables)
4. [Supabase setup](#4-supabase-setup-database--auth)
5. [WhatsApp / Meta setup](#5-whatsapp--meta-setup)
6. [Local development](#6-local-development)
7. [How the WhatsApp integration works (flows)](#7-how-the-whatsapp-integration-works-flows)
8. [Connecting a WhatsApp number — the three paths](#8-connecting-a-whatsapp-number--the-three-paths)
9. [Scheduled jobs (cron) setup](#9-scheduled-jobs-cron-setup)
10. [Using the app, module by module](#10-using-the-app-module-by-module)
11. [API reference (internal routes)](#11-api-reference-internal-routes)
12. [Deployment](#12-deployment)
13. [Security model](#13-security-model)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Architecture at a glance

```
┌───────────────────────────────────────────────────────────────┐
│                        Browser (React 19)                       │
│  Dashboard · Inbox · Contacts · Pipelines · Broadcasts ·        │
│  Automations · Flows · Settings                                 │
└───────────────────────────────┬───────────────────────────────┘
                                 │  (Supabase JS + fetch to /api)
┌───────────────────────────────▼───────────────────────────────┐
│                    Next.js App Router (server)                  │
│                                                                 │
│  middleware.ts ── auth gate (redirects + 401s)                  │
│                                                                 │
│  /api/whatsapp/*   send · broadcast · config · accounts ·       │
│                    templates · media · webhook · embedded-signup│
│  /api/automations/* CRUD · engine · cron                        │
│  /api/flows/*       CRUD · cron · templates                     │
│  /api/billing       usage panel                                 │
│  /api/workspaces    workspace switching                         │
│                                                                 │
│  lib/whatsapp/providers ── provider abstraction                 │
│     (meta-cloud · bsp-adapter · custom)                         │
│  lib/whatsapp/send-service ── shared send path                  │
│  lib/automations/engine · lib/flows/engine                      │
└───────────────────────────────┬───────────────────────────────┘
                                 │
        ┌────────────────────────┼─────────────────────────┐
        ▼                        ▼                          ▼
┌───────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Supabase    │      │   Meta Cloud API  │      │   BSP / Custom    │
│ Postgres+Auth │      │ (official WA API) │      │ 360dialog/Twilio… │
│ Storage + RLS │      └──────────────────┘      └──────────────────┘
└───────────────┘
```

Key ideas:

- **Everything outbound goes through a provider.** No business code
  calls the Meta Graph API directly. `lib/whatsapp/send-service.ts` is
  the single send path: resolve account → pick provider → try phone
  variants → persist the message.
- **Everything inbound goes through one durable webhook pipeline:**
  `ingest → normalize → dispatch`. Raw events are stored first
  (deduped + replayable), then normalized into Meta's envelope, then
  dispatched to contacts/conversations/messages and the
  automation/flow engines.
- **Multi-tenant by design.** Data is scoped to an organization +
  workspace. Legacy single-user rows are auto-backfilled, so older
  installs keep working.
- **Row-Level Security on every table**, token encryption
  (AES-256-GCM), HMAC-verified webhooks, rate limiting, plan/usage
  enforcement.

### Tech stack

| Layer        | Choice                                                |
|--------------|-------------------------------------------------------|
| App          | Next.js 16 (App Router), React 19, TypeScript         |
| Styling      | Tailwind v4, shadcn-style UI components, lucide icons |
| Data / Auth  | Supabase (Postgres + Auth + Storage + RLS)            |
| WhatsApp     | Meta Cloud API + pluggable BSP/custom providers       |
| Drag & drop  | dnd-kit (pipeline Kanban)                             |
| Tests        | Vitest                                                |

---

## 2. Prerequisites

Before you start, make sure you have:

- **Node.js ≥ 20** (`node -v`).
- **npm** (ships with Node) — the repo uses `package-lock.json`.
- A **Supabase** account + a project (free tier is fine to start).
- The **Supabase CLI** is bundled as a dev dependency, so
  `npm run db:push` works without a global install.
- A **Meta for Developers** account with a **Business**-type app and
  the **WhatsApp** product added.
- A WhatsApp **Business** phone number (Cloud API test number works for
  development).
- A publicly reachable **HTTPS URL** for webhooks. In local dev use a
  tunnel (ngrok, Cloudflare Tunnel) since Meta must reach your
  `/api/whatsapp/webhook` endpoint.

> **Important — read the framework docs first.** This repo pins
> **Next.js 16**, which has breaking changes vs. earlier versions. Per
> the workspace `AGENTS.md`, consult `node_modules/next/dist/docs/`
> before changing App Router code, route handlers, or config.

---

## 3. Environment variables

Copy the example file and fill it in:

```bash
cp .env.local.example .env.local
```

### Required (app won't start without these)

| Variable | What it is | Where to get it |
|----------|-----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (client-safe) | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — **bypasses RLS**, server only | Supabase → Project Settings → API |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) for AES-256-GCM token encryption | Generate (below) |
| `META_APP_SECRET` | Verifies HMAC-SHA256 signature on every inbound webhook | Meta → App Settings → Basic |
| `NEXT_PUBLIC_META_APP_ID` | Meta app id (Embedded Signup) | Meta App Dashboard |
| `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` | Embedded Signup config id | Meta → WhatsApp → Embedded Signup |

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ **Rotating `ENCRYPTION_KEY` orphans every stored token.** Tokens
> encrypted under the old key can no longer be decrypted, so users must
> re-save their WhatsApp settings. Keep this value identical across all
> environments (local, staging, production).

> ⚠️ Without `META_APP_SECRET`, the webhook rejects **every** inbound
> POST with a 401 (the signature can't be verified). This is required
> for any inbound message to land.

### Recommended

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL (scheme + host, no trailing slash). Used for sitemap, OG images, emails. | `https://wacrm.tech` |

### Optional (only if you use the feature)

| Variable | Purpose |
|----------|---------|
| `AUTOMATION_CRON_SECRET` | Shared secret protecting `GET /api/automations/cron`, `GET /api/flows/cron`, and `POST /api/whatsapp/webhook/replay`. Required if you use **Wait** steps in automations or want webhook auto-recovery. Generate with `openssl rand -hex 32`. |

The Embedded Signup variables are only needed for **in-app Meta
onboarding** (Coexistence). If you connect numbers manually, you can
leave them blank.

---

## 4. Supabase setup (database + auth)

### 4.1 Create the project

1. Create a new project at [supabase.com](https://supabase.com).
2. From **Project Settings → API**, copy the URL, anon key, and
   service-role key into `.env.local`.

### 4.2 Run the migrations

The full schema lives in `supabase/migrations/` (numbered
`001` → `026`). Apply them in order:

```bash
# link your local project to the remote (one-time)
npx supabase link --project-ref <your-project-ref>

# push all migrations
npm run db:push          # = supabase db push

# verify what's applied
npm run db:migration:list
```

What the migrations build (high level):

| Range | Adds |
|-------|------|
| `001` | Core schema: profiles, contacts, tags, custom fields, conversations, messages, pipelines, deals, broadcasts — all with RLS. |
| `002`–`009` | Pipeline enhancements, broadcast recipient tracking (wamid), incremental counts, avatars storage, message actions. |
| `006`–`007` | Automations + counter RPC. |
| `010`–`012` | Flows (visual builder) + counter RPC. |
| `013`–`014` | `whatsapp_config` phone-number-id uniqueness, Meta template integration, coexistence columns. |
| `015`–`017` | **Organizations / workspaces / members** + RLS helpers + backfill of existing single-user rows into a default org + workspace. |
| `018`–`020` | `whatsapp_accounts` (account-per-workspace), conversations/messages scoped to an account, migration of legacy `whatsapp_config` → `whatsapp_accounts`. |
| `021` | `raw_webhook_events` — durable, deduped, replayable webhook store. |
| `022`–`024` | Billing subscriptions, usage logs + `record_usage()`, plan limits matrix. |
| `025` | Audit logs. |
| `026` | Trigger to auto-fill `workspace_id` on client-side inserts. |

> The migrations are **idempotent** where it matters (tables/indexes use
> `IF NOT EXISTS`, policies are dropped + recreated), and the multi-tenant
> work is **backward compatible**: legacy `user_id`-scoped rows still
> resolve as a fallback.

### 4.3 Auth

Supabase Auth (email + password) powers sign-in. The app ships with
`/login`, `/signup`, and `/forgot-password` pages. `src/middleware.ts`
gates everything:

- Logged-in users hitting `/login`, `/signup`, `/forgot-password` are
  redirected to `/dashboard`.
- Anonymous users hitting protected paths (`/dashboard`, `/inbox`,
  `/contacts`, `/pipelines`, `/broadcasts`, `/automations`,
  `/settings`) are redirected to `/login`.
- Anonymous calls to `/api/whatsapp/*` (except `/webhook`) get a 401.

In Supabase, configure your **Site URL** and any redirect URLs under
**Authentication → URL Configuration** so password-reset/confirmation
emails point at your deployment.

---

## 5. WhatsApp / Meta setup

You connect WhatsApp through Meta's official Cloud API. There are three
ways to connect a number (see [section 8](#8-connecting-a-whatsapp-number--the-three-paths)); this section covers the shared Meta-side
config.

### 5.1 Create the Meta app

1. Go to [Meta for Developers](https://developers.facebook.com/) →
   **My Apps → Create App → Business**.
2. Add the **WhatsApp** product.
3. From **App Settings → Basic**, copy the **App Secret** into
   `META_APP_SECRET`, and the **App ID** into `NEXT_PUBLIC_META_APP_ID`.

### 5.2 Get your phone credentials

From **WhatsApp → API Setup** you get:

- **Phone number ID** (`phone_number_id`)
- **WhatsApp Business Account ID** (`waba_id`)
- A temporary or permanent **access token**
- Your **display phone number**

For production, generate a **permanent** System User access token
(Business Settings → System Users) rather than the 24-hour dev token.

### 5.3 Configure the webhook

In **Meta App Dashboard → WhatsApp → Configuration → Webhooks**:

- **Callback URL:** `https://your-domain.com/api/whatsapp/webhook`
- **Verify token:** the same string you save in the wacrm WhatsApp
  settings (the app stores it encrypted and matches it during the
  `GET` verification handshake).
- **Subscribe to fields:**

| Field | Needed for |
|-------|-----------|
| `messages` | Inbound customer messages (required) |
| `message_echoes` | Outbound echoes (some setups) |
| `smb_message_echoes` | **Coexistence** — replies sent from the WhatsApp Business App |
| `smb_app_state_sync` | **Coexistence** — contact sync from the Business App |
| `history` | **Coexistence** — backfill chat history (must complete within 24h of onboarding) |

The webhook handshake (`GET /api/whatsapp/webhook`) checks the verify
token against **both** the new `whatsapp_accounts` table and the legacy
`whatsapp_config` table, marking the matching row `webhook_status =
verified`. Inbound POSTs are HMAC-verified against `META_APP_SECRET`
before any processing.

---

## 6. Local development

```bash
git clone https://github.com/<your-username>/wacrm.git
cd wacrm
npm install
cp .env.local.example .env.local   # fill in the values from sections 3–5
npm run dev
```

Open <http://localhost:3000>. You'll land on `/login` (or `/dashboard`
if a session exists).

### Useful scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server (run this in your own terminal — it's long-running). |
| `npm run build` | Production build. |
| `npm start` | Start the production server. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Vitest (single run). |
| `npm run test:watch` | Vitest watch mode. |
| `npm run format` / `format:check` | Prettier. |
| `npm run db:push` | Apply Supabase migrations. |
| `npm run db:migration:list` | List applied migrations. |

### Exposing the webhook locally

Meta needs to reach your machine. Start a tunnel and point the Meta
callback URL at it:

```bash
# example with ngrok
ngrok http 3000
# then use https://<sub>.ngrok.app/api/whatsapp/webhook as the callback URL
```

Set `NEXT_PUBLIC_SITE_URL` to the tunnel URL so generated links match.

---

## 7. How the WhatsApp integration works (flows)

### 7.1 Inbound message pipeline (`ingest → normalize → dispatch`)

```
Meta / BSP POST ──▶ /api/whatsapp/webhook  (or /webhook/:provider/:accountId)
        │
        ├─ 1. Verify HMAC-SHA256 signature (META_APP_SECRET) ──▶ 401 if bad
        ├─ 2. Rate-limit per phone_number_id
        ├─ 3. Ack 200 immediately, process async (beat Meta's timeout)
        │
        ▼
   processWebhook()
        │
        ├─ Resolve config by phone_number_id (accounts → legacy fallback)
        ├─ INGEST: write raw_webhook_events first, with a dedupe key
        │          derived from message/echo ids. Duplicate? skip.
        ├─ NORMALIZE: BSP payloads mapped into Meta's envelope
        │            (providers/webhook-normalize.ts)
        └─ DISPATCH (processChange):
              ├─ statuses        → update messages + broadcast_recipients
              ├─ messages        → find/create contact + conversation,
              │                    insert message, fire flows + automations
              ├─ smb_message_echoes / message_echoes → Business App reply,
              │                    pause bot (coexistence)
              ├─ history         → backfill past chats
              └─ smb_app_state_sync → contact sync from Business App
```

Per-change failures are marked `failed` in `raw_webhook_events` and
become **replayable** via `POST /api/whatsapp/webhook/replay`. The
dedupe index on `messages.provider_message_id` makes replay idempotent.

**Status ladder.** Recipient delivery status only moves forward:
`pending → sent → delivered → read → replied`. `failed` is accepted
only from `pending`/`sent`. A late/duplicate webhook can never regress a
recipient back down the ladder.

### 7.2 Outbound send path

Every outbound message (inbox reply, broadcast, automation/flow send)
flows through one place:

```
caller ──▶ resolveOutbound({ accountId?, workspaceId?, userId })
                │   prefers: conversation's bound account → workspace
                │            → user's account → legacy whatsapp_config
                ▼
         provider (Meta Cloud | BSP adapter | Custom)
                │   sendText / sendTemplate / sendInteractive…
                ├─ retry across phone variants on "recipient not allowed"
                ▼
         persist message row (provider_message_id, status='sent')
```

If an alternate phone variant (e.g. with/without a trunk-prefix `0`)
succeeds, the corrected number is written back to the contact so the
next send goes straight through.

### 7.3 The provider abstraction

`src/lib/whatsapp/providers/` defines a `WhatsAppProvider` interface
(`types.ts`) with `sendText`, `sendTemplate`, `sendInteractiveButtons`,
`sendInteractiveList`, `sendReaction`, `verifyConnection`,
`getMediaUrl`, `downloadMedia`, plus a `capabilities` map so callers can
branch instead of catching "not implemented".

| Implementation | Handles |
|----------------|---------|
| `meta-cloud.provider.ts` | Meta Cloud API — `legacy_cloud_api` + `coexistence` connection types |
| `bsp-adapter.provider.ts` | Cloud-API-compatible BSPs (360dialog, Gupshup, MessageBird…) with configurable base URL + auth header |
| `custom.provider.ts` | Forwards to a user-supplied webhook |

`factory.ts` builds the right provider from a `whatsapp_accounts` row
(decrypting secrets on the way).

### 7.4 Automations vs. Flows (and the bot gate)

- **Automations** (`lib/automations/engine.ts`) — event-driven rules:
  triggers (`new_message_received`, `keyword_match`,
  `new_contact_created`, `first_inbound_message`, schedule), conditional
  branches, **Wait** steps, tags, webhooks. Wait steps create
  `automation_pending_executions` rows drained by the cron.
- **Flows** (`lib/flows/engine.ts`) — per-contact conversational runs
  advanced by inbound messages / interactive button & list taps. A
  partial unique index allows one active run per contact; abandoned runs
  are swept to `timed_out` by the flows cron.
- **Bot gate** (`lib/whatsapp/bot-gate.ts`) — `shouldRunAutomation()` is
  the single gate. It blocks automations when the bot is paused/closed,
  a human is assigned, or a Business App echo recently arrived
  (coexistence human-takeover; default 24h pause). When an agent replies
  from the inbox, active flow runs are paused.

---

## 8. Connecting a WhatsApp number — the three paths

All three end with credentials stored encrypted and routing through the
provider layer. Pick based on your Meta relationship.

### Path A — Manual Cloud API (simplest, direct)

Best for: you have your own Meta app + Cloud API number.

1. **Settings → WhatsApp Config** in the app.
2. Choose **Legacy / direct Cloud API**.
3. Enter `phone_number_id`, `waba_id` (optional), `access_token`, and a
   `verify_token` you make up.
4. Save. The app calls Meta to **verify** the credentials, encrypts the
   token, stores the row, and mirrors it into `whatsapp_accounts`.
5. In Meta, set the webhook callback URL + the same verify token, and
   subscribe to `messages`.

API: `POST /api/whatsapp/config` (or `POST /api/whatsapp/accounts` for
the multi-account UI).

### Path B — Embedded Signup / Coexistence (Meta Partner)

Best for: onboarding customers who keep using the **WhatsApp Business
App** on their phone while wacrm sends via Cloud API on the same number.

Requires `NEXT_PUBLIC_META_APP_ID` +
`NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`. Full walkthrough lives in
[`docs/whatsapp-coexistence-setup.md`](./whatsapp-coexistence-setup.md).
Short version:

1. **Settings → WhatsApp Config → Coexistence — WhatsApp Business App +
   API**.
2. Click **Connect WhatsApp Business App Number** → complete Meta login.
3. The app calls `POST /api/whatsapp/embedded-signup/complete`, which
   exchanges the code, fetches phone info, subscribes the app to the
   WABA, stores a `coexistence` config (encrypted token + generated
   verify token), and returns the verify token to paste into Meta.
4. Subscribe to `smb_message_echoes`, `smb_app_state_sync`, and
   `history` in addition to `messages`.

Coexistence behavior: a customer reply from the Business App arrives as
`smb_message_echoes`, is stored as source **WhatsApp Business App**, and
**pauses the bot** (default 24h) so automations don't talk over a human.

### Path C — BSP adapter (no Meta Partner status)

Best for: you route through a BSP (360dialog, Twilio, Gupshup,
MessageBird) or a fully custom integration.

1. **Settings → WhatsApp Accounts → connect**.
2. Pick a provider preset (served by `GET /api/whatsapp/providers`).
3. Fill the provider-specific fields. Defaults baked into each preset:

| Provider | Required fields | Config defaults |
|----------|-----------------|-----------------|
| **Meta Cloud API (direct)** | Phone Number ID, Access Token (+ optional WABA ID, Verify Token) | — |
| **360dialog** | API Key (+ optional Phone Number ID) | `baseUrl: https://waba-v2.360dialog.io`, `authHeader: D360-API-KEY` |
| **Twilio** | Account SID, Auth Token, WhatsApp Sender (`whatsapp:+…`) | — |
| **Gupshup** | API Key, Source Number | `baseUrl: https://api.gupshup.io/wa/api/v1`, `authHeader: apikey` |
| **MessageBird / Bird** | Access Key, Channel ID | `baseUrl: https://conversations.messagebird.com/v1`, `authHeader: Authorization`, `authScheme: AccessKey ` |
| **Custom Webhook** | API Key (optional) + `webhookUrl` in `provider_config` | — |

4. Credentials are schema-validated, encrypted, and stored. Point the
   BSP's webhook at
   `POST /api/whatsapp/webhook/:provider/:accountId` (BSP payloads are
   normalized into Meta's envelope on ingest).

API: `POST /api/whatsapp/accounts`, managed via
`GET/PATCH/DELETE /api/whatsapp/accounts/:id`.

---

## 9. Scheduled jobs (cron) setup

Two endpoints need to be pinged on a schedule. Both are protected by
`AUTOMATION_CRON_SECRET` (sent as the `x-cron-secret` header). The
webhook replay endpoint uses `Authorization: Bearer <secret>`.

| Endpoint | Purpose | Suggested interval |
|----------|---------|--------------------|
| `GET /api/automations/cron` | Drains due `automation_pending_executions` (Wait steps). Claims rows (`status='running'`) as a lock; processes up to 50/run. | every 1–5 min |
| `GET /api/flows/cron` | Sweeps abandoned active flow runs to `timed_out` based on each flow's `fallback_policy.on_timeout_hours` (default 24h). Frees the one-active-run-per-contact index. | every 5–60 min |
| `POST /api/whatsapp/webhook/replay` | Re-processes `failed` `raw_webhook_events` (idempotent). | every ~5 min (optional) |

Example with a generic scheduler / curl:

```bash
# automations
curl -H "x-cron-secret: $AUTOMATION_CRON_SECRET" \
  https://your-domain.com/api/automations/cron

# flows
curl -H "x-cron-secret: $AUTOMATION_CRON_SECRET" \
  https://your-domain.com/api/flows/cron

# webhook replay (note: Bearer auth)
curl -X POST -H "Authorization: Bearer $AUTOMATION_CRON_SECRET" \
  https://your-domain.com/api/whatsapp/webhook/replay
```

Use Vercel Cron, GitHub Actions, a Hostinger cron job, or any external
pinger. If you don't use Wait steps or Flows, the crons are optional —
but the flows cron is **not optional once you use Flows** (abandoned
runs would otherwise block new triggers for that contact forever).

---

## 10. Using the app, module by module

### Dashboard (`/dashboard`)
Real-time overview: response times, daily message volume, pipeline value,
and a cross-module activity feed. Backed by `lib/dashboard/queries.ts`.

### Inbox (`/inbox`)
Shared team inbox on one WhatsApp number. Per-conversation **assignment**,
**status**, and **notes**. Supports text, media, templates, interactive
button/list replies, reactions, and swipe-reply quoting. Replying as an
agent pauses any active automation/flow for that contact (human takeover).
Sends via `POST /api/whatsapp/send`.

### Contacts (`/contacts`)
Contacts with **tags**, **custom fields**, **CSV import** (with
deduplication), and a detail view that links to conversations and deals.

### Pipelines (`/pipelines`)
Kanban sales pipelines (dnd-kit drag & drop). Deals carry a value and
stage and can be linked to conversations. Includes pipeline analytics +
settings (stages, etc.).

### Broadcasts (`/broadcasts`)
Four-step wizard: **choose template → select audience → personalize →
schedule/send**. Uses Meta-approved templates with **per-recipient
variable substitution**, and tracks delivery + read + reply per
recipient. Sends via `POST /api/whatsapp/broadcast`.

> The broadcast API accepts a preferred `recipients: [{ phone, params }]`
> shape (per-recipient personalization) and a legacy `phone_numbers` +
> `template_params` shape (all recipients share the same params).

### Automations (`/automations`)
No-code, event-driven rules with a visual builder. Triggers on inbound
messages, keywords, new contacts, first inbound message, or schedule;
supports conditional branches, **Wait** steps (cron-drained), tagging,
and outbound webhooks. Create at `/automations/new`, edit at
`/automations/[id]/edit`, inspect runs at `/automations/[id]/logs`.

### Flows (`/flows`)
Per-contact conversational flows advanced by replies and interactive
taps. Visual builder at `/flows/[id]`, run history at
`/flows/[id]/runs`. Abandoned runs time out via the flows cron.

### Settings (`/settings`)
- **Profile** — name, email, avatar (Supabase Storage).
- **Password** + **Sessions** (global sign-out).
- **Appearance** — theme.
- **WhatsApp Config / Accounts** — connect & manage numbers (the three
  paths above), test the connection, reset a corrupted token.
- **Templates** — sync + manage Meta-approved message templates.
- **Tags** — manage the tag catalog.
- **Usage** — plan limits + current usage (powered by
  `GET /api/billing`).

### Roles (RBAC)

Routes enforce capabilities via `can(role, permission)`:

| role   | inbox | contacts | broadcasts | automations | connections | settings | billing |
|--------|:-----:|:--------:|:----------:|:-----------:|:-----------:|:--------:|:-------:|
| owner  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| admin  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| agent  | ✓ | ✓ | ✓ | — | — | — | — |
| viewer | — | — | — | — | — | — | — |

---

## 11. API reference (internal routes)

> All `/api/whatsapp/*` routes (except `/webhook*`) require an
> authenticated session. Webhook routes are public but HMAC/secret
> protected.

### WhatsApp
| Method & path | Purpose |
|---------------|---------|
| `POST /api/whatsapp/send` | Send a text/template/media message in a conversation. |
| `POST /api/whatsapp/broadcast` | Fan-out a template to many recipients. |
| `GET/POST/DELETE /api/whatsapp/config` | Legacy single-number config (get health / save / reset). |
| `GET/POST /api/whatsapp/accounts` | List / connect accounts (multi-account, workspace-scoped). |
| `GET/PATCH/DELETE /api/whatsapp/accounts/:id` | Manage one account. |
| `GET /api/whatsapp/providers` | Provider presets for the connect UI. |
| `GET /api/whatsapp/templates` · `POST .../templates/sync` | List / sync Meta templates. |
| `GET /api/whatsapp/media/:mediaId` | Proxy media download. |
| `POST /api/whatsapp/react` | Send a reaction. |
| `GET/POST /api/whatsapp/webhook` | Meta verification (GET) + inbound (POST, HMAC-verified). |
| `POST /api/whatsapp/webhook/:provider/:accountId` | BSP inbound (normalized). |
| `POST /api/whatsapp/webhook/replay` | Re-process failed events (Bearer secret). |
| `POST /api/whatsapp/embedded-signup/complete` · `GET .../status` | Coexistence onboarding. |

### Automations / Flows / Billing / Workspaces
| Method & path | Purpose |
|---------------|---------|
| `GET/POST /api/automations` · `/:id` · `/:id/duplicate` | CRUD + duplicate. |
| `POST /api/automations/engine` | Manual engine trigger. |
| `GET /api/automations/cron` | Drain Wait-step executions (secret). |
| `GET/POST /api/flows` · `/:id` · `/templates` | CRUD + templates. |
| `GET /api/flows/cron` | Sweep stale runs (secret). |
| `GET /api/billing` | Usage + plan limits. |
| `GET/POST /api/workspaces` | List / switch workspace (cookie `wacrm_ws`). |

---

## 12. Deployment

The project targets **Hostinger Managed Node.js** (no Docker needed) but
runs on any Node ≥ 20 host (Vercel, Railway, a VPS…).

General steps:

1. Provision the host and set **all** environment variables from
   [section 3](#3-environment-variables). `ENCRYPTION_KEY` and
   `META_APP_SECRET` **must** match what you used when tokens were
   saved.
2. Apply migrations against your production Supabase project
   (`npm run db:push`).
3. Build and start:
   ```bash
   npm ci
   npm run build
   npm start
   ```
4. Set `NEXT_PUBLIC_SITE_URL` to your production URL.
5. Point the Meta webhook callback at
   `https://your-domain.com/api/whatsapp/webhook` and re-verify.
6. Schedule the [cron endpoints](#9-scheduled-jobs-cron-setup).

> For the canonical, always-current deploy docs (Supabase setup,
> WhatsApp setup, Hostinger steps, architecture, troubleshooting) see
> **[wacrm.tech/docs](https://wacrm.tech/docs)**.

---

## 13. Security model

- **Token encryption** — access/verify tokens stored AES-256-GCM
  (`ENCRYPTION_KEY`). Secrets are never returned to the client (account
  rows are sanitized to `has_credentials: boolean`).
- **RLS everywhere** — every tenant table is row-level secured; visible
  when `auth.uid() = user_id` (legacy owner) or the row's `workspace_id`
  is in the caller's memberships. Helper functions are `SECURITY
  DEFINER` to avoid policy recursion.
- **HMAC-verified webhooks** — inbound Meta POSTs are checked against
  `META_APP_SECRET` (constant-time); bad signatures get 401.
- **Rate limiting** — per-user on `send`/`broadcast`, per-`phone_number_id`
  on the webhook.
- **Plan/usage enforcement** — wired into send, broadcast, and the
  automation engine; **fails open** on internal error so metering never
  takes down core messaging.
- **Audit logging** — connection changes, credential rotation, etc.,
  written to `audit_logs` (best-effort, RLS-visible to workspace
  members).
- **Service-role key** — used only server-side (webhook + engines).
  Never expose it to client code.

> If you add network-exposed endpoints, keep them behind the existing
> auth middleware or a shared secret — don't create unauthenticated
> routes that touch tenant data.

---

## 14. Troubleshooting

| Symptom | Check |
|---------|-------|
| Webhook rejects everything (401) | `META_APP_SECRET` is set and correct; the signature is computed over the raw body. |
| Inbound messages never appear | Webhook subscribed to `messages`; `whatsapp_accounts.phone_number_id` matches the inbound `metadata.phone_number_id`; check `raw_webhook_events` for `status='failed'` + `last_error`. |
| "Token cannot be decrypted" in WhatsApp settings | `ENCRYPTION_KEY` changed or differs across environments. Click **Reset Configuration**, then re-save the token. |
| Duplicate messages | Shouldn't happen — dedupe key on message/echo ids + unique index on `messages.provider_message_id`. If it does, inspect the dedupe key derivation. |
| Business App replies not in inbox | Subscribe to `smb_message_echoes`; verify the webhook signature is valid. |
| Bot still auto-replies after a human reply | `pause_bot_on_app_reply` enabled; echo handler receiving events; check `bot_status` / `bot_paused_until` on the conversation. |
| Embedded Signup button disabled | `NEXT_PUBLIC_META_APP_ID` and `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` set. |
| Wait steps never fire | `AUTOMATION_CRON_SECRET` set and `GET /api/automations/cron` is being pinged. |
| Flows block new triggers for a contact | The flows cron isn't running — abandoned runs hold the one-active-run index. Ping `GET /api/flows/cron`. |
| Recipient not in allowed list (sandbox) | Expected for test numbers; the send path retries phone variants automatically. Add the number to Meta's allowed list for dev. |

### Incident runbook — webhook failures

1. Query `raw_webhook_events` for `status='failed'` rows and read
   `last_error`.
2. Confirm the account resolves
   (`whatsapp_accounts.phone_number_id` matches inbound
   `metadata.phone_number_id`).
3. For transient downstream failures, trigger
   `POST /api/whatsapp/webhook/replay` (with the cron secret) to
   re-process due rows. Replay is idempotent.
4. Signature failures return 401 and are logged — verify
   `META_APP_SECRET`.

---

## Related docs

- [Multi-tenant, providers & SaaS controls](./multi-tenant-and-providers.md)
- [WhatsApp Coexistence setup](./whatsapp-coexistence-setup.md)
- Project README (`../README.md`)
- Official self-host docs: <https://wacrm.tech/docs>
