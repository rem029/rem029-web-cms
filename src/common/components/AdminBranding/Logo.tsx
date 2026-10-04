/* eslint-disable @next/next/no-img-element */
import type { ServerProps } from 'payload'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { PayloadLogo } from '@payloadcms/ui/shared'
import { getAdminBranding } from '@/common/utils/tenantBranding'

export async function Logo(props: Partial<ServerProps>) {
  const payload = props.payload ?? (await getPayload({ config: configPromise }))

  // Login page: admin tenant logo (no user, no cookie)
  const branding = await getAdminBranding(payload, null, undefined)

  if (branding?.logo?.url) {
    return (
      <img
        src={branding.logo.url}
        alt={branding.logo.alt}
        style={{ maxHeight: '60px', width: 'auto', objectFit: 'contain' }}
      />
    )
  }

  return <PayloadLogo />
}
