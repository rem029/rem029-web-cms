// dev-only default super user (admin of the default tenant). `pnpm seed:admin` creates it and the
// optional login prefill uses the same credentials, so the two always match.
// returns null when no usable password is configured, so callers skip quietly.
export const getSeedAdminCredentials = (): { email: string; password: string } | null => {
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password || password.length < 12) return null

  return { email: process.env.SEED_ADMIN_EMAIL || 'default@payload.com', password }
}

// prefill the admin login form with the seeded super user. only under `pnpm dev`
// (NODE_ENV=development) and only when enabled: anyone who can open /admin/login sees them.
export const isLoginPrefillEnabled = (): boolean =>
  process.env.NODE_ENV === 'development' && process.env.DEV_PREFILL_LOGIN === 'true'
