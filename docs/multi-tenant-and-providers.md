# Multi-Tenant, Provider Abstraction & SaaS Controls

This document describes the architecture introduced by the 8-sprint
backlog: organizations/workspaces, account-per-workspace WhatsApp
connections, a provider abstraction layer, a durable webhook pipeline,
plan/usage enforcement, RBAC, and audit logging.

It is backward-compatible: existing single-user installs keep working.
Legacy `user_id`-scoped rows are backfilled into a default org +
workspace, and legacy `whatsapp_config` rows are migrated into
`whatsapp_accounts`. Both legacy paths still resolve as a fallback.

## Migrations (run in order)

```
015_organizations_workspaces.sql       organizations, workspaces, members, RLS helpers
016_workspace_scope_columns.sql         organization_id + workspace_id on tenant tables
017_backfill_default_workspace.sql      default org/workspace per existing user + backfill
018_whatsapp_accounts.sql               account-per-workspace (provider/connection types)
019_whatsapp_conversations_messages.sql conversations/messages → whatsapp_account_id
020_migrate_from_legacy_whatsapp_config.sql copy whatsapp_config → whatsapp_accounts
021_raw_webhook_events.sql              durable, deduped, replayable webhook store
022_billing_subscriptions.sql           per-org subscription
023_usage_logs.sql                      usage counters + record_usage()
024_plan_limits.sql                     plan matrix
025_audit_logs.sql                      security audit trail
026_auto_scope_trigger.sql              auto-fill workspace_id on client-side inserts
```

Apply with `npm run db:push` (or `supabase db push`).

## Tenant model

- **organization** — billing entity, owned by a user.
- **workspace** — a unit of CRM data (contacts, conversations, deals…).
  Every org gets one default workspace.
- **organization_members / workspace_members** — membership + role.

RLS helper functions (`user_workspace_ids()`, `user_organization_ids()`,
`user_workspace_role()`) are `SECURITY DEFINER` to avoid policy
recursion. Tenant tables are visible when `auth.uid() = user_id` (legacy
owner) **or** the row's `workspace_id` is in the caller's memberships.

Server code resolves the active workspace via
`src/lib/auth/workspace-context.ts` (cookie `wacrm_ws` selects it when a
user belongs to several). Route handlers use
`getRequestWorkspace()` from `src/lib/auth/request-context.ts`.

## RBAC

`src/lib/auth/rbac.ts` maps roles → capability permissions:

| role   | inbox | contacts | broadcasts | automations | connections | settings | billing |
|--------|-------|----------|------------|-------------|-------------|----------|---------|
| owner  | ✓     | ✓        | ✓          | ✓           | ✓           | ✓        | ✓       |
| admin  | ✓     | ✓        | ✓          | ✓           | ✓           | ✓        | —       |
| agent  | ✓     | ✓        | ✓          | —           | —           | —        | —       |
| viewer | —     | —        | —          | —           | —           | —        | —       |

Routes call `can(role, permission)` / `assertCan(...)`.

## WhatsApp accounts + provider abstraction

`whatsapp_accounts` holds one row per connected number/channel, scoped
to a workspace, with:

- `connection_type`: `legacy_cloud_api` | `coexistence` | `bsp_adapter`
- `provider_type`: `meta` | `360dialog` | `twilio` | `messagebird` | `gupshup` | `custom`

`src/lib/whatsapp/providers/` implements the `WhatsAppProvider`
interface (`types.ts`) with:

- `meta-cloud.provider.ts` — Meta Cloud API (legacy + coexistence).
- `bsp-adapter.provider.ts` — Cloud-API-compatible BSPs (360dialog,
  Gupshup, MessageBird…), configurable base URL + auth header.
- `custom.provider.ts` — forwards to a user webhook.

`factory.ts` builds the right provider from an account row.
**No business code calls Graph directly** — everything goes through a
provider. `src/lib/whatsapp/send-service.ts` is the shared send path
(account resolve → provider → phone-variant retry → persist).

Connect/manage accounts via `POST/GET /api/whatsapp/accounts` and
`GET/PATCH/DELETE /api/whatsapp/accounts/:id`. Provider form presets are
served from `GET /api/whatsapp/providers`.

## Durable webhook pipeline

`ingest → normalize → dispatch`:

1. **Ingest** — every change is written to `raw_webhook_events` first,
   with a dedupe key derived from message/echo ids. Duplicate provider
   deliveries are skipped (`isNew=false`).
2. **Normalize** — BSP payloads are mapped into the Meta envelope by
   `providers/webhook-normalize.ts`.
3. **Dispatch** — the existing `processWebhook` handles contacts,
   conversations, messages, echoes, history, and automation/flow
   dispatch. Per-change failures are marked `failed` and become
   replayable.

Ingress:

- `POST /api/whatsapp/webhook` — Meta (HMAC verified).
- `POST /api/whatsapp/webhook/:provider/:accountId` — BSPs.
- `POST /api/whatsapp/webhook/replay` — drains failed events
  (protected by `AUTOMATION_CRON_SECRET`).

## Plan, usage & limits

- `plan_limits` — per-plan ceilings (-1 = unlimited).
- `billing_subscriptions` — per-org plan/status.
- `usage_logs` — append-only metered events.

`src/lib/billing/usage.ts` enforces limits (`checkUsageLimit`,
`checkResourceLimit`) and records usage (`recordUsage`). Enforcement
**fails open** on any internal error so metering never takes down core
messaging. Wired into `/api/whatsapp/send`, `/api/whatsapp/broadcast`,
and the automation engine. `GET /api/billing` powers the usage panel.

## Audit logging

`src/lib/audit/log.ts` writes to `audit_logs` for connection changes,
credential rotation, and (extensible) role/billing changes. Best-effort;
visible to workspace members via RLS.

## Coexistence / human takeover

`shouldRunAutomation` (`bot-gate.ts`) is the single gate: it blocks
automations when the bot is paused/closed, a human is assigned, or a
Business App echo recently arrived (24h default pause). Echoes are
processed by `webhook-echo.ts` which also pauses active flow runs.

## Incident runbook — webhook failures

1. Check `raw_webhook_events` for `status='failed'` rows and
   `last_error`.
2. Confirm the account resolves (`whatsapp_accounts.phone_number_id`
   matches the inbound `metadata.phone_number_id`).
3. For transient downstream failures, trigger
   `POST /api/whatsapp/webhook/replay` (with the cron secret) to
   re-process due rows. Replay is idempotent — the dedupe index on
   `messages.provider_message_id` prevents duplicate inserts.
4. Signature failures return 401 and are logged; verify
   `META_APP_SECRET`.
```
