import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import React from 'react'

import { isFormForTenant } from '@/common/utils/frontendForm'
import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { isPreviewing } from '@/common/utils/isPreviewing'
import { FormRenderer } from '@/components/FormRenderer'
import { submitFormAction, uploadFileAction } from '@/components/FormRenderer/actions'
import RichText from '@/components/RichText'
import type { FormBlock as FormBlockProps } from '@/payload-types'
import { LOCALE_STORAGE_KEY } from '@/utilities/constant'
import { css } from '@/utilities/constants'

/**
 * The Form block on a page: the optional intro, then `FormRenderer` with the server actions
 * (analytics are recorded by the submit action). Renders nothing when the form isn't the host
 * tenant's active form (`isFormForTenant`), never a form that would only refuse.
 */
export const FormBlock = async ({ form, enableIntro, introContent }: FormBlockProps) => {
  const tenantId = await getFrontendTenantId()
  const formId = typeof form === 'object' ? form?.id : form
  if (!isFormForTenant(form, tenantId)) {
    const payload = await getPayload({ config: configPromise })
    payload.logger.debug({
      msg: 'form block not shown',
      formId,
      tenantId,
    })
    return null
  }

  const locale = (await cookies()).get(LOCALE_STORAGE_KEY)?.value === 'ar' ? 'ar' : 'en'
  const draft = await isPreviewing()

  return (
    <div className={css('form')}>
      {enableIntro && introContent && (
        <RichText className="mb-8 lg:mb-12" data={introContent} enableGutter={false} />
      )}
      <FormRenderer
        form={form}
        locale={locale}
        saveDraft={!draft}
        submit={submitFormAction}
        upload={uploadFileAction}
      />
    </div>
  )
}
