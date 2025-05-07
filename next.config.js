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
      { hostname: 'images.unsplash.com', protocol: 'https' },
      { hostname: 'images.pexels.com', protocol: 'https' },
    ],
  },
  reactStrictMode: true,
  redirects,
  output: process.env.NODE_ENV && 'standalone',
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
