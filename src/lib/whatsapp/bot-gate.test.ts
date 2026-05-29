import { describe, expect, it } from 'vitest'
import { shouldRunAutomation } from './bot-gate'

describe('shouldRunAutomation', () => {
  it('allows when bot is active and unassigned', () => {
    expect(
      shouldRunAutomation({ bot_status: 'active', bot_paused_until: null, assigned_agent_id: null }),
    ).toBe(true)
  })

  it('blocks when assigned to human', () => {
    expect(
      shouldRunAutomation({
        bot_status: 'active',
        assigned_agent_id: 'agent-1',
      }),
    ).toBe(false)
  })

  it('blocks when paused until future', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(
      shouldRunAutomation({
        bot_status: 'paused',
        bot_paused_until: future,
      }),
    ).toBe(false)
  })

  it('allows when pause expired', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(
      shouldRunAutomation({
        bot_status: 'paused',
        bot_paused_until: past,
      }),
    ).toBe(true)
  })
})
