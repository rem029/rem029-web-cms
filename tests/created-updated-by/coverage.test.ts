import configPromise from '@payload-config'
import { describe, expect, it } from 'vitest'

import { setCreatedUpdatedBy } from '@/common/hooks/setCreatedUpdatedBy'
import {
  createdUpdatedByCollections,
  withoutCreatedUpdatedBy,
} from '@/common/utils/createdUpdatedByCollections'

// the built config (no db): the collections and their fields, as Payload runs them
const config = await configPromise
const collectionSlugs = config.collections
  .map((collection) => collection.slug)
  .filter((slug) => !slug.startsWith('payload-'))

const AUDIT_FIELDS = ['createdBy', 'updatedBy'] as const

const collectionOf = (slug: string) => {
  const collection = config.collections.find((c) => c.slug === slug)
  if (!collection) throw new Error(`tests: collection ${slug} not in config`)
  return collection
}

const auditFieldsOf = (slug: string) => {
  const collection = collectionOf(slug)
  return AUDIT_FIELDS.map((name) => collection.flattenedFields.find((field) => field.name === name))
}

describe('createdUpdatedBy coverage', () => {
  it.each([...createdUpdatedByCollections, ...withoutCreatedUpdatedBy])(
    'lists %s as a collection',
    (slug) => {
      // assert
      expect(collectionSlugs).toContain(slug)
    },
  )

  it.each(collectionSlugs)('puts %s in exactly one list', (slug) => {
    // arrange
    const listed = createdUpdatedByCollections.some((s) => s === slug)
    const without = withoutCreatedUpdatedBy.some((s) => s === slug)

    // assert
    expect(listed).not.toBe(without)
  })

  describe('listed collections', () => {
    it.each(createdUpdatedByCollections)('%s has createdBy and updatedBy as user ids', (slug) => {
      // arrange
      const [createdBy, updatedBy] = auditFieldsOf(slug)

      // assert
      expect(createdBy).toMatchObject({
        type: 'relationship',
        relationTo: 'users',
        maxDepth: 0,
      })
      expect(updatedBy).toMatchObject({
        type: 'relationship',
        relationTo: 'users',
        maxDepth: 0,
      })
    })

    it.each(createdUpdatedByCollections)('%s shows them read-only in the sidebar', (slug) => {
      // arrange
      const [createdBy, updatedBy] = auditFieldsOf(slug)

      // assert
      expect(createdBy?.admin).toMatchObject({ position: 'sidebar', readOnly: true })
      expect(updatedBy?.admin).toMatchObject({ position: 'sidebar', readOnly: true })
    })

    it.each(createdUpdatedByCollections)('%s has the setCreatedUpdatedBy hook', (slug) => {
      // arrange
      const hooks = collectionOf(slug).hooks.beforeChange ?? []

      // assert
      expect(hooks).toContain(setCreatedUpdatedBy)
    })
  })

  describe('collections without', () => {
    it.each(withoutCreatedUpdatedBy)('%s has neither field', (slug) => {
      // arrange
      const [createdBy, updatedBy] = auditFieldsOf(slug)

      // assert
      expect(createdBy).toBeUndefined()
      expect(updatedBy).toBeUndefined()
    })

    it.each(withoutCreatedUpdatedBy)('%s has no setCreatedUpdatedBy hook', (slug) => {
      // arrange
      const hooks = collectionOf(slug).hooks.beforeChange ?? []

      // assert
      expect(hooks).not.toContain(setCreatedUpdatedBy)
    })
  })
})
