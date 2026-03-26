// server/api/projects/[id].delete.ts
import { removeProject } from '../../utils/projectStore'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const success = removeProject(id)
  if (!success) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  return { success: true }
})