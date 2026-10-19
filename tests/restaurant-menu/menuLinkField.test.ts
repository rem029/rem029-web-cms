// The link field to a menu (rem0017 phase 3 step 5, `src/fields/link.ts`): "Internal link" can
// pick a menu of the document's own business, never another business's.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_MENU, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

describe('link field to a menu', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let member: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    member = await loadUser(payload, TEST_USERS.member)
  })

  it('saves a page link to a menu of its business', async () => {
    // arrange: the member of test-a, test-a's menu TEST_MENU.dinner
    const { docs: dinnerDocs } = await payload.find({
      collection: 'menus',
      where: { and: [{ slug: { equals: TEST_MENU.dinner } }, { tenant: { equals: tenantA.id } }] },
      draft: true,
      overrideAccess: true,
      limit: 1,
    })
    const dinner = dinnerDocs[0]
    const dinnerId = dinner?.id ?? 0
    const slug = uniqueName('menu-link')

    // act: create a published page in test-a with a Content block column link
    //   { type: 'reference', reference: { relationTo: 'menus', value: dinner.id } } as the member
    //   (overrideAccess false)
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Dinner Page',
        slug,
        tenant: tenantA.id,
        hero: { main: { type: 'none' } },
        layout: [
          {
            blockType: 'content',
            columns: [
              {
                size: 'full',
                enableLink: true,
                link: {
                  type: 'reference',
                  reference: { relationTo: 'menus', value: dinnerId },
                  label: 'Our menu',
                },
              },
            ],
          },
        ],
        _status: 'published',
      },
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: saved; read back with depth 1, the reference's value has slug 'dinner'
    const readBack = await payload.findByID({
      collection: 'pages',
      id: page.id,
      depth: 1,
      overrideAccess: true,
    })
    const column =
      readBack.layout?.[0]?.blockType === 'content' ? readBack.layout[0].columns?.[0] : null
    const ref = column?.link?.reference
    expect(ref?.relationTo).toBe('menus')
    const value =
      ref && typeof ref.value === 'object' && ref.value !== null && 'slug' in ref.value
        ? ref.value
        : null
    expect(value?.slug).toBe('dinner')
  })

  it('saves a page link to the menu list', async () => {
    // arrange: the member of test-a
    const slug = uniqueName('menu-list-link')

    // act: create a published page in test-a with a Content block column link { type: 'menus',
    //   label: 'Our menus' } as the member
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Menus List Page',
        slug,
        tenant: tenantA.id,
        hero: { main: { type: 'none' } },
        layout: [
          {
            blockType: 'content',
            columns: [
              {
                size: 'full',
                enableLink: true,
                link: {
                  type: 'menus',
                  label: 'Our menus',
                },
              },
            ],
          },
        ],
        _status: 'published',
      },
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: saved; read back, the link's type is 'menus'
    const readBack = await payload.findByID({
      collection: 'pages',
      id: page.id,
      depth: 1,
      overrideAccess: true,
    })
    const column =
      readBack.layout?.[0]?.blockType === 'content' ? readBack.layout[0].columns?.[0] : null
    expect(column?.link?.type).toBe('menus')
  })

  it("refuses a page link to another business's menu", async () => {
    // arrange: the member of test-a, test-b's menu TEST_MENU.onlyInB
    const { docs: onlyInBDocs } = await payload.find({
      collection: 'menus',
      where: { and: [{ slug: { equals: TEST_MENU.onlyInB } }, { tenant: { equals: tenantB.id } }] },
      draft: true,
      overrideAccess: true,
      limit: 1,
    })
    const onlyInB = onlyInBDocs[0]
    const onlyInBId = onlyInB?.id ?? 0
    const slug = uniqueName('menu-refused-link')

    // act: create a published page in test-a linking it, as the member
    const call = () =>
      payload.create({
        collection: 'pages',
        data: {
          title: 'Refused Menu Link',
          slug,
          tenant: tenantA.id,
          hero: { main: { type: 'none' } },
          layout: [
            {
              blockType: 'content',
              columns: [
                {
                  size: 'full',
                  enableLink: true,
                  link: {
                    type: 'reference',
                    reference: { relationTo: 'menus', value: onlyInBId },
                    label: 'Our menu',
                  },
                },
              ],
            },
          ],
          _status: 'published',
        },
        user: member,
        overrideAccess: false,
        context,
      })

    // assert: rejects with a validation error (status 400)
    await expect(call()).rejects.toMatchObject({ status: 400 })
  })
})
