# Supabase database setup (WACRM)

## Migration workflow (after you change `supabase/migrations/`)

Whenever you add or edit a migration file, apply it to your remote project:

```bash
# 1. Check what is pending (local file vs remote applied)
npm run db:migration:status

# 2. Apply pending migrations
npm run db:migrate
```

Create a new migration file (do not invent filenames manually):

```bash
npm run db:migration:new -- add_my_feature
# → creates supabase/migrations/<timestamp>_add_my_feature.sql
```

Edit that SQL file, then run `npm run db:migrate` again.

**One-time setup:** ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_DB_PASSWORD` (see below). You do **not** need `supabase link` if you use these scripts.

---

## Troubleshooting `npm run db:push`

Use this guide when `npm run db:push` fails with:

```text
Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD
```

## 1. Use one Supabase project everywhere

Your **`.env.local` URL**, **API keys**, and **database password** must all be for the same project (e.g. `brqsrkqtnqmbqiybgqdz`).

```bash
NEXT_PUBLIC_SUPABASE_URL=https://brqsrkqtnqmbqiybgqdz.supabase.co
```

`npm run db:setup` pushes migrations using the project ref from that URL. It does **not** require `supabase link` to match — useful if the CLI is logged into a different Supabase account.

All migration commands (`db:migrate`, `db:migration:status`, `db:setup`, `db:push`) use the same direct database URL from `.env.local`.

Optional: link the CLI to the same project (only if your login has access):

```bash
npx supabase login
npx supabase link --project-ref brqsrkqtnqmbqiybgqdz
```

If link fails with *"does not have the necessary privileges"*, you are logged into the wrong Supabase account. Either log into the account that owns the project, or skip linking and use `npm run db:setup` (direct database URL).

## 2. Set required env vars in `.env.local`

From **Supabase Dashboard → Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

From **Project Settings → Database → Database password**:

```bash
SUPABASE_DB_PASSWORD=<your-database-password>
```

If you forgot the password, click **Reset database password** in the dashboard, then update `.env.local`.

## 3. Log in and push migrations

```bash
npx supabase login          # once per machine (optional if using db:migrate)
npm run db:migrate          # validates env + applies pending migrations
```

Or check status only:

```bash
npm run db:migration:status
```

Verify after migrate — every file in `supabase/migrations/` should show as applied on remote.

## 4. If connection still times out

In **Supabase Dashboard → Project Settings → Database**:

1. Confirm the project is **not paused** (free tier inactivity).
2. Under **Network restrictions**, allow your IP or disable restrictions temporarily.
3. Retry `npm run db:migrate`.

### `no route to host` / IPv6 errors

Direct host `db.<project-ref>.supabase.co` may resolve to **IPv6 only**. If your network has no working IPv6 route, use the **Session pooler** (IPv4) instead:

1. Dashboard → **Project Settings → Database → Connection string**
2. Choose **Session pooler** and copy the URI, **or** note the region (e.g. `ap-south-1`)
3. Add to `.env.local` either:

```bash
SUPABASE_DB_REGION=ap-south-1
```

or the full URI:

```bash
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

(URL-encode special characters in the password.)

### Supabase CLI not found

The CLI is a project dev dependency — use `npx`, not a global install:

```bash
npx supabase login
npx supabase migration list --help
```

Migration scripts already call `npx supabase` via `npm run db:migrate`.

## 5. Fresh project checklist

After migrations apply:

1. `npm run dev`
2. Open `http://localhost:3000/signup` and create a user
3. Migration `027_provision_workspace_on_signup.sql` creates default org/workspace on signup
4. Configure WhatsApp under **Settings → WhatsApp**

## Troubleshooting

| Error | Fix |
|-------|-----|
| `SUPABASE_DB_PASSWORD` missing | Add to `.env.local` (see step 2) |
| CLI project ≠ `.env.local` URL | Align link or env (see step 1) |
| `uuid_generate_v4() does not exist` | Use `extensions.uuid_generate_v4()` in new migrations (fixed in `014_whatsapp_coexistence.sql`) |
| Auth/login fails in app | Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not only publishable key) |
| `no route to host` on migrate | Set `SUPABASE_DB_REGION` or `SUPABASE_DB_URL` (session pooler) — see step 4 |
| `supabase: command not found` | Use `npx supabase` (CLI is installed in the project) |
