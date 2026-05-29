# WhatsApp Coexistence Setup

Coexistence lets a business keep using the **WhatsApp Business App** on their phone while WACRM sends automation via the **Cloud API** on the same number.

## Prerequisites

- WhatsApp **Business App** (not personal WhatsApp Messenger) version **2.24.17+**
- Do **not** delete the Business App or manually migrate the number
- WACRM webhook URL reachable over HTTPS: `{NEXT_PUBLIC_SITE_URL}/api/whatsapp/webhook`
- `ENCRYPTION_KEY`, `META_APP_SECRET`, Supabase service role configured

---

## Path A — First-party Embedded Signup (Meta Partner)

### 1. Become eligible

1. Apply for [Meta Business Partner](https://developers.facebook.com/docs/partners) status as a **Solution Partner** or **Tech Provider**.
2. Create a Meta app (type **Business**) and add the **WhatsApp** product.
3. Complete Embedded Signup configuration in **WhatsApp → Embedded Signup** (use **v4** before Oct 2026).
4. Enable **session logging** in Embedded Signup settings.

### 2. Configure WACRM environment

```bash
NEXT_PUBLIC_META_APP_ID=your_app_id
NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID=your_configuration_id
META_APP_SECRET=your_app_secret
ENCRYPTION_KEY=64_char_hex
```

### 3. Enable coexistence in Embedded Signup

In your Embedded Signup launch code (WACRM settings UI does this automatically):

```json
{
  "config_id": "<CONFIGURATION_ID>",
  "response_type": "code",
  "override_default_response_type": true,
  "extras": {
    "featureType": "whatsapp_business_app_onboarding",
    "sessionInfoVersion": "3"
  }
}
```

Customers must choose **Connect WhatsApp Business App**, not standard Cloud API migration.

### 4. Subscribe webhook fields

In **Meta App Dashboard → WhatsApp → Configuration → Webhooks**, subscribe:

| Field | Purpose |
|-------|---------|
| `messages` | Inbound customer messages |
| `message_echoes` | Outbound echoes (some setups) |
| `smb_message_echoes` | **Required** — replies sent from Business App |
| `smb_app_state_sync` | Contact sync from Business App |
| `history` | Recommended — backfill chat history (complete within 24h of onboarding) |

Callback URL: `https://your-domain.com/api/whatsapp/webhook`  
Verify token: same string saved in WACRM WhatsApp settings.

### 5. Connect in WACRM

1. **Settings → WhatsApp Config**
2. Select **Coexistence — WhatsApp Business App + API**
3. Click **Connect WhatsApp Business App Number**
4. Complete Meta login; keep the Business App open during sync
5. Confirm badges: connection type, webhook status, app sync

### 6. Post-onboarding

- History sync must finish within **24 hours** or the customer may need to re-onboard.
- Verify coexistence: `GET /{phone_number_id}?fields=is_on_biz_app,platform_type` should show the number on the Business App.

---

## Path B — BSP / Tech Provider (no Partner status yet)

If you are not a Meta Solution Partner:

1. Choose a BSP that supports **Coexistence** (e.g. 360dialog, Twilio, MessageBird).
2. Complete the BSP’s coexistence / Embedded Signup flow for your customer’s number.
3. Obtain from the BSP:
   - `phone_number_id`
   - `waba_id`
   - `display_phone_number`
   - Permanent access token
   - Webhook verify token (or use WACRM-generated token if the BSP allows custom verify tokens)
4. In WACRM: **Coexistence** mode → **Import credentials after BSP onboarding** (manual fields).
5. Point the BSP/Meta webhook to WACRM’s callback URL (or forward BSP webhooks to WACRM).

Runtime behavior (sending, echoes, bot pause) is identical once credentials are stored with `connection_type = coexistence`.

---

## Coexistence behavior in WACRM

| Event | Behavior |
|-------|----------|
| Customer inbound message | Saved; flows/automations run if bot **active** and not assigned to human |
| API/bot reply | Sent via Graph API; stored with source **API** |
| Reply from Business App | `smb_message_echoes` webhook; stored as **WhatsApp Business App**; bot paused (default 24h) |
| CRM agent reply | Source **API**; active flows paused |

Settings (Coexistence section):

- Pause bot when human replies from app
- Pause duration (hours)
- Allow automation outside business hours (Phase 2)
- Default fallback message

---

## Testing checklist

1. Connect an existing WhatsApp Business App number (Embedded Signup or BSP import).
2. Send a customer message → appears in WACRM inbox (source: Customer).
3. Confirm automation replies via API (source: API).
4. Reply manually from WhatsApp Business App.
5. Confirm manual reply appears in WACRM (source: WhatsApp Business App).
6. Confirm bot is **paused** after manual reply.
7. Send another customer message → saved, **no** auto-reply while paused.
8. Click **Resume bot** in inbox → automation works again.
9. Duplicate webhook delivery does not duplicate messages (`message_id` unique).
10. Legacy manual config users remain on `connection_type: legacy` unchanged.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Business App replies not in inbox | `smb_message_echoes` subscribed; webhook signature valid |
| Bot still auto-replies after human reply | `pause_bot_on_app_reply` enabled; echo handler receiving events |
| Embedded Signup button disabled | `NEXT_PUBLIC_META_APP_ID` and `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` set |
| Token decrypt errors | `ENCRYPTION_KEY` consistent across environments |

See [Meta: Onboard Business app users](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/).
