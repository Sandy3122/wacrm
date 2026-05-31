import { describe, expect, it } from 'vitest'
import { can, assertCan, ForbiddenError, permissionsFor } from './rbac'

describe('rbac.can', () => {
  it('grants owner every permission', () => {
    expect(can('owner', 'billing.manage')).toBe(true)
    expect(can('owner', 'connection.manage')).toBe(true)
    expect(can('owner', 'audit.view')).toBe(true)
  })

  it('admin can manage connections + automations but not billing', () => {
    expect(can('admin', 'connection.manage')).toBe(true)
    expect(can('admin', 'automation.edit')).toBe(true)
    expect(can('admin', 'billing.manage')).toBe(false)
  })

  it('agent can work the inbox but not edit automations or connections', () => {
    expect(can('agent', 'inbox.write')).toBe(true)
    expect(can('agent', 'broadcast.send')).toBe(true)
    expect(can('agent', 'automation.edit')).toBe(false)
    expect(can('agent', 'connection.manage')).toBe(false)
    expect(can('agent', 'settings.write')).toBe(false)
  })

  it('viewer is read-only', () => {
    expect(can('viewer', 'read')).toBe(true)
    expect(can('viewer', 'inbox.write')).toBe(false)
    expect(can('viewer', 'contact.write')).toBe(false)
  })
})

describe('rbac.assertCan', () => {
  it('throws ForbiddenError when not permitted', () => {
    expect(() => assertCan('viewer', 'connection.manage')).toThrow(ForbiddenError)
  })

  it('does not throw when permitted', () => {
    expect(() => assertCan('owner', 'connection.manage')).not.toThrow()
  })
})

describe('rbac.permissionsFor', () => {
  it('returns the full permission set for a role', () => {
    expect(permissionsFor('viewer')).toEqual(['read'])
    expect(permissionsFor('agent')).toContain('inbox.write')
  })
})
