import type { RequiredDataFromCollectionSlug } from 'payload'

// Used for pre-seeded content so that the homepage is not empty
export const homeStatic: RequiredDataFromCollectionSlug<'pages'> = {
  id: 2,
  title: 'home-static',
  hero: {
    main: {
      type: 'none',
    },
  },
  layout: [],
  css_name: null,
  css_style: null,

  meta: {
    title: null,
    image: null,
    description: null,
  },
  publishedAt: '2025-05-10T20:27:10.863Z',
  slug: 'home-static',
  slugLock: true,

  createdBy: {
    id: 1,
    name: 'default@payload.com',
    role: 1,
    updatedAt: '2025-05-10T18:28:37.087Z',
    createdAt: '2025-05-10T18:28:36.963Z',
    email: 'default@payload.com',
    loginAttempts: 0,
  },

  updatedBy: {
    id: 1,
    name: 'default@payload.com',
    role: 1,
    updatedAt: '2025-05-10T18:28:37.087Z',
    createdAt: '2025-05-10T18:28:36.963Z',
    email: 'default@payload.com',
    loginAttempts: 0,
  },
  updatedAt: '2025-05-10T20:31:19.955Z',
  createdAt: '2025-05-10T20:27:08.329Z',
  _status: 'published',
}
