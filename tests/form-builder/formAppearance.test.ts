import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { createForm, formData } from './forms'

describe('form appearance', () => {
  let payload: Payload
  let superUser: SessionUser
  let tenantA: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
  })

  const newForm = () => formData(tenantA.id, uniqueName('look'), [])

  it('fills appearance defaults on a new form', async () => {
    // arrange
    const data = newForm()

    // act
    const form = await createForm(payload, superUser, data)

    // assert
    expect(form.appearance).toMatchObject({
      width: 'medium',
      card: 'card',
      density: 'comfortable',
      field_style: 'outlined',
      label_position: 'above',
      radius: 'medium',
      button_style: 'solid',
      button_full_width: false,
      step_indicator: 'progress',
      background_overlay: 'none',
    })
  })

  it('saves custom css and appearance choices', async () => {
    // arrange
    const appearance = {
      width: 'wide',
      field_style: 'underlined',
      step_indicator: 'dots',
      accent_color: '#0f766e',
    } as const
    const customCss = '.fb-button { letter-spacing: 0.1em }'

    // act
    const created = await createForm(payload, superUser, {
      ...newForm(),
      appearance,
      custom_css: customCss,
    })
    const saved = await payload.findByID({ collection: 'forms', id: created.id, depth: 0 })

    // assert
    expect(saved.appearance).toMatchObject(appearance)
    expect(saved.custom_css).toBe(customCss)
  })

  it('refuses an accent colour that is not hex', async () => {
    // arrange
    const appearance = { accent_color: 'red; background: url(x)' }

    // act
    const message = await rejectionText(
      createForm(payload, superUser, { ...newForm(), appearance }),
    )

    // assert
    expect(message).toContain('Use a hex colour')
  })

  it('refuses an end date before the start date', async () => {
    // arrange
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    // act
    const message = await rejectionText(
      createForm(payload, superUser, {
        ...newForm(),
        activeFrom: tomorrow.toISOString(),
        activeTo: today.toISOString(),
      }),
    )

    // assert
    expect(message).toContain('end date must be after the start date')
  })
})
