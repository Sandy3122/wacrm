import { describe, it, expect } from 'vitest'
import { isAutomationAllowedAt } from '@/lib/whatsapp/business-hours'

// Fixed reference dates (local server time, matching getDay/getHours).
//  - Wed 2026-06-24 10:00 → weekday, inside window
//  - Wed 2026-06-24 20:00 → weekday, after window
//  - Wed 2026-06-24 07:00 → weekday, before window
//  - Sat 2026-06-27 10:00 → weekend
const weekdayInside = new Date(2026, 5, 24, 10, 0, 0)
const weekdayEvening = new Date(2026, 5, 24, 20, 0, 0)
const weekdayEarly = new Date(2026, 5, 24, 7, 0, 0)
const weekend = new Date(2026, 5, 27, 10, 0, 0)

describe('isAutomationAllowedAt', () => {
  it('allows any time when automation_outside_hours is true', () => {
    expect(isAutomationAllowedAt(true, weekdayEvening)).toBe(true)
    expect(isAutomationAllowedAt(true, weekend)).toBe(true)
    expect(isAutomationAllowedAt(true, weekdayEarly)).toBe(true)
  })

  it('allows weekday business hours when restricted', () => {
    expect(isAutomationAllowedAt(false, weekdayInside)).toBe(true)
  })

  it('blocks weekday outside 09:00–18:00 when restricted', () => {
    expect(isAutomationAllowedAt(false, weekdayEvening)).toBe(false)
    expect(isAutomationAllowedAt(false, weekdayEarly)).toBe(false)
  })

  it('blocks weekends when restricted', () => {
    expect(isAutomationAllowedAt(false, weekend)).toBe(false)
  })

  it('treats 18:00 as outside and 09:00 as inside (boundary)', () => {
    expect(isAutomationAllowedAt(false, new Date(2026, 5, 24, 18, 0, 0))).toBe(false)
    expect(isAutomationAllowedAt(false, new Date(2026, 5, 24, 9, 0, 0))).toBe(true)
  })
})
