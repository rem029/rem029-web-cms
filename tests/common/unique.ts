import { randomUUID } from 'crypto'

/** Names for docs a test creates, unique per run, so tests never collide with each other's rows. */

/** `<prefix>-<8 random hex chars>`, e.g. `cub-stamp-1a2b3c4d`. Lowercase, safe as a slug. */
export const uniqueName = (prefix: string): string => `${prefix}-${randomUUID().slice(0, 8)}`
