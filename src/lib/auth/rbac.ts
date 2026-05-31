/**
 * Role-based access control for workspace members.
 *
 * Roles (workspace_members.role):
 *   owner  — full control incl. billing, deletion, member management.
 *   admin  — manage connections, automations, settings; no billing.
 *   agent  — work the inbox, contacts, deals; no settings/connections.
 *   viewer — read-only.
 *
 * Permissions are coarse-grained capability strings. Routes call
 * `can(role, permission)` (or `assertCan`) before mutating.
 */

import type { WorkspaceRole } from './workspace-context'

export type Permission =
  | 'workspace.manage' // rename workspace, manage members
  | 'billing.manage' // subscription / plan
  | 'connection.manage' // connect/disconnect WhatsApp accounts
  | 'automation.edit' // create/edit automations + flows
  | 'broadcast.send' // launch broadcasts
  | 'contact.write' // create/update/delete contacts
  | 'inbox.write' // send messages, assign, change status
  | 'settings.write' // templates, tags, general settings
  | 'audit.view' // view audit log
  | 'read' // read any workspace data

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  owner: [
    'workspace.manage',
    'billing.manage',
    'connection.manage',
    'automation.edit',
    'broadcast.send',
    'contact.write',
    'inbox.write',
    'settings.write',
    'audit.view',
    'read',
  ],
  admin: [
    'workspace.manage',
    'connection.manage',
    'automation.edit',
    'broadcast.send',
    'contact.write',
    'inbox.write',
    'settings.write',
    'audit.view',
    'read',
  ],
  agent: ['broadcast.send', 'contact.write', 'inbox.write', 'read'],
  viewer: ['read'],
}

export function can(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export class ForbiddenError extends Error {
  constructor(permission: Permission, role: WorkspaceRole) {
    super(`Role "${role}" lacks permission "${permission}"`)
    this.name = 'ForbiddenError'
  }
}

export function assertCan(role: WorkspaceRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(permission, role)
  }
}

export function permissionsFor(role: WorkspaceRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
