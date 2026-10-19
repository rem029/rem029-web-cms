import { withPayload } from '@payloadcms/next/withPayload'

import redirects from './redirects.js'

const NEXT_PUBLIC_SERVER_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
        const url = new URL(item)

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', ''),
        }
      }),
      new URL('https://images.unsplash.com/**'),
      new URL('https://images.pexels.com/**'),
      new URL('https://picsum.photos/**'),
      { hostname: 'images.unsplash.com', protocol: 'https' },
      { hostname: 'images.pexels.com', protocol: 'https' },
      { hostname: 'picsum.photos', protocol: 'https' },
    ],
  },
  // next lint checks src/ by default; tests/ is linted like app code
  eslint: { dirs: ['src', 'tests'] },
  reactStrictMode: true,
  // jsdom (pulled in by isomorphic-dompurify for the theme css/js) breaks when webpack bundles it:
  // its modules import each other in a circle, and a change elsewhere in the chunk order made
  // every frontend page fail with "Class extends value undefined" (rem0017). load it from
  // node_modules instead, as Next recommends for jsdom
  serverExternalPackages: ['isomorphic-dompurify', 'jsdom'],
  experimental: {
    serverActions: {
      // Next's default is 1 MB, below a phone photo: the menu builder uploads item photos up to
      // 10 MB (MAX_IMAGE_BYTES, src/collections/Menus/components/builderTypes.ts) through a server
      // action, plus a little for the multipart form around the file
      bodySizeLimit: '11mb',
    },
  },
  redirects,
  output: process.env.NODE_ENV && 'standalone',
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
