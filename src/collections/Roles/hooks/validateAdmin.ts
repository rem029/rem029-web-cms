import { BeforeChangeHook } from 'node_modules/payload/dist/collections/config/types'

export const validateAdmin: BeforeChangeHook = async ({ data }) => {
  // Ensure admin role has isAdmin set to true
  if (data.slug === 'admin' && !data.isAdmin) {
    data.isAdmin = true
  }
  return data
}
