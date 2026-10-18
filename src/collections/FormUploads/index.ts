import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'

import { FORM_UPLOAD_MIME_TYPES } from './constants'
import { validateUploadSize } from './hooks/validateUploadSize'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Files and signatures visitors attach to form submissions. Kept apart from `media` (editor
 * uploads, public): never readable by anonymous visitors, and only the submit server action
 * (phase 2) creates them, with `overrideAccess`. Members read and delete them through their
 * profile, like form submissions.
 */
export const FormUploads: CollectionConfig = {
  slug: 'form-uploads',
  labels: { singular: 'Form upload', plural: 'Form uploads' },
  admin: {
    group: 'Forms',
    hidden: hiddenResolver('form-uploads'),
    defaultColumns: ['filename', 'form', 'field_name', 'createdAt'],
    description: 'Files and signatures visitors sent with a form.',
  },
  access: {
    read: accessCheckResolver('form-uploads', 'read'),
    delete: accessCheckResolver('form-uploads', 'delete'),
    // only the submit action writes, with overrideAccess
    create: () => false,
    update: () => false,
  },
  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      // not required: deleting a form keeps its uploads (form set to empty) instead of failing
      admin: { readOnly: true },
    },
    {
      name: 'field_name',
      type: 'text',
      label: 'Field',
      admin: { readOnly: true, description: 'The form field the visitor used.' },
    },
  ],
  upload: {
    // outside public/: served only through Payload's file route, which applies `read` access
    // (staging stores them in S3/MinIO, see src/plugins/index.ts)
    staticDir: path.resolve(dirname, '../../../form-uploads'),
    mimeTypes: FORM_UPLOAD_MIME_TYPES,
  },
  hooks: {
    beforeValidate: [validateUploadSize],
  },
}
