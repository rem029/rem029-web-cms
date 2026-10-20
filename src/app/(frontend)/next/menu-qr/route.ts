import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { buildMenuQr, type QrFormat } from '@/collections/Menus/utils/menuQr'

export const dynamic = 'force-dynamic'

const positiveInt = (value: string | null): number | null => {
  if (!value) return null
  const num = Number(value)
  return Number.isInteger(num) && num > 0 ? num : null
}

/**
 * A table's QR code for the menu's Ordering tab (rem0018): `GET ?menu=<id>&table=<id>&format=png|svg`
 * (`&download=1` adds `Content-Disposition: attachment`). Same-origin admin request, so the
 * session cookie signs the user in; `buildMenuQr` checks access as that user.
 */
export async function GET(req: Request): Promise<Response> {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })

  const { searchParams } = new URL(req.url)
  const menuId = positiveInt(searchParams.get('menu'))
  const tableId = positiveInt(searchParams.get('table'))

  if (!menuId || !tableId) {
    return new Response('Bad request', { status: 400 })
  }

  const rawFormat = searchParams.get('format')
  const format: QrFormat = rawFormat === 'svg' ? 'svg' : 'png'
  const isDownload = searchParams.get('download') === '1'

  const result = await buildMenuQr(payload, user, { menuId, tableId, format })

  if (!result.ok) {
    return new Response(result.error, { status: result.status })
  }

  const headers = new Headers({
    'Content-Type': result.contentType,
    'Cache-Control': 'private, no-store',
  })

  if (isDownload) {
    headers.set('Content-Disposition', `attachment; filename="${result.filename}"`)
  }

  const bodyInit: BodyInit =
    typeof result.body === 'string' ? result.body : new Uint8Array(result.body)

  return new Response(bodyInit, { headers })
}
