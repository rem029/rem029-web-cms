import { getClientSideURL } from '@/utilities/getURL'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Get IP from headers (works on Vercel/Node)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      (req as any).ip ||
      ''
    console.log('next/analytics', 'body', body)

    await fetch(`${getClientSideURL()}/api/analytics`, {
      body: JSON.stringify({ ...body, ip }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('next/analytics', 'error', error)
    return NextResponse.json({ error: 'Failed to log analytics' }, { status: 500 })
  }
}
