// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'

import sharp from 'sharp' // sharp-import
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { Theme } from './Theme/config'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { Settings } from './Settings'
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  localization: {
    defaultLocale: 'en',
    locales: ['en', 'ar'],
  },

  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db:
    process.env.NODE_ENV === 'production'
      ? vercelPostgresAdapter({
          pool: {
            connectionString:
              'postgres://postgres.kxsgqmbduwtvxinjscuo:p3D1EoIdY52Plsqq@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x',
          },
          logger: false,
        })
      : postgresAdapter({
          pool: {
            connectionString: process.env.DATABASE_URI || '',
          },
          push: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
          logger: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
        }),
  collections: [Pages, Posts, Media, Categories, Users],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer, Theme, Settings],
  plugins: [
    ...plugins,
    vercelBlobStorage({
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
    // storage-adapter-placeholder
  ],
  secret: process.env.PAYLOAD_SECRET,
  email: nodemailerAdapter({
    defaultFromAddress: process.env.DEFAULT_FROM_ADDRESS || '',
    defaultFromName: process.env.DEFAULT_FROM_NAME || '',
    transportOptions: {
      host: process.env.MAIL_SMTP_HOST,
      port: Number(process.env.MAIL_SSMTP_PORT),
      secure: process.env.MAIL_SMTP_SECURE === 'true',
      auth: {
        user: process.env.MAIL_SMTP_USER,
        pass: process.env.MAIL_SMTP_PASS,
      },
    },
  }),
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})
