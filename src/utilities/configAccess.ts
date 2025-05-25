import { Access, CollectionSlug, PayloadRequest } from 'payload'
import { checkAccess } from './checkAccess'

export interface ConfigAccessCollection {
  admin?: ({ req }: { req: PayloadRequest }) => boolean | Promise<boolean>
  create?: Access
  delete?: Access
  read?: Access
  readVersions?: Access
  unlock?: Access
  update?: Access
}

export const getConfigAccessCollection = (slug: CollectionSlug): ConfigAccessCollection => {
  return {
    create: ({ req }) => checkAccess(req, 'collections', slug, 'create'),
    admin: ({ req }) => checkAccess(req, 'collections', slug, 'admin'),
    delete: ({ req }) => checkAccess(req, 'collections', slug, 'delete'),
    read: ({ req }) => checkAccess(req, 'collections', slug, 'read'),
    update: ({ req }) => checkAccess(req, 'collections', slug, 'update'),
    readVersions: ({ req }) => checkAccess(req, 'collections', slug, 'admin'),
    unlock: ({ req }) => checkAccess(req, 'collections', slug, 'admin'),
  }
}
