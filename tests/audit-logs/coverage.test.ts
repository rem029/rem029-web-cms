// Every collection is either audited (the `addAuditLog` plugin gives it both hooks) or listed in
// `notAudited` (neither hook), so a new collection can't be forgotten.
import configPromise from '@payload-config'
import type { CollectionSlug } from 'payload'
import { describe, expect, it } from 'vitest'

import { auditLogAfterChange, auditLogAfterDelete } from '@/common/hooks/auditLog'
import { auditedCollections, notAudited } from '@/common/utils/auditedCollections'

// the built config (no db): the collections and their hooks, as Payload runs them
const config = await configPromise
const collectionSlugs = config.collections
  .map((collection) => collection.slug)
  .filter((slug) => !slug.startsWith('payload-'))

// the collections whose changes must be logged (rem0002 requirement), independent of the config
// list, so a collection dropped from auditedCollections fails here
const MUST_BE_AUDITED: CollectionSlug[] = [
  'pages',
  'posts',
  'media',
  'header',
  'footer',
  'theme',
  'settings',
  'tenants',
  'users-access',
  'categories',
  'forms',
  'redirects',
  'users',
]

const collectionOf = (slug: string) => {
  const collection = config.collections.find((c) => c.slug === slug)
  if (!collection) throw new Error(`tests: collection ${slug} not in config`)
  return collection
}

describe('audit log coverage', () => {
  it.each([...auditedCollections, ...notAudited])('lists %s as a collection', (slug) => {
    // assert: collectionSlugs contains the slug
    expect(collectionSlugs).toContain(slug)
  })

  it.each(MUST_BE_AUDITED)('audits %s', (slug) => {
    // assert: auditedCollections contains the slug
    expect(auditedCollections).toContain(slug)
  })

  it.each(collectionSlugs)('puts %s in exactly one list', (slug) => {
    // arrange: is it in auditedCollections, is it in notAudited
    const listed = auditedCollections.some((s) => s === slug)
    const excluded = notAudited.some((s) => s === slug)

    // assert: exactly one of the two
    expect(listed).not.toBe(excluded)
  })

  describe('audited collections', () => {
    it.each(auditedCollections)('%s has both audit hooks', (slug) => {
      // arrange: the collection's afterChange and afterDelete hooks (config.collections)
      const { hooks } = collectionOf(slug)

      // assert: auditLogAfterChange in afterChange and auditLogAfterDelete in afterDelete
      expect(hooks.afterChange ?? []).toContain(auditLogAfterChange)
      expect(hooks.afterDelete ?? []).toContain(auditLogAfterDelete)
    })
  })

  describe('collections not audited', () => {
    it.each(notAudited)('%s has no audit hook', (slug) => {
      // arrange: the collection's afterChange and afterDelete hooks (config.collections)
      const { hooks } = collectionOf(slug)

      // assert: neither auditLogAfterChange nor auditLogAfterDelete
      expect(hooks.afterChange ?? []).not.toContain(auditLogAfterChange)
      expect(hooks.afterDelete ?? []).not.toContain(auditLogAfterDelete)
    })
  })
})
