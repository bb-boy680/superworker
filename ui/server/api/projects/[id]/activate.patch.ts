// server/api/projects/[id]/activate.patch.ts
import { activateProject } from '../../../utils/projectStore'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const project = activateProject(id)
  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  return { project }
})