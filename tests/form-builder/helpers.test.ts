import { describe, expect, it } from 'vitest'

describe('form renderer helpers', () => {
  it('flattens group and list values to dotted names', () => {
    // arrange: a group `address` (city) and a list `family` (name), 2 rows;
    //          values { 'address.city': 'Doha', 'family.0.name': 'Sara', 'family.1.name': 'Ali' }
    // act: toSubmissionData(fields, values, { family: 2 })
    // assert: [address.city Doha, family.0.name Sara, family.1.name Ali] in form order
    expect.fail('not implemented')
  })

  // proposed addition
  it('leaves hidden conditional answers out', () => {
    // arrange: conditional on party = family around `family_note`;
    //          values { party: 'alone', family_note: 'stale' }
    // act: toSubmissionData and missingRequired (family_note required)
    // assert: no family_note row; nothing missing
    expect.fail('not implemented')
  })
})
