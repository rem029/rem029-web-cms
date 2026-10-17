// The plugin puts the sidebar button in the document bar of every collection and global that has
// sidebar fields. Plain config objects, no database.
import type { CollectionConfig, GlobalConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import { addSidebarToggle, SIDEBAR_TOGGLE_PATH } from '@/plugins/sidebarToggle'

describe('addSidebarToggle', () => {
  it('adds the toggle to collections with sidebar fields', () => {
    // arrange: a config with one collection holding a field with admin.position 'sidebar'
    const collection: CollectionConfig = {
      slug: 'pages',
      fields: [{ name: 'note', type: 'text', admin: { position: 'sidebar' } }],
    }
    const config = { collections: [collection] }

    // act: addSidebarToggle(config)
    const result = addSidebarToggle(config)

    // assert: its admin.components.edit.beforeDocumentControls contains SIDEBAR_TOGGLE_PATH
    expect(result.collections?.[0]?.admin?.components?.edit?.beforeDocumentControls).toContain(
      SIDEBAR_TOGGLE_PATH,
    )
  })

  it('adds the toggle to globals with sidebar fields', () => {
    // arrange: a config with one global holding a sidebar field
    const global: GlobalConfig = {
      slug: 'header',
      fields: [{ name: 'note', type: 'text', admin: { position: 'sidebar' } }],
    }
    const config = { globals: [global] }

    // act: addSidebarToggle(config)
    const result = addSidebarToggle(config)

    // assert: its admin.components.elements.beforeDocumentControls contains SIDEBAR_TOGGLE_PATH
    expect(result.globals?.[0]?.admin?.components?.elements?.beforeDocumentControls).toContain(
      SIDEBAR_TOGGLE_PATH,
    )
  })

  it('skips configs without sidebar fields', () => {
    // arrange: a collection and a global with only main fields
    const collection: CollectionConfig = {
      slug: 'pages',
      fields: [{ name: 'title', type: 'text' }],
    }
    const global: GlobalConfig = {
      slug: 'header',
      fields: [{ name: 'title', type: 'text' }],
    }
    const config = { collections: [collection], globals: [global] }

    // act: addSidebarToggle(config)
    const result = addSidebarToggle(config)

    // assert: neither has beforeDocumentControls
    expect(result.collections?.[0]?.admin?.components?.edit?.beforeDocumentControls).toBeUndefined()
    expect(result.globals?.[0]?.admin?.components?.elements?.beforeDocumentControls).toBeUndefined()
  })

  it('keeps existing beforeDocumentControls', () => {
    // arrange: a collection with a sidebar field and beforeDocumentControls ['@/x#Y']
    const collection: CollectionConfig = {
      slug: 'pages',
      fields: [{ name: 'note', type: 'text', admin: { position: 'sidebar' } }],
      admin: {
        components: {
          edit: {
            beforeDocumentControls: ['@/x#Y'],
          },
        },
      },
    }
    const config = { collections: [collection] }

    // act: addSidebarToggle(config)
    const result = addSidebarToggle(config)

    // assert: beforeDocumentControls is ['@/x#Y', SIDEBAR_TOGGLE_PATH]
    expect(result.collections?.[0]?.admin?.components?.edit?.beforeDocumentControls).toEqual([
      '@/x#Y',
      SIDEBAR_TOGGLE_PATH,
    ])
  })
})
