import type { UIFieldServerProps } from 'payload'
import React from 'react'

import { extractTenantId } from '@/common/utils/tenantCollections'
import { getTenantURL } from '@/utilities/getURL'

/**
 * "Public form URL" in the form's sidebar: the saved form's address on its business's site
 * (`getTenantURL(tenant)` + `/forms/<slug>`), as a link that opens in a new tab. A server
 * component, so it shows the saved slug; a new form shows "Save the form to get its link."
 */
export const PublicFormUrl = async ({ data, req }: UIFieldServerProps) => {
  const slug = typeof data?.slug === 'string' ? data.slug : null
  const tenantId = extractTenantId(data?.tenant)
  const tenant =
    slug && tenantId !== null
      ? await req.payload
          .findByID({ collection: 'tenants', id: tenantId, depth: 0, req })
          .catch(() => null)
      : null
  const url = slug && tenant ? `${getTenantURL(tenant)}/forms/${slug}` : null

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <span className="field-label">Public form URL</span>
      {url ? (
        <a href={url} rel="noopener noreferrer" style={{ wordBreak: 'break-all' }} target="_blank">
          {url}
        </a>
      ) : (
        <p>Save the form to get its link.</p>
      )}
      {url && data?.isActive === false && <p>Turned off: visitors get a 404.</p>}
    </div>
  )
}
