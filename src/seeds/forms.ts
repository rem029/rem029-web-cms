/**
 * Sample forms per seeded business (tenant1, tenant2), so the form builder can be seen and the
 * renderer walked through with the same data every time:
 * - `contact`: a 3-step form (details, visit with a conditional family list, feedback with
 *   rating, scale, file and signature), appearance: wide, filled fields, numbered steps
 * - `feedback`: one page with rating, scale, a conditional follow-up and a message block,
 *   appearance: narrow, underlined fields, pill corners
 * - `styled`: a short form with sample Custom CSS and an accent colour
 * English and Arabic labels on every visitor-facing text.
 *
 *   pnpm seed
 *
 * Idempotent: a form is created only when its slug is missing in that business; existing forms
 * are never overwritten. Never runs in production (src/seeds/index.ts refuses).
 */
import type { Payload } from 'payload'

export const SEEDED_FORM_SLUGS = ['contact', 'feedback', 'styled'] as const

export const seedForms = async (payload: Payload): Promise<void> => {
  // 1. for each tenant slug in ['tenant1', 'tenant2']: find the tenant (skip + warn when missing)
  // 2. for each form spec: find by { tenant, slug } (overrideAccess); skip when it exists
  // 3. create with locale 'en', then update the visitor-facing texts with locale 'ar'
  // 4. payload.logger.info(`seed: created form <slug> in <tenant>`)
  void payload
  throw new Error('seedForms: not implemented')
}
