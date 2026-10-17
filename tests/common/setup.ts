/** Runs in every test file (vitest `setupFiles`). */
import { afterAll } from 'vitest'

import { closeTestPayload } from './payload'

afterAll(async () => {
  await closeTestPayload()
})
