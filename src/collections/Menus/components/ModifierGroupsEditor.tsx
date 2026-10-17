'use client'

/**
 * Options editor of the item form: groups (e.g. Size) with their choices (Small, Large), how many
 * a guest picks (any number / exactly one) and whether it's required. Controlled by the form.
 */
import React from 'react'

import type { ModifierGroupInput } from './builderTypes'

export type ModifierGroupsEditorProps = {
  value: ModifierGroupInput[]
  onChange: (value: ModifierGroupInput[]) => void
}

export const ModifierGroupsEditor: React.FC<ModifierGroupsEditorProps> = (_props) => {
  // 1. each group: name input, 'Guests pick' select (Any number / Exactly one), Required
  //    checkbox, remove group
  // 2. its choices: one input each, remove, 'Add choice' (a new group starts with one empty choice)
  // 3. 'Add option group' at the bottom; nothing yet → 'No options. Add one for sizes, extras…'
  return <div className="menu-builder__options" />
}
