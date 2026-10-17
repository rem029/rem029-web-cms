import { describe, expect, it } from 'vitest'

import {
  listCountsFrom,
  missingRequired,
  toSubmissionData,
  valuesFromSubmission,
} from '@/components/FormRenderer/helpers'
import type { RenderField } from '@/components/FormRenderer/types'

describe('form renderer helpers', () => {
  it('flattens group and list values to dotted names', () => {
    // arrange
    const fields: RenderField[] = [
      {
        blockType: 'group',
        name: 'address',
        fields: [{ blockType: 'text', name: 'city', label: 'City' }],
      },
      {
        blockType: 'list',
        name: 'family',
        fields: [{ blockType: 'text', name: 'name', label: 'Name' }],
      },
    ]
    const values = { 'address.city': 'Doha', 'family.0.name': 'Sara', 'family.1.name': 'Ali' }

    // act
    const rows = toSubmissionData(fields, values, { family: 2 })

    // assert
    expect(rows).toEqual([
      { field: 'address.city', value: 'Doha' },
      { field: 'family.0.name', value: 'Sara' },
      { field: 'family.1.name', value: 'Ali' },
    ])
  })

  it('leaves hidden conditional answers out', () => {
    // arrange
    const fields: RenderField[] = [
      { blockType: 'text', name: 'party', label: 'Party' },
      {
        blockType: 'conditional',
        condition_field: 'party',
        operator: 'equal',
        value: 'family',
        fields: [{ blockType: 'text', name: 'family_note', label: 'Note', required: true }],
      },
    ]
    const values = { party: 'alone', family_note: 'stale' }

    // act
    const rows = toSubmissionData(fields, values, {})
    const missing = missingRequired(fields, values, {})

    // assert
    expect(rows).toEqual([{ field: 'party', value: 'alone' }])
    expect(missing).toEqual([])
  })

  // proposed addition (step 3a)
  it('reads submission rows back into values and list counts', () => {
    // arrange
    const rows = [
      { field: 'agree', value: 'true' },
      { field: 'family.1.name', value: 'Sara' },
    ]

    // act
    const values = valuesFromSubmission(rows)
    const counts = listCountsFrom(values)

    // assert
    expect(values).toEqual({ agree: true, 'family.1.name': 'Sara' })
    expect(counts).toEqual({ family: 2 })
  })
})
