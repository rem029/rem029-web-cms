import type { Config, Field } from 'payload'

export const SIDEBAR_TOGGLE_PATH = '@/common/components/SidebarToggle/SidebarToggle#SidebarToggle'

// a top-level field shown in the edit view's sidebar (`admin.position: 'sidebar'`)
export const hasSidebarField = (fields: Field[]): boolean =>
  fields.some((field) => 'admin' in field && field.admin?.position === 'sidebar')

// the floating-sidebar button in the document bar of every collection and global with sidebar
// fields. runs after `addCreatedUpdatedBy`, which adds the sidebar fields most collections have
// typed on the two keys it reads, so it stays a Payload `Plugin` and takes plain configs in tests
export const addSidebarToggle = <T extends Pick<Config, 'collections' | 'globals'>>(
  config: T,
): T => ({
  ...config,
  collections: config.collections?.map((collection) => {
    if (!hasSidebarField(collection.fields)) return collection
    return {
      ...collection,
      admin: {
        ...collection.admin,
        components: {
          ...collection.admin?.components,
          edit: {
            ...collection.admin?.components?.edit,
            beforeDocumentControls: [
              ...(collection.admin?.components?.edit?.beforeDocumentControls ?? []),
              SIDEBAR_TOGGLE_PATH,
            ],
          },
        },
      },
    }
  }),
  globals: config.globals?.map((global) => {
    if (!hasSidebarField(global.fields)) return global
    return {
      ...global,
      admin: {
        ...global.admin,
        components: {
          ...global.admin?.components,
          elements: {
            ...global.admin?.components?.elements,
            beforeDocumentControls: [
              ...(global.admin?.components?.elements?.beforeDocumentControls ?? []),
              SIDEBAR_TOGGLE_PATH,
            ],
          },
        },
      },
    }
  }),
})
