import type { CollectionBeforeChangeHook, CollectionSlug } from 'payload'
import { Forbidden, parseCookies } from 'payload'
import { getTenantRows, hasPermission, isActiveSuperUser, isDisabledUser } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'

/**
 * The multi-tenant plugin limits access with a `where` on the doc's tenant, which Payload
 * can't apply to creates or to changing a doc's tenant. This blocks writing a doc into a
 * tenant the user isn't a member of. Anonymous writes (e.g. form submissions) are left to
 * the collection's own access and hooks.
 *
 * Local API calls that pass `user` are checked as that user even with overrideAccess
 * (beforeChange hooks don't get the flag); bypassing calls don't pass a user.
 */
export const enforceTenantMembership: CollectionBeforeChangeHook = ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  const { user } = req
  if (!user) return data

  const targetTenantId =
    extractTenantId(data?.tenant) ??
    (operation === 'create'
      ? extractTenantId(parseCookies(req.headers).get('payload-tenant'))
      : extractTenantId(originalDoc?.tenant))

  if (isDisabledUser(user)) {
    req.payload.logger.warn({
      msg: 'Blocked disabled user write to tenant',
      collection: collection.slug,
      operation,
      tenantId: targetTenantId,
      userId: user.id,
    })
    throw new Forbidden(req.t)
  }

  if (isActiveSuperUser(user)) return data

  // a missing tenant is rejected by the plugin's tenant field hook
  if (targetTenantId === null) return data

  const rows = getTenantRows(user, req.payload.logger)
  const memberRow = rows.find((r) => r.tenantId === targetTenantId)

  if (!memberRow) {
    req.payload.logger.warn({
      msg: 'Blocked write to a tenant the user is not a member of',
      collection: collection.slug,
      operation,
      tenantId: targetTenantId,
      userId: user.id,
    })
    throw new Forbidden(req.t)
  }

  const isTenantChange =
    operation === 'update' &&
    data?.tenant !== undefined &&
    extractTenantId(data.tenant) !== extractTenantId(originalDoc?.tenant)

  // search docs are written by the search plugin's sync with the editor's req (a post save),
  // not by the user, so only membership applies to them
  const isPluginSynced = collection.slug === 'search'

  if (!isPluginSynced && (operation === 'create' || isTenantChange)) {
    // collection.slug is typed as string on SanitizedCollectionConfig in Payload types
    const canCreate = hasPermission(memberRow.record, collection.slug as CollectionSlug, 'create')
    if (!canCreate) {
      req.payload.logger.warn({
        msg: 'Blocked write to tenant without create permission',
        collection: collection.slug,
        operation,
        tenantId: targetTenantId,
        userId: user.id,
      })
      throw new Forbidden(req.t)
    }
  }

  return data
}
