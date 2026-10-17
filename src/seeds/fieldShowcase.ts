/**
 * Field showcase (rem0005): docs in the `admin` tenant with every field filled, to check the
 * admin theme on every field type in light and dark.
 *
 * - `Every field`: published, all tabs filled (the localized text in en and ar), images only if
 *   the tenant already has media
 * - `Draft example`: a draft, for the draft/published pills and the versions list
 * - `Child one`, `Child two`: `parent` = `Every field`, so its Children (join) list has rows
 *
 *   pnpm seed
 *
 * Idempotent: looks docs up by title + tenant and skips the ones that exist.
 */
import type { Payload } from 'payload'

export const seedFieldShowcase = async (payload: Payload): Promise<void> => {
  // 1. tenant id of `admin` (getDefaultTenantId); none → logger.warn + return
  // 2. one media id of that tenant, if any (for image/gallery)
  // 3. root doc `Every field`: find by title + tenant, else create (published, every field,
  //    textLocalized in `en`, then update in `ar`); logger.info created / skipped
  // 4. `Draft example`: same, with `draft: true`
  // 5. `Child one`, `Child two`: same, with parent = root id
  void payload
  throw new Error('not implemented')
}
