/**
 * Sample forms per seeded business (tenant1, tenant2), so the form builder can be seen and the
 * renderer walked through with the same data every time:
 * - `contact`: a 3-step form (details, visit with a conditional family list, feedback with
 *   rating, scale, file and signature), appearance: wide, filled fields, numbered steps
 * - `feedback`: one page with rating, scale, a conditional follow-up and a message block,
 *   appearance: narrow, underlined fields, pill corners
 * - `styled`: a short form with sample Custom CSS and an accent colour
 * English and Arabic on every visitor-facing text (the Arabic comes from `AR` below).
 *
 *   pnpm seed
 *
 * Idempotent: a form is created only when its slug is missing in that business; existing forms
 * are never overwritten. Never runs in production (src/seeds/index.ts refuses).
 */
import type { Payload, RequiredDataFromCollectionSlug } from 'payload'

import type { Form } from '@/payload-types'

type FormFields = NonNullable<Form['fields']>
type FormSpec = Omit<RequiredDataFromCollectionSlug<'forms'>, 'tenant'> & { slug: string }

const SEEDED_TENANTS = ['tenant1', 'tenant2']

const paragraph = (text: string): NonNullable<Form['confirmationMessage']> => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] }],
  },
})

const options = (...labels: string[]) =>
  labels.map((label) => ({ label, value: label.toLowerCase().replace(/\s+/g, '-') }))

const CONTACT_FIELDS: FormFields = [
  {
    blockType: 'multi-step',
    steps: [
      {
        label: 'Your details',
        description: 'Tell us who you are.',
        fields: [
          { blockType: 'text', name: 'full_name', label: 'Full name', required: true, width: 100 },
          { blockType: 'email', name: 'email', label: 'Email', required: true, width: 50 },
          { blockType: 'phone', name: 'phone', label: 'Phone', width: 50 },
          { blockType: 'country', name: 'country', label: 'Country' },
        ],
      },
      {
        label: 'Your visit',
        fields: [
          { blockType: 'date', name: 'visit_date', label: 'Visit date', width: 50 },
          { blockType: 'time', name: 'arrival', label: 'Arrival time', width: 50 },
          {
            blockType: 'radio',
            name: 'party',
            label: 'Coming with',
            direction: 'row',
            options: options('Alone', 'Family'),
          },
          {
            blockType: 'conditional',
            condition_field: 'party',
            operator: 'equal',
            value: 'family',
            fields: [
              {
                blockType: 'list',
                name: 'family',
                label: 'Family members',
                max_items: 6,
                fields: [
                  { blockType: 'text', name: 'name', label: 'Name', width: 70 },
                  { blockType: 'number', name: 'age', label: 'Age', width: 30 },
                ],
              },
            ],
          },
        ],
      },
      {
        label: 'Feedback',
        fields: [
          {
            blockType: 'rating',
            name: 'service',
            label: 'How was the service?',
            labels: [{ label: 'Poor' }, { label: 'Okay' }, { label: 'Good' }, { label: 'Great' }],
            display: 'buttons',
          },
          {
            blockType: 'scale',
            name: 'recommend',
            label: 'Would you recommend us?',
            min: 0,
            max: 10,
            min_label: 'Not likely',
            max_label: 'Very likely',
          },
          { blockType: 'file', name: 'receipt', label: 'Receipt', help_text: 'Image or PDF' },
          { blockType: 'signature', name: 'signature', label: 'Signature', required: true },
        ],
      },
    ],
  },
]

const FEEDBACK_FIELDS: FormFields = [
  { blockType: 'message', message: paragraph('Thanks for visiting. This takes one minute.') },
  { blockType: 'rating', name: 'food', label: 'Food', required: true },
  {
    blockType: 'conditional',
    condition_field: 'food',
    operator: 'equal',
    value: '1',
    fields: [{ blockType: 'textarea', name: 'what_went_wrong', label: 'What went wrong?' }],
  },
  {
    blockType: 'scale',
    name: 'value',
    label: 'Value for money',
    min: 1,
    max: 5,
    min_label: 'Poor',
    max_label: 'Great',
  },
  { blockType: 'textarea', name: 'comments', label: 'Anything else?' },
]

const STYLED_FIELDS: FormFields = [
  { blockType: 'text', name: 'name', label: 'Name', required: true, css_class: 'big-input' },
  { blockType: 'email', name: 'email', label: 'Email', required: true },
  {
    blockType: 'select',
    name: 'topic',
    label: 'Topic',
    options: options('Booking', 'Catering', 'Other'),
  },
]

const FORMS: FormSpec[] = [
  {
    slug: 'contact',
    title: 'Contact us',
    fields: CONTACT_FIELDS,
    submitButtonLabel: 'Send',
    confirmationType: 'message',
    confirmationMessage: paragraph('Thanks! We will get back to you soon.'),
    available_languages: ['en', 'ar'],
    appearance: { width: 'wide', field_style: 'filled', step_indicator: 'numbered' },
  },
  {
    slug: 'feedback',
    title: 'Quick feedback',
    fields: FEEDBACK_FIELDS,
    submitButtonLabel: 'Send feedback',
    confirmationType: 'message',
    confirmationMessage: paragraph('Thank you for your feedback.'),
    available_languages: ['en', 'ar'],
    appearance: { width: 'narrow', field_style: 'underlined', radius: 'pill' },
  },
  {
    slug: 'styled',
    title: 'Styled form',
    fields: STYLED_FIELDS,
    submitButtonLabel: 'Submit',
    confirmationType: 'message',
    confirmationMessage: paragraph('Received.'),
    available_languages: ['en', 'ar'],
    appearance: { accent_color: '#7c3aed', button_full_width: true, card: 'plain' },
    custom_css: [
      '.fb-label { text-transform: uppercase; letter-spacing: 0.06em; }',
      '.big-input .fb-input { font-size: 1.25rem; }',
    ].join('\n'),
  },
]

// the Arabic for every visitor-facing English text above
const AR: Record<string, string> = {
  'Contact us': 'اتصل بنا',
  'Quick feedback': 'رأيك يهمنا',
  'Styled form': 'نموذج منسق',
  Send: 'إرسال',
  'Send feedback': 'إرسال الرأي',
  Submit: 'إرسال',
  'Your details': 'بياناتك',
  'Tell us who you are.': 'عرّفنا بنفسك.',
  'Full name': 'الاسم الكامل',
  Email: 'البريد الإلكتروني',
  Phone: 'الهاتف',
  Country: 'الدولة',
  'Your visit': 'زيارتك',
  'Visit date': 'تاريخ الزيارة',
  'Arrival time': 'وقت الوصول',
  'Coming with': 'قادم مع',
  Alone: 'وحدي',
  Family: 'العائلة',
  'Family members': 'أفراد العائلة',
  Name: 'الاسم',
  Age: 'العمر',
  Feedback: 'رأيك',
  'How was the service?': 'كيف كانت الخدمة؟',
  Poor: 'ضعيف',
  Okay: 'مقبول',
  Good: 'جيد',
  Great: 'ممتاز',
  'Would you recommend us?': 'هل تنصح بنا؟',
  'Not likely': 'غير محتمل',
  'Very likely': 'محتمل جدًا',
  Receipt: 'الإيصال',
  'Image or PDF': 'صورة أو PDF',
  Signature: 'التوقيع',
  'Thanks for visiting. This takes one minute.': 'شكرًا لزيارتك. يستغرق هذا دقيقة واحدة.',
  Food: 'الطعام',
  'What went wrong?': 'ما الذي لم يعجبك؟',
  'Value for money': 'القيمة مقابل السعر',
  'Anything else?': 'هل من شيء آخر؟',
  Topic: 'الموضوع',
  Booking: 'حجز',
  Catering: 'تموين',
  Other: 'أخرى',
  'Thanks! We will get back to you soon.': 'شكرًا! سنعود إليك قريبًا.',
  'Thank you for your feedback.': 'شكرًا على رأيك.',
  'Received.': 'تم الاستلام.',
}

// keys whose values visitors read (option `value`s and field `name`s are never translated)
const TRANSLATED_KEYS = [
  'title',
  'label',
  'description',
  'help_text',
  'min_label',
  'max_label',
  'submitButtonLabel',
  'text',
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const translate = (value: unknown, key: string): unknown => {
  if (typeof value === 'string') {
    return TRANSLATED_KEYS.includes(key) ? (AR[value] ?? value) : value
  }
  if (Array.isArray(value)) return value.map((item) => translate(item, key))
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translate(v, k)]))
  }
  return value
}

/** The same value with every visitor-facing English string swapped for its Arabic (ids kept). */
// `as T`: only string values change, so the copy has the shape of its source
const toArabic = <T>(value: T, key: string): T => translate(value, key) as T

export const seedForms = async (payload: Payload): Promise<void> => {
  for (const tenantSlug of SEEDED_TENANTS) {
    const { docs: tenants } = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: tenantSlug } },
      limit: 1,
      depth: 0,
    })
    const tenant = tenants[0]
    if (!tenant) {
      payload.logger.warn(
        `seed: ${tenantSlug} not found, skipping its forms; run multiTenancy first`,
      )
      continue
    }

    for (const spec of FORMS) {
      const { totalDocs } = await payload.count({
        collection: 'forms',
        where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: spec.slug } }] },
      })
      if (totalDocs > 0) continue

      const created = await payload.create({
        collection: 'forms',
        locale: 'en',
        data: { ...spec, slugLock: false, tenant: tenant.id },
        depth: 0,
      })

      // the Arabic version of the same blocks, keyed by their ids
      const arFields = toArabic(created.fields, 'fields')
      const arMessage = toArabic(created.confirmationMessage, 'confirmationMessage')
      await payload.update({
        collection: 'forms',
        id: created.id,
        locale: 'ar',
        data: {
          title: AR[spec.title] ?? spec.title,
          submitButtonLabel: spec.submitButtonLabel
            ? (AR[spec.submitButtonLabel] ?? spec.submitButtonLabel)
            : undefined,
          fields: arFields,
          confirmationMessage: arMessage,
        },
        depth: 0,
      })
      payload.logger.info(`seed: created form ${spec.slug} in ${tenantSlug}`)
    }
  }
}
