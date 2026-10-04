'use client'
import { getClientSideURL } from '@/utilities/getURL'
import { RefreshRouteOnSave as PayloadLivePreview } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import React from 'react'

export const LivePreviewListener: React.FC = () => {
  const router = useRouter()
  // @payloadcms/live-preview drops messages whose origin isn't serverURL.
  // The iframe may be on a tenant host while the admin is on the server origin,
  // so serverURL must match the admin origin.
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || getClientSideURL()

  return <PayloadLivePreview refresh={router.refresh} serverURL={serverURL} />
}
