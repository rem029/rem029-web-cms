/**
 * The guard every test entry point runs first, so a wrong `.env.test` can never wipe dev or
 * staging: the run must be `NODE_ENV=test` and the database name must end in `_test`.
 */

type TestEnv = { NODE_ENV?: string; DATABASE_URI?: string }

/** Throws unless `env` points at a test database. The message never includes the password. */
export const assertTestDatabase = (env: TestEnv = process.env): void => {
  if (env.NODE_ENV !== 'test') {
    throw new Error(`tests: NODE_ENV must be test (got ${String(env.NODE_ENV)}), run pnpm test`)
  }
  if (!env.DATABASE_URI) {
    throw new Error('tests: DATABASE_URI is missing, set it in .env.test')
  }

  let dbName: string
  try {
    dbName = new URL(env.DATABASE_URI).pathname.replace(/^\//, '')
  } catch {
    throw new Error('tests: DATABASE_URI is not a valid url')
  }

  if (!dbName.endsWith('_test')) {
    throw new Error(`tests: database ${dbName} doesn't end in _test, refusing`)
  }
}
