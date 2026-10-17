import type { Media } from '@/payload-types'

/** A populated upload, else nothing (an id alone has no url). */
export const mediaOf = (value: number | Media | null | undefined): Media | null =>
  value && typeof value === 'object' ? value : null
