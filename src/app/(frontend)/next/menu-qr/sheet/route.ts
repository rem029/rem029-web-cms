import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { buildMenuQrSheet } from '@/collections/Menus/utils/menuQr'

export const dynamic = 'force-dynamic'

const positiveInt = (value: string | null): number | null => {
  if (!value) return null
  const num = Number(value)
  return Number.isInteger(num) && num > 0 ? num : null
}

/**
 * Every table's QR code of a menu on one printable page (rem0018): `GET ?menu=<id>`, opened by
 * "Print all" on the Ordering tab. Same checks as `/next/menu-qr`.
 */
export async function GET(req: Request): Promise<Response> {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })

  const { searchParams } = new URL(req.url)
  const menuId = positiveInt(searchParams.get('menu'))

  if (!menuId) {
    return new Response('Bad request', { status: 400 })
  }

  const result = await buildMenuQrSheet(payload, user, { menuId })

  if (!result.ok) {
    return new Response(result.error, { status: result.status })
  }

  return new Response(result.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
