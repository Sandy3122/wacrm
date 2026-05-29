/**
 * Central gate for whether flows/automations should run on an inbound
 * customer message.
 */

export type BotStatus = 'active' | 'paused' | 'closed'

export interface ConversationBotState {
  bot_status?: BotStatus | string | null
  bot_paused_until?: string | null
  assigned_agent_id?: string | null
}

export interface ShouldRunAutomationOptions {
  /** When true, skip automation if a human is assigned (default true). */
  skipWhenAssigned?: boolean
}

export function isBotPauseExpired(botPausedUntil: string | null | undefined): boolean {
  if (!botPausedUntil) return true
  return new Date(botPausedUntil).getTime() <= Date.now()
}

/**
 * Returns true when flows/automations may run for this inbound message.
 */
export function shouldRunAutomation(
  conversation: ConversationBotState,
  options: ShouldRunAutomationOptions = {},
): boolean {
  const skipWhenAssigned = options.skipWhenAssigned !== false

  if (skipWhenAssigned && conversation.assigned_agent_id) {
    return false
  }

  const status = conversation.bot_status ?? 'active'
  if (status === 'closed') return false

  if (status === 'paused') {
    if (!isBotPauseExpired(conversation.bot_paused_until)) {
      return false
    }
  }

  return true
}

export function botPauseUntilFromHours(hours: number): string {
  const ms = Math.max(1, hours) * 60 * 60 * 1000
  return new Date(Date.now() + ms).toISOString()
}
