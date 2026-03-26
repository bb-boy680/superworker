// server/api/projects.post.ts
import { addProject } from '../utils/projectStore'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, path } = body

  if (!name || !path) {
    throw createError({
      statusCode: 400,
      message: 'Name and path are required',
    })
  }

  const project = addProject(name, path)
  return { project }
})