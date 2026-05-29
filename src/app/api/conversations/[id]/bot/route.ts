import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { botPauseUntilFromHours } from '@/lib/whatsapp/bot-gate'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/conversations/[id]/bot
 * Body: { action: 'pause' | 'resume', hours?: number }
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const action = body.action as 'pause' | 'resume'
    const hours = typeof body.hours === 'number' ? body.hours : 24

    if (action !== 'pause' && action !== 'resume') {
      return NextResponse.json({ error: 'action must be pause or resume' }, { status: 400 })
    }

    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const update =
      action === 'resume'
        ? {
            bot_status: 'active',
            bot_paused_until: null,
            updated_at: new Date().toISOString(),
          }
        : {
            bot_status: 'paused',
            bot_paused_until: botPauseUntilFromHours(hours),
            updated_at: new Date().toISOString(),
          }

    const { error: updateError } = await supabase
      .from('conversations')
      .update(update)
      .eq('id', conversationId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update bot status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, ...update })
  } catch (error) {
    console.error('[conversations/bot]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
