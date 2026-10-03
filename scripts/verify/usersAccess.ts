/**
 * Checks users-access profiles and the access helpers in `@/common/utils/access`.
 *
 *   pnpm payload run scripts/verify/usersAccess.ts
 *   or: pnpm verify
 *
 * Refuses to run in production.
 */
import config from '@payload-config'
import type { Where } from 'payload'
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
import {
  createChecker,
  makeRecord,
  makeUser,
  reqFor,
  type AccessRow,
} from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, fail, failures } = createChecker(payload)

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
  const reqNoUser = await reqFor(payload, null)
  check('req: no user accessCheckResolver false', checkPagesRead({ req: reqNoUser }) === false)
  check('req: no user adminAccess false', adminAccess({ req: reqNoUser }) === false)
  check('req: no user hasApiAccess false', hasApiAccess(reqNoUser, 'pages') === false)
  check(
    'req: no user hiddenResolver true (hidden)',
    hiddenResolver('pages')({ user: null }) === true,
  )

  // Super user -> true / not hidden
  const superUserObj = makeUser({ id: 101, super_user: true })
  const reqSuperUser = await reqFor(payload, superUserObj)
  check('req: super user accessCheckResolver true', checkPagesRead({ req: reqSuperUser }) === true)
  check('req: super user adminAccess true', adminAccess({ req: reqSuperUser }) === true)
  check('req: super user hasApiAccess true', hasApiAccess(reqSuperUser, 'pages') === true)
  check(
    'req: super user hiddenResolver false (not hidden)',
    hiddenResolver('pages')({ user: superUserObj }) === false,
  )

  // Populated record with pages.read true on tenant 1 -> returns tenant where object
  const testWhere: Where = { id: { equals: 1 } }
  const userPopulated = makeUser({
    id: 102,
    super_user: false,
    tenants: [
      {
        tenant: 1,
        access: makeRecord([
          { slug: 'pages', read: true, hidden: false, access: true },
          { slug: 'users', admin: true },
        ]),
      },
    ],
  })
  const reqPopulated = await reqFor(payload, userPopulated)

  const pagesReadResult = checkPagesRead({ req: reqPopulated })
  check(
    'req: populated user pages.read returns tenant where',
    JSON.stringify(pagesReadResult) === JSON.stringify({ tenant: { in: [1] } }),
  )

  const checkWithWhere = accessCheckResolver('pages', 'read', { where: () => testWhere })
  const whereResult = checkWithWhere({ req: reqPopulated })
  check(
    'req: populated user returns combined where object',
    JSON.stringify(whereResult) === JSON.stringify({ and: [{ tenant: { in: [1] } }, testWhere] }),
  )

  // Populated record with read false + where option -> false (where NOT returned)
  const userPopulatedFalse = makeUser({
    id: 103,
    super_user: false,
    tenants: [
      {
        tenant: 1,
        access: makeRecord([{ slug: 'pages', read: false, hidden: false }]),
      },
    ],
  })
  const reqPopulatedFalse = await reqFor(payload, userPopulatedFalse)
  const whereFalseResult = checkWithWhere({ req: reqPopulatedFalse })
  check('req: read false with where option returns false', whereFalseResult === false)

  // User with unpopulated access id -> false / hidden
  const userIdAccess = makeUser({
    id: 104,
    super_user: false,
    tenants: [{ tenant: 1, access: 12345 }],
  })
  const reqIdAccess = await reqFor(payload, userIdAccess)

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
  const userDisabled = makeUser({
    id: 105,
    super_user: false,
    is_disabled: true,
    tenants: [
      {
        tenant: 1,
        access: makeRecord([
          { slug: 'pages', read: true, hidden: false, access: true },
          { slug: 'users', admin: true },
        ]),
      },
    ],
  })
  const reqDisabled = await reqFor(payload, userDisabled)

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
          ],
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
          access: [
            // deliberately invalid input
            { slug: 'nope' as unknown as AccessRow['slug'], read: true },
          ],
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
      const nonSuperUser = makeUser({
        id: superUser.id,
        super_user: false,
      })
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
      editor !== undefined &&
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
  fail()
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: completed with ${failures()} failure(s)`)
  process.exit(1)
}

payload.logger.info('verify: all checks passed')
process.exit(0)
