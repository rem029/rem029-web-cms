import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import {
  blockTypes,
  createForm,
  createImage,
  everyBlockFields,
  findBlock,
  formData,
  multiStepFields,
} from './forms'

describe('form blocks', () => {
  let payload: Payload
  let superUser: SessionUser
  let tenantA: Tenant
  let mediaId: number

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    mediaId = (await createImage(payload, superUser, tenantA.id)).id
  })

  const readBack = (id: number) => payload.findByID({ collection: 'forms', id, depth: 0 })

  it('saves a form with every custom block', async () => {
    // arrange
    const fields = everyBlockFields(mediaId)

    // act
    const created = await createForm(
      payload,
      superUser,
      formData(tenantA.id, uniqueName('every'), fields),
    )
    const saved = await readBack(created.id)

    // assert
    expect(blockTypes(saved.fields)).toEqual(blockTypes(fields))
    expect(findBlock(saved.fields, 'rating').labels?.map((row) => row.label)).toEqual([
      'Poor',
      'Fine',
      'Great',
    ])
    expect(findBlock(saved.fields, 'list').max_items).toBe(4)
  })

  it('turns on radio and date', async () => {
    // arrange
    const fields = everyBlockFields(mediaId).filter(
      (field) => field.blockType === 'radio' || field.blockType === 'date',
    )

    // act
    const created = await createForm(
      payload,
      superUser,
      formData(tenantA.id, uniqueName('radio-date'), fields),
    )
    const saved = await readBack(created.id)

    // assert
    expect(blockTypes(saved.fields)).toEqual(['radio', 'date'])
    expect(findBlock(saved.fields, 'radio').direction).toBe('row')
  })

  it('saves a multi-step form with nested groups and lists', async () => {
    // arrange
    const data = formData(tenantA.id, uniqueName('steps'), multiStepFields(mediaId))

    // act
    const created = await createForm(payload, superUser, data)
    const saved = await readBack(created.id)

    // assert
    const steps = findBlock(saved.fields, 'multi-step').steps ?? []
    expect(steps.map((step) => step.label)).toEqual(['You', 'Family'])
    expect(blockTypes(findBlock(steps[0]?.fields, 'group').fields)).toEqual(['text', 'image'])
    const conditional = findBlock(steps[1]?.fields, 'conditional')
    const list = findBlock(conditional.fields, 'list')
    expect(list.max_items).toBe(5)
    expect(blockTypes(list.fields)).toEqual(['number'])
  })

  it('saves content blocks inside steps and groups', async () => {
    // arrange
    const data = formData(tenantA.id, uniqueName('content'), multiStepFields(mediaId))

    // act
    const created = await createForm(payload, superUser, data)
    const saved = await readBack(created.id)

    // assert
    const stepFields = findBlock(saved.fields, 'multi-step').steps?.[0]?.fields
    expect(findBlock(stepFields, 'image')).toMatchObject({ media: mediaId, caption: 'Welcome' })
    expect(findBlock(stepFields, 'message').css_class).toBe('c-intro')
    expect(findBlock(findBlock(stepFields, 'group').fields, 'image').caption).toBe('Badge')
  })

  it('saves css classes on fields and steps', async () => {
    // arrange
    const data = formData(tenantA.id, uniqueName('classes'), multiStepFields(mediaId))

    // act
    const created = await createForm(payload, superUser, data)
    const saved = await readBack(created.id)

    // assert
    const step = findBlock(saved.fields, 'multi-step').steps?.[0]
    expect(step?.css_class).toBe('c-step-1')
    expect(findBlock(findBlock(step?.fields, 'group').fields, 'text').css_class).toBe('c-first')
    expect(findBlock(step?.fields, 'rating').css_class).toBe('c-mood')
  })

  it('refuses a multi-step form with other top-level fields', async () => {
    // arrange
    const fields = [
      ...multiStepFields(mediaId),
      { blockType: 'text' as const, name: 'stray', label: 'Stray' },
    ]

    // act
    const message = await rejectionText(
      createForm(payload, superUser, formData(tenantA.id, uniqueName('mixed'), fields)),
    )

    // assert
    expect(message).toContain('Move text into a step')
  })

  it('keeps forms of other tenants out of reach', async () => {
    // arrange
    const tenantB = await findTenant(payload, TEST_TENANTS.b)
    const member = await loadUser(payload, TEST_USERS.member)
    const title = uniqueName('tenant-b')
    await createForm(payload, superUser, formData(tenantB.id, title, everyBlockFields(mediaId)))

    // act
    const { docs } = await payload.find({
      collection: 'forms',
      where: { title: { equals: title } },
      user: member,
      overrideAccess: false,
      depth: 0,
    })

    // assert
    expect(docs).toEqual([])
  })
})
