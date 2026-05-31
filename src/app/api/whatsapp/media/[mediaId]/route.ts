import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveOutbound } from '@/lib/whatsapp/outbound'
import { ProviderNotSupportedError } from '@/lib/whatsapp/providers/types'
import { getRequestWorkspace } from '@/lib/auth/request-context'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Resolve the outbound context (accounts model OR legacy config).
    // Media downloads use the same credentials as sends. In a
    // multi-account workspace, prefer the account bound to the message
    // that references this media so we use the matching WABA's token.
    const ws = await getRequestWorkspace()

    let boundAccountId: string | null = null
    const { data: ownerMsg } = await supabase
      .from('messages')
      .select('whatsapp_account_id')
      .eq('media_url', `/api/whatsapp/media/${mediaId}`)
      .not('whatsapp_account_id', 'is', null)
      .limit(1)
      .maybeSingle()
    if (ownerMsg?.whatsapp_account_id) {
      boundAccountId = ownerMsg.whatsapp_account_id
    }

    let outbound
    try {
      outbound = await resolveOutbound({
        accountId: boundAccountId,
        workspaceId: ws?.workspaceId ?? null,
        userId: user.id,
      })
    } catch {
      return NextResponse.json(
        { error: 'WhatsApp not configured' },
        { status: 400 }
      )
    }

    try {
      // Get the download URL from the provider, then stream the bytes.
      const mediaInfo = await outbound.provider.getMediaUrl(mediaId)
      const { buffer, contentType } = await outbound.provider.downloadMedia(
        mediaInfo.url,
      )

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type':
            contentType || mediaInfo.mimeType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    } catch (err) {
      if (err instanceof ProviderNotSupportedError) {
        return NextResponse.json(
          { error: 'This WhatsApp provider does not support media downloads.' },
          { status: 400 },
        )
      }
      throw err
    }
  } catch (error) {
    console.error('Error in WhatsApp media GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}
