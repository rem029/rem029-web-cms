import configPromise from '@payload-config'
import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import { formRefusal } from '@/common/utils/formAvailability'
import { findFrontendForm } from '@/common/utils/frontendForm'
import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { isPreviewing } from '@/common/utils/isPreviewing'
import { FormRenderer } from '@/components/FormRenderer'
import { submitFormAction, uploadFileAction } from '@/components/FormRenderer/actions'
import { formText, refusalMessage } from '@/components/FormRenderer/i18n'
import type { RendererLocale } from '@/components/FormRenderer/types'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { LOCALE_STORAGE_KEY } from '@/utilities/constant'
import { css } from '@/utilities/constants'
import { generateMeta } from '@/utilities/generateMeta'

/**
 * A form on its own page: `/forms/<slug>` on the tenant's host (the slug is reserved for pages).
 * 404 for an unknown host, another tenant's form and an inactive form (`findFrontendForm`); a
 * form outside its dates or members-only without a member session shows that message instead
 * of the fields. Renders per request (tenant content); live preview under `isPreviewing()`.
 */
type Args = {
  params: Promise<{ slug: string }>
}

const visitorLocale = async (): Promise<RendererLocale> =>
  (await cookies()).get(LOCALE_STORAGE_KEY)?.value === 'ar' ? 'ar' : 'en'

// react's cache compares arguments by identity: primitives, so the page and its metadata share it
const queryForm = cache(async (slug: string, locale: RendererLocale) => {
  const tenantId = await getFrontendTenantId()
  const draft = await isPreviewing()
  const payload = await getPayload({ config: configPromise })
  return findFrontendForm(payload, tenantId, slug, { draft, locale })
})

export default async function FormPage({ params }: Args) {
  const { slug } = await params
  // unknown or inactive host
  if (!(await getFrontendTenantId())) notFound()

  const locale = await visitorLocale()
  const form = await queryForm(slug, locale)
  if (!form) notFound()

  const draft = await isPreviewing()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  const reason = formRefusal(form, user?.collection === 'users' ? user : null, new Date())

  return (
    <div className={css('page')}>
      <div className={css('page__container')}>
        {draft && <LivePreviewListener />}
        {reason ? (
          <section
            className="mx-auto max-w-xl py-16 text-center"
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            <h1 className="text-2xl font-semibold">{form.title}</h1>
            <p className="mt-4 text-muted-foreground" role="status">
              {refusalMessage(reason, formText(locale))}
            </p>
          </section>
        ) : (
          <FormRenderer
            form={form}
            locale={locale}
            saveDraft={!draft}
            submit={submitFormAction}
            upload={uploadFileAction}
          />
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const form = await queryForm(slug, await visitorLocale())
  if (!form) return {}
  return generateMeta({ doc: { meta: { title: form.title } } })
}
