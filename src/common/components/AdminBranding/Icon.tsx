/* eslint-disable @next/next/no-img-element */
import type { ServerProps } from 'payload'
import type { User } from '@/payload-types'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cookies, headers } from 'next/headers'
import { getAdminBranding } from '@/common/utils/tenantBranding'
import { MASCOT_URL } from './mascot'

// the step nav's home slot is 18x18 and clips overflow
export async function Icon(props: Partial<ServerProps>) {
  const payload = props.payload ?? (await getPayload({ config: configPromise }))

  let user: User | null | undefined = props.user
  if (user === undefined) {
    const authResult = await payload.auth({ headers: await headers() })
    user = authResult.user ?? null
  }

  const cookieStore = await cookies()
  const selectedCookie = cookieStore.get('payload-tenant')?.value

  const branding = await getAdminBranding(payload, user, selectedCookie)

  const mascot = <img src={MASCOT_URL} alt="" className="admin-mascot" />

  if (!branding) {
    return mascot
  }

  if (branding.logo?.url) {
    return (
      <img
        src={branding.logo.url}
        alt={branding.logo.alt}
        style={{ maxHeight: '18px', width: 'auto', objectFit: 'contain' }}
      />
    )
  }

  // the platform's own tenant shows the mascot; other businesses without a logo, their initial
  const initial = branding.tenantName.trim().charAt(0).toUpperCase()
  if (branding.isPlatform || !initial) {
    return mascot
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: branding.accent || 'var(--theme-elevation-800)',
        color: 'var(--theme-elevation-0)',
        fontWeight: 600,
        fontSize: '11px',
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {initial}
    </div>
  )
}
