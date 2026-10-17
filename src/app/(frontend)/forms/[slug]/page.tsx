import type { Metadata } from 'next'
import React from 'react'

/**
 * A form on its own page: `/forms/<slug>` on the tenant's host (the slug is reserved for pages).
 * 404 for an unknown host, another tenant's form and an inactive form (`findFrontendForm`); a
 * form outside its dates or members-only without a member session shows that message instead
 * of the fields. Renders per request (tenant content); live preview under `isPreviewing()`.
 */
type Args = {
  params: Promise<{ slug: string }>
}

export default async function FormPage(_args: Args) {
  // 1. tenantId = await getFrontendTenantId(); none → notFound()
  // 2. locale from the LOCALE_STORAGE_KEY cookie (as [...slug]/page.tsx); 'ar' | 'en'
  // 3. form = await findFrontendForm(payload, tenantId, slug, locale); none → notFound()
  // 4. user = (await payload.auth({ headers: await headers() })).user, if from `users`
  // 5. reason = formRefusal(form, user, new Date()): 'inactive' can't happen here (404)
  //    reason → <div className={css('page')}> header image + title + <p role="status">
  //    refusalMessage(reason, formText(locale))</p>
  // 6. else: draft = await isPreviewing(); {draft && <LivePreviewListener />}
  //    <PublicForm form locale saveDraft={!draft} /> inside the page container
  return <div />
}

export async function generateMetadata(_args: Args): Promise<Metadata> {
  // 1. form as above (null → {}); generateMeta({ doc: { meta: { title: form.title } } }):
  //    "<form title> | <site name>", canonical and og from the tenant's url
  return {}
}
