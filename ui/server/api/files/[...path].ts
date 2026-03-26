// server/api/files/[...path].ts
import fs from 'fs'
import path from 'path'
import { getActiveProject } from '../../utils/projectStore'

export default defineEventHandler((event) => {
  const filePath = getRouterParam(event, 'path')
  if (!filePath) {
    throw createError({
      statusCode: 400,
      message: 'File path is required',
    })
  }

  const project = getActiveProject()
  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'No active project',
    })
  }

  const fullPath = path.join(project.path, '.worker', filePath)

  // 安全检查：确保路径在 .worker 目录内
  const workerDir = path.join(project.path, '.worker')
  const resolvedPath = path.resolve(fullPath)
  if (!resolvedPath.startsWith(workerDir)) {
    throw createError({
      statusCode: 403,
      message: 'Access denied',
    })
  }

  if (!fs.existsSync(fullPath)) {
    throw createError({
      statusCode: 404,
      message: 'File not found',
    })
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  return { content, path: filePath }
})