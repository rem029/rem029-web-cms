import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { createForm, formData } from './forms'

describe('form localization', () => {
  let payload: Payload
  let superUser: SessionUser
  let tenantA: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
  })

  const readIn = (id: number, locale: 'en' | 'ar') =>
    payload.findByID({ collection: 'forms', id, locale, fallbackLocale: false, depth: 0 })

  it('keeps a title per language', async () => {
    // arrange
    const title = `Contact us ${uniqueName('x')}`
    const form = await createForm(payload, superUser, formData(tenantA.id, title, []))

    // act
    await payload.update({
      collection: 'forms',
      id: form.id,
      locale: 'ar',
      // the plugin's confirmation message is required in every language the form is saved in
      data: {
        title: 'اتصل بنا',
        confirmationMessage: formData(tenantA.id, title, []).confirmationMessage,
      },
      user: superUser,
      overrideAccess: false,
    })

    // assert
    expect((await readIn(form.id, 'en')).title).toBe(title)
    expect((await readIn(form.id, 'ar')).title).toBe('اتصل بنا')
  })

  it('keeps one email subject for every language', async () => {
    // arrange
    const data = {
      ...formData(tenantA.id, uniqueName('mail'), []),
      emails: [{ emailTo: 'owner@example.test', subject: 'New message' }],
    }

    // act
    const form = await createForm(payload, superUser, data)

    // assert
    expect((await readIn(form.id, 'ar')).emails?.[0]?.subject).toBe('New message')
  })
})
