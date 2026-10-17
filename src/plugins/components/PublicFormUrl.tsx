import type { UIFieldServerProps } from 'payload'
import React from 'react'

/**
 * "Public form URL" in the form's sidebar: the saved form's address on its business's site
 * (`getTenantURL(tenant)` + `/forms/<slug>`), as a link that opens in a new tab. A server
 * component, so it shows the saved slug; a new form shows "Save the form to get its link."
 */
export const PublicFormUrl = async (_props: UIFieldServerProps) => {
  // 1. data.slug and data.tenant from the saved doc; either missing → the "save first" note
  // 2. tenant = payload.findByID tenants (depth 0, req); none → the note
  // 3. url = `${getTenantURL(tenant)}/forms/${slug}`
  // 4. <div className="field-type"> label "Public form URL", <a href target="_blank"
  //    rel="noopener noreferrer">{url}</a>, and "Turned off: visitors get a 404." when
  //    isActive is false
  return <div />
}
