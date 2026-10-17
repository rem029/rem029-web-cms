/**
 * Runs once per `pnpm test`, before any test file: rebuilds the test database with the same
 * script as `pnpm test:db:reset`, so a run and a manual reset can't drift apart.
 */
import { execFileSync } from 'child_process'

import { assertTestDatabase } from './env'

export default function setup(): void {
  assertTestDatabase()
  execFileSync('node_modules/.bin/payload', ['run', 'tests/scripts/resetDb.ts'], {
    stdio: 'inherit',
    env: process.env,
  })
}
