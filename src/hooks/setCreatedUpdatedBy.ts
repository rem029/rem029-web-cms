import { BeforeChangeHook as BeforeChangeHookCollection } from 'node_modules/payload/dist/collections/config/types'
import { BeforeChangeHook as BeforeChangeHookGlobal } from 'node_modules/payload/dist/globals/config/types'

export const setCreatedUpdatedByCollection: BeforeChangeHookCollection = ({
  req,
  operation,
  data,
}) => {
  const userId = req.user?.id
  if (!userId) return data

  if (operation === 'create') {
    data.createdBy = userId
  }
  data.updatedBy = userId

  return data
}

export const setCreatedUpdatedByGlobal: BeforeChangeHookGlobal = ({ req, data }) => {
  const userId = req.user?.id
  if (!userId) return data
  data.updatedBy = userId

  return data
}
