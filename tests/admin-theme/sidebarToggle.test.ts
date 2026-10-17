// The plugin puts the sidebar button in the document bar of every collection and global that has
// sidebar fields. Plain config objects, no database.
import { describe, expect, it } from 'vitest'

describe('addSidebarToggle', () => {
  it('adds the toggle to collections with sidebar fields', () => {
    // arrange: a config with one collection holding a field with admin.position 'sidebar'
    // act: addSidebarToggle(config)
    // assert: its admin.components.edit.beforeDocumentControls contains SIDEBAR_TOGGLE_PATH
    expect.fail('not implemented')
  })

  it('adds the toggle to globals with sidebar fields', () => {
    // arrange: a config with one global holding a sidebar field
    // act: addSidebarToggle(config)
    // assert: its admin.components.elements.beforeDocumentControls contains SIDEBAR_TOGGLE_PATH
    expect.fail('not implemented')
  })

  it('skips configs without sidebar fields', () => {
    // arrange: a collection and a global with only main fields
    // act: addSidebarToggle(config)
    // assert: neither has beforeDocumentControls
    expect.fail('not implemented')
  })

  it('keeps existing beforeDocumentControls', () => {
    // arrange: a collection with a sidebar field and beforeDocumentControls ['@/x#Y']
    // act: addSidebarToggle(config)
    // assert: beforeDocumentControls is ['@/x#Y', SIDEBAR_TOGGLE_PATH]
    expect.fail('not implemented')
  })
})
