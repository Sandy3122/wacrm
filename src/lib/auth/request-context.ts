import { cookies } from 'next/headers'
import {
  ACTIVE_WORKSPACE_COOKIE,
  getWorkspaceContext,
  type WorkspaceContext,
} from './workspace-context'

/**
 * Resolve the active workspace context for a Next.js route handler,
 * reading the active-workspace cookie set by the workspace switcher.
 *
 * Returns null when unauthenticated — callers should respond 401.
 */
export async function getRequestWorkspace(): Promise<WorkspaceContext | null> {
  const cookieStore = await cookies()
  const requested = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null
  return getWorkspaceContext(requested)
}
