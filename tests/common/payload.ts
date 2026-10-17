/**
 * One Payload instance per test file, on the test database. Closed by `setup.ts` after the file.
 * The config and Payload are imported inside `getTestPayload`, so component tests (jsdom), which
 * never call it, don't load the whole server config.
 */
import type { Payload } from 'payload'

import { assertTestDatabase } from './env'

let instance: Payload | null = null

/** The file's Payload instance; boots it on the first call. */
export const getTestPayload = async (): Promise<Payload> => {
  assertTestDatabase()
  if (!instance) {
    const { default: config } = await import('@payload-config')
    const { getPayload } = await import('payload')
    instance = await getPayload({ config })
  }
  return instance
}

/** Closes the db pool if this file booted Payload, so files don't pile up connections. */
export const closeTestPayload = async (): Promise<void> => {
  if (!instance) return
  await instance.db.destroy?.()
  instance = null
}
