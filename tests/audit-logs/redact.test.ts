// `redact`: secret-looking keys never reach an audit row, at any depth.
import { describe, expect, it } from 'vitest'

import { redact } from '@/common/utils/auditLog'

describe('redact', () => {
  it('drops keys that look secret at any depth', () => {
    // arrange
    const input = {
      smtpPassword: 'x',
      nested: { apiToken: 'y', clientSecret: 'z', ok: 1 },
      list: [{ myApiKey: 'w', label: 'kept' }],
    }

    // act
    const result = redact(input)

    // assert
    expect(result).toEqual({ nested: { ok: 1 }, list: [{ label: 'kept' }] })
  })
})
