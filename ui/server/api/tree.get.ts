// server/api/tree.get.ts
import fs from 'fs'
import path from 'path'
import { getActiveProject } from '../utils/projectStore'
import type { FileNode } from '../../types'

function buildTree(dir: string, basePath: string): FileNode[] {
  const items = fs.readdirSync(dir, { withFileTypes: true })
  return items
    .filter(item => !item.name.startsWith('.'))
    .map(item => {
      const fullPath = path.join(dir, item.name)
      const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/')
      const node: FileNode = {
        name: item.name,
        path: relativePath,
        type: item.isDirectory() ? 'directory' : 'file',
      }
      if (item.isDirectory()) {
        node.children = buildTree(fullPath, basePath)
      } else {
        node.extension = path.extname(item.name)
      }
      return node
    })
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
}

export default defineEventHandler(() => {
  const project = getActiveProject()
  if (!project) {
    return { tree: [] }
  }

  // 只获取 wiki/zh 目录
  const wikiDir = path.join(project.path, '.worker', 'wiki', 'zh')
  if (!fs.existsSync(wikiDir)) {
    return { tree: [] }
  }

  const tree = buildTree(wikiDir, wikiDir)
  return { tree }
})