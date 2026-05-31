import { createClient } from '@supabase/supabase-js'
import { phonesMatch } from '@/lib/whatsapp/phone-utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null

function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContactRow = Record<string, any>

export interface ContactOutcome {
  contact: ContactRow
  wasCreated: boolean
}

export interface ContactScope {
  workspaceId?: string | null
  organizationId?: string | null
}

export async function findOrCreateContact(
  userId: string,
  phone: string,
  name: string,
  scope: ContactScope = {},
): Promise<ContactOutcome | null> {
  const { data: contacts, error: contactsError } = await supabaseAdmin()
    .from('contacts')
    .select('*')
    .eq('user_id', userId)

  if (contactsError) {
    console.error('Error fetching contacts:', contactsError)
    return null
  }

  const existingContact = contacts?.find((c: ContactRow) => phonesMatch(c.phone, phone))

  if (existingContact) {
    if (name && name !== existingContact.name) {
      await supabaseAdmin()
        .from('contacts')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', existingContact.id)
    }
    return { contact: existingContact, wasCreated: false }
  }

  const { data: newContact, error: createError } = await supabaseAdmin()
    .from('contacts')
    .insert({
      user_id: userId,
      phone,
      name: name || phone,
      workspace_id: scope.workspaceId ?? null,
      organization_id: scope.organizationId ?? null,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating contact:', createError)
    return null
  }

  return { contact: newContact, wasCreated: true }
}

export interface ConversationRow {
  id: string
  user_id: string
  contact_id: string
  unread_count?: number
  bot_status?: string
  bot_paused_until?: string | null
  assigned_agent_id?: string | null
  whatsapp_account_id?: string | null
  workspace_id?: string | null
  organization_id?: string | null
  customer_wa_id?: string | null
}

export interface ConversationScope {
  workspaceId?: string | null
  organizationId?: string | null
  whatsappAccountId?: string | null
  customerWaId?: string | null
}

export async function findOrCreateConversation(
  userId: string,
  contactId: string,
  scope: ConversationScope = {},
): Promise<ConversationRow | null> {
  const { data: existing, error: findError } = await supabaseAdmin()
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .single()

  if (!findError && existing) {
    // Backfill scope columns on a pre-existing conversation if the
    // webhook now knows the account/workspace and the row predates it.
    if (
      scope.whatsappAccountId &&
      !existing.whatsapp_account_id
    ) {
      await supabaseAdmin()
        .from('conversations')
        .update({
          whatsapp_account_id: scope.whatsappAccountId,
          workspace_id: scope.workspaceId ?? existing.workspace_id ?? null,
          organization_id: scope.organizationId ?? existing.organization_id ?? null,
          customer_wa_id: scope.customerWaId ?? existing.customer_wa_id ?? null,
        })
        .eq('id', existing.id)
    }
    return existing
  }

  const { data: newConv, error: createError } = await supabaseAdmin()
    .from('conversations')
    .insert({
      user_id: userId,
      contact_id: contactId,
      workspace_id: scope.workspaceId ?? null,
      organization_id: scope.organizationId ?? null,
      whatsapp_account_id: scope.whatsappAccountId ?? null,
      customer_wa_id: scope.customerWaId ?? null,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating conversation:', createError)
    return null
  }

  return newConv
}

/**
 * If bot was paused but the pause window expired, restore active status.
 */
export async function resumeBotIfPauseExpired(conversationId: string): Promise<void> {
  const { data: conv } = await supabaseAdmin()
    .from('conversations')
    .select('bot_status, bot_paused_until')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conv || conv.bot_status !== 'paused') return
  if (!conv.bot_paused_until) return

  if (new Date(conv.bot_paused_until).getTime() <= Date.now()) {
    await supabaseAdmin()
      .from('conversations')
      .update({
        bot_status: 'active',
        bot_paused_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
  }
}
