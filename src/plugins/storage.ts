import { s3Storage } from '@payloadcms/storage-s3'
import type { Plugin } from 'payload'

export const storage: Plugin[] = process.env.S3_ENDPOINT
  ? [
      s3Storage({
        collections: {
          media: true,
        },
        bucket: process.env.S3_BUCKET || '',
        config: {
          forcePathStyle: true,
          endpoint: process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
          },
          region: process.env.S3_REGION,
        },
      }),
    ]
  : []
