import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { formText } from '@/components/FormRenderer/i18n'
import {
  SUBMIT_LIMIT,
  type SubmissionContext,
  submitForm,
} from '@/components/FormRenderer/submissions'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { createForm, type FormData, formData } from './forms'

const DAY_MS = 24 * 60 * 60 * 1000
const text = formText('en')

// submitForm (src/components/FormRenderer/submissions.ts): what submitFormAction does once the
// request is read. context = { payload, tenantId: the host's tenant, user, ip: a unique one per
// test (the rate limit is per ip and form) }; forms built with ./forms (createForm, formData).
describe('submitForm', () => {
  let payload: Payload
  let superUser: SessionUser
  let otherTenant: SessionUser
  let tenantA: Tenant
  let tenantB: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
  })

  /** A form in test-a with a required text field `name`, plus `extra` settings. */
  const openForm = (extra: Partial<FormData> = {}) =>
    createForm(payload, superUser, {
      ...formData(tenantA.id, uniqueName('submit'), [
        { blockType: 'text', name: 'name', label: 'Name', required: true },
      ]),
      ...extra,
    })

  const contextFor = (
    tenant: Tenant,
    options: { user?: SessionUser | null; ip?: string } = {},
  ): SubmissionContext => ({
    payload,
    tenantId: tenant.id,
    user: options.user ?? null,
    ip: options.ip ?? uniqueName('ip'),
  })

  const answers = (formId: number) => ({
    formId,
    locale: 'en' as const,
    submissionData: [{ field: 'name', value: 'Sara' }],
  })

  const analyticsAt = async (pagePath: string) => {
    const { docs } = await payload.find({
      collection: 'analytics',
      where: { pagePath: { equals: pagePath } },
      depth: 0,
    })
    return docs
  }

  const savedFor = async (formId: number) => {
    const { docs } = await payload.find({
      collection: 'form-submissions',
      where: { form: { equals: formId } },
      depth: 0,
    })
    return docs
  }

  it('saves a submission under the form tenant', async () => {
    // arrange
    const form = await openForm()

    // act
    const result = await submitForm(contextFor(tenantA), answers(form.id))

    // assert
    expect(result).toEqual({ ok: true })
    const saved = await savedFor(form.id)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      tenant: tenantA.id,
      submissionData: [{ field: 'name', value: 'Sara' }],
    })
  })

  it('refuses a form of another tenant host', async () => {
    // arrange
    const form = await openForm()

    // act
    const result = await submitForm(contextFor(tenantB), answers(form.id))

    // assert
    expect(result).toEqual({ ok: false, error: text.somethingWrong })
    expect(await savedFor(form.id)).toEqual([])
  })

  it('refuses an inactive form', async () => {
    // arrange
    const form = await openForm({ isActive: false })

    // act
    const result = await submitForm(contextFor(tenantA), answers(form.id))

    // assert
    expect(result).toEqual({ ok: false, error: text.formClosed })
    expect(await savedFor(form.id)).toEqual([])
  })

  it.each([
    { window: 'not open yet', field: 'activeFrom', shift: DAY_MS, error: text.notOpenYet },
    { window: 'closed', field: 'activeTo', shift: -DAY_MS, error: text.formClosed },
  ])('refuses outside the active window ($window)', async ({ field, shift, error }) => {
    // arrange
    const form = await openForm({ [field]: new Date(Date.now() + shift).toISOString() })

    // act
    const result = await submitForm(contextFor(tenantA), answers(form.id))

    // assert
    expect(result).toEqual({ ok: false, error })
    expect(await savedFor(form.id)).toEqual([])
  })

  it.each([{ who: 'anonymous' }, { who: 'otherTenant' }])(
    'refuses an auth form without a member session ($who)',
    async ({ who }) => {
      // arrange
      const form = await openForm({ requires_auth: true })
      const user = who === 'otherTenant' ? otherTenant : null

      // act
      const result = await submitForm(contextFor(tenantA, { user }), answers(form.id))

      // assert
      expect(result).toEqual({ ok: false, error: text.membersOnly })
      expect(await savedFor(form.id)).toEqual([])
    },
  )

  it('drops a submission that fills the honeypot', async () => {
    // arrange
    const form = await openForm()

    // act
    const result = await submitForm(contextFor(tenantA), {
      ...answers(form.id),
      honeypot: 'https://spam.example',
    })

    // assert
    expect(result).toEqual({ ok: true })
    expect(await savedFor(form.id)).toEqual([])
  })

  it('rate limits repeated submissions', async () => {
    // arrange
    const form = await openForm()
    const context = contextFor(tenantA)
    const allowed = await Promise.all(
      Array.from({ length: SUBMIT_LIMIT }, () => submitForm(context, answers(form.id))),
    )

    // act
    const overLimit = await submitForm(context, answers(form.id))
    const otherIp = await submitForm(contextFor(tenantA), answers(form.id))

    // assert
    expect(allowed.every((result) => result.ok)).toBe(true)
    expect(overLimit).toEqual({ ok: false, error: text.tooMany })
    expect(otherIp).toEqual({ ok: true })
    expect(await savedFor(form.id)).toHaveLength(SUBMIT_LIMIT + 1)
  })

  it('refuses without accepting the terms', async () => {
    // arrange
    const form = await openForm({ has_terms: true })
    const context = contextFor(tenantA)

    // act
    const without = await submitForm(context, answers(form.id))
    const accepted = await submitForm(context, { ...answers(form.id), termsAccepted: true })

    // assert
    expect(without).toEqual({ ok: false, error: text.termsRequired })
    expect(accepted).toEqual({ ok: true })
  })

  it('records the submission in analytics with ip, email and phone', async () => {
    // arrange
    const form = await createForm(
      payload,
      superUser,
      formData(tenantA.id, uniqueName('analytics'), [
        { blockType: 'text', name: 'name', label: 'Name' },
        { blockType: 'email', name: 'email', label: 'Email' },
        { blockType: 'phone', name: 'phone', label: 'Phone' },
      ]),
    )
    const pagePath = `/${uniqueName('contact')}`
    const context = {
      ...contextFor(tenantA),
      visitor: { ip: '203.0.113.9', deviceType: 'mobile' as const, pagePath },
    }

    // act
    await submitForm(context, {
      formId: form.id,
      locale: 'en',
      submissionData: [
        { field: 'name', value: 'Sara' },
        { field: 'email', value: 'sara@example.test' },
        { field: 'phone', value: '+97455501234' },
      ],
    })

    // assert
    const rows = await analyticsAt(pagePath)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      eventType: 'form_submission',
      tenant: tenantA.id,
      ip: '203.0.113.9',
      email: 'sara@example.test',
      phone: '+97455501234',
      deviceType: 'mobile',
    })
  })

  it('records a refused submission in analytics with the ip', async () => {
    // arrange
    const form = await openForm({ has_terms: true })
    const pagePath = `/${uniqueName('terms')}`
    const context = {
      ...contextFor(tenantA),
      visitor: { ip: '198.51.100.4', deviceType: 'desktop' as const, pagePath },
    }

    // act
    await submitForm(context, answers(form.id))

    // assert
    const rows = await analyticsAt(pagePath)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ eventType: 'error', ip: '198.51.100.4' })
    expect(rows[0]?.email ?? null).toBeNull()
  })
})
