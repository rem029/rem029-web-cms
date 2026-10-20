'use server'

/**
 * Server actions of the menu builder (rem0017 phase 2 step 2), called by the client panels in
 * this folder. Each one only signs the caller in from the request cookies and hands over to the
 * matching function in `../utils/builder.ts`, which applies the user's access.
 */
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getPayload, type Payload, type TypedUser } from 'payload'

import type { BuilderRefusal, BuilderResult } from './builderTypes'
import {
  getItemForm,
  listBuilderCategories,
  listBuilderItems,
  listItemsOfCategory,
  listLookups,
  quickUpdateItem,
  reorderCategories,
  saveCategory,
  saveItem,
  uploadItemImage,
} from '../utils/builder'
import { getMenuPublicURL } from '../utils/publicURL'
import { addTablesToMenu, listMenuTables } from '../utils/tables'

type Args<F extends (...args: never[]) => unknown> = Parameters<F>[2]
type Result<F extends (...args: never[]) => unknown> = Awaited<ReturnType<F>>

/** Signs the caller in from the request cookies, then runs the builder function as them. */
const signedIn = async <R extends BuilderResult>(
  run: (payload: Payload, user: TypedUser) => Promise<R>,
): Promise<R | BuilderRefusal> => {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    payload.logger.warn('menu builder: action without a signed-in user')
    return { ok: false, error: 'Your session has ended. Sign in again.' }
  }
  try {
    return await run(payload, user)
  } catch (err) {
    payload.logger.error({ err, userId: user.id }, 'menu builder: action failed')
    return { ok: false, error: 'Something went wrong. Try again.' }
  }
}

export const listBuilderItemsAction = async (
  args: Args<typeof listBuilderItems>,
): Promise<Result<typeof listBuilderItems>> =>
  signedIn((payload, user) => listBuilderItems(payload, user, args))

export const listItemsOfCategoryAction = async (
  args: Args<typeof listItemsOfCategory>,
): Promise<Result<typeof listItemsOfCategory>> =>
  signedIn((payload, user) => listItemsOfCategory(payload, user, args))

export const quickUpdateItemAction = async (
  args: Args<typeof quickUpdateItem>,
): Promise<Result<typeof quickUpdateItem>> =>
  signedIn((payload, user) => quickUpdateItem(payload, user, args))

export const getItemFormAction = async (
  args: Args<typeof getItemForm>,
): Promise<Result<typeof getItemForm>> =>
  signedIn((payload, user) => getItemForm(payload, user, args))

export const saveItemAction = async (
  args: Args<typeof saveItem>,
): Promise<Result<typeof saveItem>> => signedIn((payload, user) => saveItem(payload, user, args))

export const listBuilderCategoriesAction = async (
  args: Args<typeof listBuilderCategories>,
): Promise<Result<typeof listBuilderCategories>> =>
  signedIn((payload, user) => listBuilderCategories(payload, user, args))

export const saveCategoryAction = async (
  args: Args<typeof saveCategory>,
): Promise<Result<typeof saveCategory>> =>
  signedIn((payload, user) => saveCategory(payload, user, args))

export const reorderCategoriesAction = async (
  args: Args<typeof reorderCategories>,
): Promise<Result<typeof reorderCategories>> =>
  signedIn((payload, user) => reorderCategories(payload, user, args))

export const listLookupsAction = async (
  args: Args<typeof listLookups>,
): Promise<Result<typeof listLookups>> =>
  signedIn((payload, user) => listLookups(payload, user, args))

/** The photo comes as FormData (`file`, `tenantId`): a File can't cross a server action otherwise. */
export const uploadItemImageAction = async (
  form: FormData,
): Promise<Result<typeof uploadItemImage>> => {
  const file = form.get('file')
  const tenantId = Number(form.get('tenantId'))
  if (!(file instanceof File) || !Number.isInteger(tenantId)) {
    return { ok: false, error: 'Pick an image file to upload.' }
  }
  const data = Buffer.from(await file.arrayBuffer())
  return signedIn((payload, user) =>
    uploadItemImage(payload, user, {
      tenantId,
      file: { data, name: file.name, mimetype: file.type, size: file.size },
    }),
  )
}

export const getMenuPublicURLAction = async (
  args: Args<typeof getMenuPublicURL>,
): Promise<Result<typeof getMenuPublicURL>> =>
  signedIn((payload, user) => getMenuPublicURL(payload, user, args))

// rem0018: the Ordering tab's tables and QR codes
export const listMenuTablesAction = async (
  args: Args<typeof listMenuTables>,
): Promise<Result<typeof listMenuTables>> =>
  signedIn((payload, user) => listMenuTables(payload, user, args))

export const addTablesToMenuAction = async (
  args: Args<typeof addTablesToMenu>,
): Promise<Result<typeof addTablesToMenu>> =>
  signedIn((payload, user) => addTablesToMenu(payload, user, args))
