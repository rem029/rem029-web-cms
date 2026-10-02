/**
 * Checks users-access profiles and the access helpers in `@/common/utils/access`.
 *
 *   pnpm payload run scripts/verify/usersAccess.ts
 *   or: pnpm verify
 *
 * Refuses to run in production.
 */
import config from '@payload-config'
import type { PayloadRequest, Where } from 'payload'
import { getPayload } from 'payload'

import { getAccessSlugs } from '@/collections/UsersAccess/utils/accessSlugs'
import {
  accessCheckResolver,
  adminAccess,
  hasApiAccess,
  hasPermission,
  hiddenResolver,
  isHidden,
} from '@/common/utils/access'
import type { User, UsersAccess } from '@/payload-types'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })

let failures = 0
const check = (name: string, ok: boolean): void => {
  if (ok) {
    payload.logger.info(`PASS ${name}`)
    return
  }
  failures++
  payload.logger.error(`FAIL ${name}`)
}

const errorText = (err: unknown): string => {
  if (!err || typeof err !== 'object') return String(err)
  const parts: string[] = []
  if ('message' in err && typeof err.message === 'string') {
    parts.push(err.message)
  }
  if (
    'data' in err &&
    err.data &&
    typeof err.data === 'object' &&
    'errors' in err.data &&
    Array.isArray((err.data as { errors: unknown[] }).errors)
  ) {
    for (const item of (err.data as { errors: unknown[] }).errors) {
      if (
        item &&
        typeof item === 'object' &&
        'message' in item &&
        typeof item.message === 'string'
      ) {
        parts.push(item.message)
      }
    }
  }
  return parts.join(' ')
}

type RowInput = {
  slug: string
  hidden?: boolean
  read?: boolean
  create?: boolean
  update?: boolean
  delete?: boolean
  admin?: boolean
  access?: boolean
}

const makeRecord = (rows: RowInput[]): UsersAccess =>
  ({
    id: 99999,
    name: 'test-record',
    slug: 'test-record',
    access: rows as unknown as UsersAccess['access'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as UsersAccess

const cleanup = async (): Promise<void> => {
  try {
    const { docs: verifyDocs } = await payload.find({
      collection: 'users-access',
      where: { slug: { contains: 'verify-' } },
      overrideAccess: true,
      limit: 100,
    })
    for (const doc of verifyDocs) {
      await payload.delete({
        collection: 'users-access',
        id: doc.id,
        overrideAccess: true,
      })
    }
  } catch (err) {
    payload.logger.error({ msg: 'verify: cleanup failed', err })
  }
}

try {
  // 1. Pure matrix for hasPermission and isHidden
  check('pure: null record hasPermission false', hasPermission(null, 'pages', 'read') === false)
  check('pure: null record isHidden true', isHidden(null, 'pages') === true)

  const recNoRow = makeRecord([{ slug: 'posts', read: true, hidden: false }])
  check(
    'pure: record without slug row hasPermission false',
    hasPermission(recNoRow, 'pages', 'read') === false,
  )
  check('pure: record without slug row isHidden true', isHidden(recNoRow, 'pages') === true)

  const recReadFalse = makeRecord([{ slug: 'pages', read: false, hidden: false }])
  check(
    'pure: row with read false hasPermission false',
    hasPermission(recReadFalse, 'pages', 'read') === false,
  )

  const recReadTrue = makeRecord([{ slug: 'pages', read: true, hidden: false }])
  check(
    'pure: row with read true hasPermission true',
    hasPermission(recReadTrue, 'pages', 'read') === true,
  )

  const recHiddenFalse = makeRecord([{ slug: 'pages', hidden: false }])
  check('pure: row hidden false isHidden false', isHidden(recHiddenFalse, 'pages') === false)

  // 2. Request-level checks
  const checkPagesRead = accessCheckResolver('pages', 'read')

  // No user -> false / hidden
  const reqNoUser = { user: null, payload } as unknown as PayloadRequest
  check('req: no user accessCheckResolver false', checkPagesRead({ req: reqNoUser }) === false)
  check('req: no user adminAccess false', adminAccess({ req: reqNoUser }) === false)
  check('req: no user hasApiAccess false', hasApiAccess(reqNoUser, 'pages') === false)
  check(
    'req: no user hiddenResolver true (hidden)',
    hiddenResolver('pages')({ user: null }) === true,
  )

  // Super user -> true / not hidden
  const superUserObj = { id: 101, super_user: true, collection: 'users' } as unknown as User
  const reqSuperUser = { user: superUserObj, payload } as unknown as PayloadRequest
  check('req: super user accessCheckResolver true', checkPagesRead({ req: reqSuperUser }) === true)
  check('req: super user adminAccess true', adminAccess({ req: reqSuperUser }) === true)
  check('req: super user hasApiAccess true', hasApiAccess(reqSuperUser, 'pages') === true)
  check(
    'req: super user hiddenResolver false (not hidden)',
    hiddenResolver('pages')({ user: superUserObj }) === false,
  )

  // Populated record with pages.read true -> true and returns where object when provided
  const testWhere: Where = { id: { equals: 1 } }
  const userPopulated = {
    id: 102,
    super_user: false,
    access: makeRecord([
      { slug: 'pages', read: true, hidden: false, access: true },
      { slug: 'users', admin: true },
    ]),
    collection: 'users',
  } as unknown as User
  const reqPopulated = { user: userPopulated, payload } as unknown as PayloadRequest

  check('req: populated user pages.read true', checkPagesRead({ req: reqPopulated }) === true)

  const checkWithWhere = accessCheckResolver('pages', 'read', { where: () => testWhere })
  const whereResult = checkWithWhere({ req: reqPopulated })
  check('req: populated user returns where object', whereResult === testWhere)

  // Populated record with read false + where option -> false (where NOT returned)
  const userPopulatedFalse = {
    id: 103,
    super_user: false,
    access: makeRecord([{ slug: 'pages', read: false, hidden: false }]),
    collection: 'users',
  } as unknown as User
  const reqPopulatedFalse = { user: userPopulatedFalse, payload } as unknown as PayloadRequest
  const whereFalseResult = checkWithWhere({ req: reqPopulatedFalse })
  check('req: read false with where option returns false', whereFalseResult === false)

  // User with unpopulated access id -> false / hidden
  const userIdAccess = {
    id: 104,
    super_user: false,
    access: 12345,
    collection: 'users',
  } as unknown as User
  const reqIdAccess = { user: userIdAccess, payload } as unknown as PayloadRequest

  check(
    'req: unpopulated access id accessCheckResolver false',
    checkPagesRead({ req: reqIdAccess }) === false,
  )
  check('req: unpopulated access id adminAccess false', adminAccess({ req: reqIdAccess }) === false)
  check(
    'req: unpopulated access id hasApiAccess false',
    hasApiAccess(reqIdAccess, 'pages') === false,
  )
  check(
    'req: unpopulated access id hiddenResolver true (hidden)',
    hiddenResolver('pages')({ user: userIdAccess }) === true,
  )

  // User with is_disabled: true and granting record -> false / hidden
  const userDisabled = {
    id: 105,
    super_user: false,
    is_disabled: true,
    access: makeRecord([
      { slug: 'pages', read: true, hidden: false, access: true },
      { slug: 'users', admin: true },
    ]),
    collection: 'users',
  } as unknown as User
  const reqDisabled = { user: userDisabled, payload } as unknown as PayloadRequest

  check(
    'req: disabled user accessCheckResolver false',
    checkPagesRead({ req: reqDisabled }) === false,
  )
  check('req: disabled user adminAccess false', adminAccess({ req: reqDisabled }) === false)
  check('req: disabled user hasApiAccess false', hasApiAccess(reqDisabled, 'pages') === false)
  check(
    'req: disabled user hiddenResolver true (hidden)',
    hiddenResolver('pages')({ user: userDisabled }) === true,
  )

  // 3. Collection checks via Local API as seeded super user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'default@payload.com'
  const { docs: adminUsers } = await payload.find({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    limit: 1,
    depth: 0,
  })
  const superUser = adminUsers[0]
  if (!superUser || !superUser.super_user) {
    check(`collection: super user ${adminEmail} exists (run "pnpm seed" first)`, false)
  } else {
    check(`collection: super user ${adminEmail} found`, true)

    // Delete leftovers first
    await payload.delete({
      collection: 'users-access',
      where: { slug: { equals: 'verify-default-rows' } },
      overrideAccess: true,
    })

    // Create verify-default-rows with no access
    const defaultRowsProfile = await payload.create({
      collection: 'users-access',
      data: {
        name: 'Verify Default Rows',
        slug: 'verify-default-rows',
      },
      overrideAccess: false,
      user: superUser,
    })

    const expectedSlugs = getAccessSlugs(payload.config.collections)
    check(
      'collection: access slugs include plugin collections and no payload internals',
      expectedSlugs.includes('forms') &&
        expectedSlugs.includes('redirects') &&
        !expectedSlugs.some((slug) => slug.startsWith('payload-')),
    )
    const accessRows = defaultRowsProfile.access || []
    const hasExactCount = accessRows.length === expectedSlugs.length
    const allDefaultsCorrect =
      hasExactCount &&
      accessRows.every(
        (row) =>
          row.hidden === true &&
          row.read === false &&
          row.create === false &&
          row.update === false &&
          row.delete === false &&
          row.admin === false &&
          row.access === false,
      )
    check(
      'collection: create profile without access fills default rows (count & checkboxes)',
      allDefaultsCorrect,
    )

    // Duplicate row slugs -> throws, message contains Duplicate row for "pages"
    try {
      await payload.create({
        collection: 'users-access',
        data: {
          name: 'Verify Duplicate Rows',
          slug: 'verify-duplicate-rows',
          access: [
            { slug: 'pages', read: true },
            { slug: 'pages', read: false },
          ] as UsersAccess['access'],
        },
        overrideAccess: false,
        user: superUser,
      })
      check('collection: create with duplicate row slugs throws', false)
    } catch (err) {
      const text = errorText(err)
      check(
        'collection: create with duplicate row slugs throws Duplicate row for "pages"',
        text.includes('Duplicate row for "pages"'),
      )
    }

    // Unknown row slug ('nope' cast) -> throws, message contains nope
    try {
      await payload.create({
        collection: 'users-access',
        data: {
          name: 'Verify Unknown Slug',
          slug: 'verify-unknown-slug',
          access: [{ slug: 'nope' as unknown as 'pages', read: true }] as UsersAccess['access'],
        },
        overrideAccess: false,
        user: superUser,
      })
      check('collection: create with unknown row slug throws', false)
    } catch (err) {
      const text = errorText(err)
      check(
        'collection: create with unknown row slug throws message containing "nope"',
        text.toLowerCase().includes('nope'),
      )
    }

    // Profile slug Bad Slug -> throws, message mentions kebab-case
    try {
      await payload.create({
        collection: 'users-access',
        data: {
          name: 'Verify Bad Slug',
          slug: 'Bad Slug',
        },
        overrideAccess: false,
        user: superUser,
      })
      check('collection: create with Bad Slug throws', false)
    } catch (err) {
      const text = errorText(err)
      check(
        'collection: create with Bad Slug throws message mentioning kebab-case',
        text.toLowerCase().includes('kebab-case'),
      )
    }

    // Non-super user cannot read users-access
    try {
      const nonSuperUser = {
        id: superUser.id,
        super_user: false,
        collection: 'users',
      } as unknown as User
      const res = await payload.find({
        collection: 'users-access',
        overrideAccess: false,
        user: nonSuperUser,
      })
      check('collection: non-super user cannot read users-access', res.docs.length === 0)
    } catch {
      check('collection: non-super user cannot read users-access', true)
    }

    // Seeded editor and viewer profiles exist
    const { docs: editorDocs } = await payload.find({
      collection: 'users-access',
      where: { slug: { equals: 'editor' } },
      overrideAccess: true,
    })
    check('collection: seeded editor profile exists', editorDocs.length === 1)
    const editor = editorDocs[0]
    check(
      'collection: editor can update pages, open /admin, not read users or tenants',
      hasPermission(editor, 'pages', 'update') &&
        hasPermission(editor, 'users', 'admin') &&
        !hasPermission(editor, 'users', 'read') &&
        !hasPermission(editor, 'tenants', 'read') &&
        isHidden(editor, 'tenants'),
    )

    const { docs: viewerDocs } = await payload.find({
      collection: 'users-access',
      where: { slug: { equals: 'viewer' } },
      overrideAccess: true,
    })
    check('collection: seeded viewer profile exists', viewerDocs.length === 1)
  }
} catch (err) {
  payload.logger.error({ msg: 'verify: unexpected error during verification', err })
  failures++
} finally {
  await cleanup()
}

if (failures > 0) {
  payload.logger.error(`verify: completed with ${failures} failure(s)`)
  process.exit(1)
}

payload.logger.info('verify: all checks passed')
process.exit(0)
