import type { Config } from 'payload'

export const ORDER_BOARD_NAV_LINKS_PATH =
  '@/common/components/OrderBoardNavLinks#OrderBoardNavLinks'

// the staff board links at the top of the admin nav, right under the business selector the
// multi-tenant plugin puts there (they depend on the business picked in it), so it runs after
// `multiTenant`
export const addOrderBoardNavLinks = <T extends Pick<Config, 'admin'>>(config: T): T => ({
  ...config,
  admin: {
    ...config.admin,
    components: {
      ...config.admin?.components,
      beforeNavLinks: [
        ...(config.admin?.components?.beforeNavLinks ?? []),
        ORDER_BOARD_NAV_LINKS_PATH,
      ],
    },
  },
})
