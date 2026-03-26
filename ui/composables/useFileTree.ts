// composables/useFileTree.ts
import type { FileNode } from '~/types'

const state = reactive({
  tree: [] as FileNode[],
  fileContent: '',
  currentPath: null as string | null,
  // 文件树展开状态（全局存储，防止组件重新挂载后丢失）
  expandedFolders: new Set<string>()
})

export function useFileTree() {
  async function fetchTree() {
    try {
      const data = await $fetch('/api/tree') as { tree: FileNode[] }
      state.tree = data.tree
    } catch (e: any) {
      state.tree = []
    }
  }

  async function loadFile(filePath: string) {
    state.currentPath = filePath
    try {
      const data = await $fetch(`/api/files/${filePath}`) as { content: string }
      state.fileContent = data.content
      autoExpandFolders(filePath)
    } catch (e: any) {
      state.fileContent = ''
    }
  }

  // 自动展开包含当前文件的所有父文件夹
  function autoExpandFolders(filePath: string) {
    const parts = filePath.split('/')
    let currentPath = ''
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
      state.expandedFolders.add(currentPath)
    }
  }

  function clearContent() {
    state.currentPath = null
    state.fileContent = ''
  }

  // 切换文件夹展开/折叠状态
  function toggleFolder(path: string) {
    if (state.expandedFolders.has(path)) {
      state.expandedFolders.delete(path)
    } else {
      state.expandedFolders.add(path)
    }
  }

  return {
    state: readonly(state),
    fetchTree,
    loadFile,
    clearContent,
    toggleFolder,
    autoExpandFolders,
  }
}
