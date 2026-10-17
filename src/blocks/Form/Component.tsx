import type { TypedLocale } from 'payload'
import React from 'react'

import type { FormBlock as FormBlockProps } from '@/payload-types'

/**
 * The Form block on a page: the optional intro, then the form through `PublicForm`. Renders
 * nothing when the form isn't the host tenant's active form (`isFormForTenant`), never a form
 * that would only refuse.
 */
export const FormBlock = async (_props: FormBlockProps & { locale?: TypedLocale }) => {
  // 1. tenantId = await getFrontendTenantId(); !isFormForTenant(form, tenantId) → log debug, null
  // 2. locale: the prop, else the LOCALE_STORAGE_KEY cookie ('ar' | 'en')
  // 3. draft = await isPreviewing()
  // 4. <div className={css('form')}> {enableIntro && introContent && <RichText />}
  //    <PublicForm form locale saveDraft={!draft} /></div>
  return <div />
}
