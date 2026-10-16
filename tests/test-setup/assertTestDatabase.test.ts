import { describe, expect, it } from 'vitest'

import { assertTestDatabase } from '../common/env'

describe('assertTestDatabase', () => {
  it('accepts a db whose name ends in _test', () => {
    // arrange
    const env = { NODE_ENV: 'test', DATABASE_URI: 'postgres://u:p@127.0.0.1:5432/cms_test' }

    // act + assert
    expect(() => assertTestDatabase(env)).not.toThrow()
  })

  it.each(['development', 'production', undefined])('refuses NODE_ENV %s', (nodeEnv) => {
    // arrange
    const env = { NODE_ENV: nodeEnv, DATABASE_URI: 'postgres://u:p@127.0.0.1:5432/cms_test' }

    // act + assert
    expect(() => assertTestDatabase(env)).toThrow(/NODE_ENV must be test/)
  })

  it.each(['cms_dev', 'cms_test_copy', 'cms_testing'])('refuses the db %s', (dbName) => {
    // arrange
    const env = { NODE_ENV: 'test', DATABASE_URI: `postgres://u:p@127.0.0.1:5432/${dbName}` }

    // act + assert
    expect(() => assertTestDatabase(env)).toThrow(/doesn't end in _test/)
  })

  it('refuses a missing DATABASE_URI', () => {
    // arrange
    const env = { NODE_ENV: 'test' }

    // act + assert
    expect(() => assertTestDatabase(env)).toThrow(/DATABASE_URI is missing/)
  })

  it('keeps the password out of the error', () => {
    // arrange
    const env = { NODE_ENV: 'test', DATABASE_URI: 'postgres://u:s3cret@127.0.0.1:5432/cms_dev' }
    let message = ''

    // act
    try {
      assertTestDatabase(env)
    } catch (err) {
      message = err instanceof Error ? err.message : String(err)
    }

    // assert
    expect(message).not.toBe('')
    expect(message).not.toContain('s3cret')
  })
})
