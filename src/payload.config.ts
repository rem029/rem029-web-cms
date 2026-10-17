// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'

import sharp from 'sharp' // sharp-import
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { UsersAccess } from './collections/UsersAccess'
import { withAccessSlugOptions } from './collections/UsersAccess/utils/withAccessSlugOptions'
import { Footer } from './collections/Footer'
import { Header } from './collections/Header'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { Theme } from './collections/Theme'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { Settings } from './collections/Settings'

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './utilities/constant'
import { Analytics } from './collections/Analytics'
import { AuditLogs } from './collections/AuditLogs'
import { Tenants } from './collections/Tenants'
import { FieldShowcase } from './collections/FieldShowcase'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'
import { isNextBuild } from 'payload/shared'
import { getSeedAdminCredentials, isLoginPrefillEnabled } from './common/utils/seedAdmin'
import { AuditLogsSettings } from './globals/AuditLogsSettings/config'
import { canRunJobs, jobsCollectionAccess } from './common/utils/jobsAccess'
import {
  ensurePruneJobQueued,
  pruneAuditLogsTask,
} from './collections/AuditLogs/jobs/pruneAuditLogs'

const prefillCredentials = isLoginPrefillEnabled() ? getSeedAdminCredentials() : null

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    // dev only, opt-in (DEV_PREFILL_LOGIN=true): fills the login form, still needs a click
    autoLogin: prefillCredentials ? { ...prefillCredentials, prefillOnly: true } : false,
    // the platform mascot instead of Payload's favicons (admin only; public sites use Settings)
    meta: {
      icons: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/admin-branding/favicon-32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', url: '/admin-branding/favicon-180.png' },
      ],
    },
    components: {
      beforeLogin: ['@/common/components/LoginIntro/LoginIntro#LoginIntro'],
      header: ['@/common/components/InactiveTenantNotice#InactiveTenantNotice'],
      providers: ['@/common/components/AdminTheme/AdminTheme#AdminTheme'],
      graphics: {
        Icon: '@/common/components/AdminBranding/Icon#Icon',
        Logo: '@/common/components/AdminBranding/Logo#Logo',
      },
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
  // admin ui languages (users pick theirs in their account settings); ar renders rtl
  i18n: {
    supportedLanguages: { en, ar },
  },
  localization: {
    defaultLocale: DEFAULT_LOCALE,
    locales: SUPPORTED_LOCALES,
    fallback: true,
  },

  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    push: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    // push: false,
    logger: process.env.DB_LOGGER === 'true',
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Categories,
    Users,
    UsersAccess,
    Analytics,
    Tenants,
    Header,
    Footer,
    Theme,
    Settings,
    AuditLogs,
    FieldShowcase,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [AuditLogsSettings],

  plugins: [...plugins, withAccessSlugOptions],
  secret: process.env.PAYLOAD_SECRET,
  email: nodemailerAdapter({
    defaultFromAddress: process.env.DEFAULT_FROM_ADDRESS || '',
    defaultFromName: process.env.DEFAULT_FROM_NAME || '',

    transportOptions: {
      host: process.env.MAIL_SMTP_HOST,
      port: Number(process.env.MAIL_SMTP_PORT),
      auth: {
        user: process.env.MAIL_SMTP_USER,
        pass: process.env.MAIL_SMTP_PASS,
      },
      ...(process.env.MAIL_SMTP_DEBUG === 'true' && {
        debug: true,
        logger: true,
      }),
      ...(process.env.MAIL_SMTP_SECURE === 'true' && {
        secure: true,
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false,
        },
      }),
    },
  }),
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: { run: canRunJobs },
    // Payload's queue collection is open to every signed-in user by default
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      access: {
        read: jobsCollectionAccess,
        create: jobsCollectionAccess,
        update: jobsCollectionAccess,
        delete: jobsCollectionAccess,
      },
    }),
    tasks: [pruneAuditLogsTask],
    autoRun: [
      {
        cron: '0 */10 * * * *',
        queue: 'maintenance',
        limit: 1,
      },
    ],
  },
  onInit: async (payload) => {
    if (process.env.NODE_ENV === 'test' || isNextBuild()) return
    await ensurePruneJobQueued(payload)
  },
})
