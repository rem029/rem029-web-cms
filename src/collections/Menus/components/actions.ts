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

type Args<F extends (...args: never[]) => unknown> = Parameters<F>[2]
type Result<F extends (...args: never[]) => unknown> = Awaited<ReturnType<F>>

/** Signs the caller in from the request cookies, then runs the builder function as them. */
const signedIn = async <R extends BuilderResult>(
  _run: (payload: Payload, user: TypedUser) => Promise<R>,
): Promise<R | BuilderRefusal> => {
  // 1. payload = await getPayload({ config: configPromise })
  // 2. { user } = await payload.auth({ headers: await headers() })
  // 3. no user → logger.warn, { ok: false, error: 'Your session has ended. Sign in again.' }
  // 4. else return run(payload, user); a throw → logger.error, { ok: false, error: 'Something
  //    went wrong. Try again.' }
  void configPromise
  void headers
  void getPayload
  throw new Error('not implemented')
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
  // 1. file = form.get('file') as a File (else refuse), tenantId = Number(form.get('tenantId'))
  // 2. signedIn → uploadItemImage(payload, user, { tenantId, file: { data: Buffer, name, … } })
  void form
  return signedIn((payload, user) =>
    uploadItemImage(payload, user, {
      tenantId: 0,
      file: { data: Buffer.alloc(0), name: '', mimetype: '', size: 0 },
    }),
  )
}
