import type { Field, Plugin } from 'payload'

export const SIDEBAR_TOGGLE_PATH = '@/common/components/SidebarToggle/SidebarToggle#SidebarToggle'

// SKELETON (phase 3 step 4)
// a top-level field shown in the edit view's sidebar (`admin.position: 'sidebar'`)
export const hasSidebarField = (fields: Field[]): boolean => {
  // 1. some field with `'admin' in field` and field.admin?.position === 'sidebar'
  void fields
  return false
}

// the floating-sidebar button in the document bar of every collection and global with sidebar
// fields. runs after `addCreatedUpdatedBy`, which adds the sidebar fields most collections have
export const addSidebarToggle: Plugin = (config) => {
  // 1. collections: for each with hasSidebarField(fields), append SIDEBAR_TOGGLE_PATH to
  //    admin.components.edit.beforeDocumentControls (keep what's there); others unchanged
  // 2. globals: the same with admin.components.elements.beforeDocumentControls
  return config
}
