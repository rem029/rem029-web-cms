import { randomUUID } from 'crypto'

import type { CollectionSlug, Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getTestPayload } from '../common/payload'
import { TEST_USERS } from '../common/seed/fixtures'
import { uniqueName } from '../common/unique'
import { loadUser } from '../common/users'
import { auditIds, context, createBusiness, createStampedDocs, STAMPED } from './stampedDocs'

let payload: Payload
let docId: (slug: CollectionSlug) => number
let goneId: number
const before = new Map<CollectionSlug, number | null>()

beforeAll(async () => {
  payload = await getTestPayload()
  const superUser = await loadUser(payload, TEST_USERS.superUser)
  const { tenant } = await createBusiness(payload, superUser)
  const docs = await createStampedDocs(payload, { tenant, user: superUser })
  docId = docs.docId

  const name = uniqueName('cub-gone')
  const gone = await payload.create({
    collection: 'users',
    data: { email: `${name}@example.test`, name, password: randomUUID() },
  })
  goneId = gone.id

  for (const slug of STAMPED) {
    const id = docId(slug)
    // written with no user, so the hook leaves the value as given
    await payload.update({ collection: slug, id, data: { createdBy: gone.id }, context })
    const stored = await payload.findByID({ collection: slug, id, depth: 0 })
    before.set(slug, auditIds(stored).createdBy)
  }

  await payload.delete({
    collection: 'users',
    id: gone.id,
    user: superUser,
    overrideAccess: false,
  })
})

describe('deleting a user who stamped docs', () => {
  it('lets the super user delete them', async () => {
    // act
    const result = await payload.find({
      collection: 'users',
      where: { id: { equals: goneId } },
      limit: 1,
      depth: 0,
    })

    // assert
    expect(result.totalDocs).toBe(0)
  })

  describe.each(STAMPED)('%s', (slug) => {
    it('empties createdBy', async () => {
      // act
      const doc = await payload.findByID({ collection: slug, id: docId(slug), depth: 0 })

      // assert
      expect(before.get(slug)).toBe(goneId)
      expect(auditIds(doc).createdBy).toBeNull()
    })
  })
})
