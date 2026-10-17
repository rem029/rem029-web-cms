/**
 * Field showcase (rem0005): docs in the `admin` tenant with every field filled, to check the
 * admin theme on every field type in light and dark.
 *
 * - `Every field`: published, all tabs filled (the localized text in en and ar), images only if
 *   the tenant already has media
 * - `Draft example`: a draft, for the draft/published pills and the versions list
 * - `Child one`, `Child two`: `parent` = `Every field`, so its Children (join) list has rows
 *
 *   pnpm seed
 *
 * Idempotent: looks docs up by title + tenant and skips the ones that exist.
 */
import type { Payload, RequiredDataFromCollectionSlug } from 'payload'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { richText } from './multiTenancy'

type ShowcaseData = RequiredDataFromCollectionSlug<'field-showcase'>

const ROOT_TITLE = 'Every field'

const findTenantId = async (payload: Payload): Promise<number | null> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEFAULT_TENANT_SLUG } },
    limit: 1,
    depth: 0,
  })
  return docs[0]?.id ?? null
}

const findMediaIds = async (payload: Payload, tenantId: number): Promise<number[]> => {
  const { docs } = await payload.find({
    collection: 'media',
    where: { tenant: { equals: tenantId } },
    limit: 3,
    depth: 0,
  })
  return docs.map((doc) => doc.id)
}

const findByTitle = async (
  payload: Payload,
  tenantId: number,
  title: string,
): Promise<number | null> => {
  const { docs } = await payload.find({
    collection: 'field-showcase',
    where: { and: [{ title: { equals: title } }, { tenant: { equals: tenantId } }] },
    limit: 1,
    depth: 0,
    draft: true,
  })
  return docs[0]?.id ?? null
}

const everyField = (tenantId: number, mediaIds: number[]): ShowcaseData => ({
  tenant: tenantId,
  _status: 'published',
  title: ROOT_TITLE,
  text: 'Hello from the showcase',
  textMany: ['alpha', 'beta', 'gamma'],
  textLocalized: 'Hello',
  textarea: 'A longer text\nthat spans a few lines.',
  email: 'owner@example.com',
  number: 42,
  numberMany: [1, 2, 3],
  code: "const greeting: string = 'hello'\nconsole.info(greeting)\n",
  json: { name: 'showcase', tags: ['a', 'b'], nested: { ok: true } },
  checkbox: true,
  showMore: true,
  conditional: 'Shown because the box above is ticked',
  selectSingle: 'medium',
  selectMany: ['red', 'blue'],
  selectLong: 'mango',
  radio: 'afternoon',
  radioHorizontal: 'yes',
  dateTime: '2026-10-17T09:30:00.000Z',
  dateDay: '2026-10-17T00:00:00.000Z',
  dateMonth: '2026-10-01T00:00:00.000Z',
  dateTimeOnly: '2026-10-17T14:45:00.000Z',
  image: mediaIds[0] ?? null,
  gallery: mediaIds,
  richText: richText(
    'Rich text',
    'Paragraphs, headings and lists use the editor toolbar.',
    'A second paragraph.',
  ),
  layout: [
    { blockType: 'showcaseCallout', tone: 'info', text: 'An info callout block.' },
    { blockType: 'showcaseCallout', tone: 'danger', text: 'A danger callout block.' },
    { blockType: 'showcaseQuote', quote: 'Simple things should be simple.', author: 'Alan Kay' },
  ],
  items: [
    { label: 'First row', done: true },
    { label: 'Second row', done: false },
  ],
  meta: { note: 'Inside a group', level: 'high', links: [{ url: 'https://example.com' }] },
  firstName: 'Sam',
  lastName: 'Rivera',
  openNote: 'Inside an open collapsible.',
  closedNote: 'Inside a closed collapsible.',
  stage: 'review',
  featured: true,
  reviewedAt: '2026-10-16T12:00:00.000Z',
  priority: 3,
  visibility: 'team',
  labels: ['apple', 'kiwi'],
  owner: 'Sam Rivera',
  summary: 'A few lines about this document,\nkept in the sidebar.',
  remindAt: '2026-10-20T09:30:00.000Z',
})

const createOnce = async (
  payload: Payload,
  tenantId: number,
  data: ShowcaseData,
  options?: { draft?: boolean },
): Promise<number> => {
  const existing = await findByTitle(payload, tenantId, data.title)
  if (existing !== null) {
    payload.logger.info({
      msg: 'seed fieldShowcase: skipped (exists)',
      title: data.title,
      tenantId,
    })
    return existing
  }
  const doc = await payload.create({
    collection: 'field-showcase',
    data,
    draft: options?.draft,
  })
  payload.logger.info({ msg: 'seed fieldShowcase: created', title: data.title, id: doc.id })
  return doc.id
}

export const seedFieldShowcase = async (payload: Payload): Promise<void> => {
  const tenantId = await findTenantId(payload)
  if (tenantId === null) {
    payload.logger.warn({ msg: 'seed fieldShowcase: no admin tenant, skipped' })
    return
  }
  const mediaIds = await findMediaIds(payload, tenantId)

  const rootExisted = (await findByTitle(payload, tenantId, ROOT_TITLE)) !== null
  const rootId = await createOnce(payload, tenantId, everyField(tenantId, mediaIds))
  if (!rootExisted) {
    await payload.update({
      collection: 'field-showcase',
      id: rootId,
      locale: 'ar',
      data: { textLocalized: 'مرحبا' },
    })
  }

  await createOnce(
    payload,
    tenantId,
    {
      tenant: tenantId,
      title: 'Draft example',
      text: 'Not published yet',
      items: [{ label: 'Draft row' }],
    },
    { draft: true },
  )

  for (const title of ['Child one', 'Child two']) {
    await createOnce(payload, tenantId, {
      tenant: tenantId,
      _status: 'published',
      title,
      parent: rootId,
      items: [{ label: title }],
    })
  }
}
