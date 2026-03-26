// composables/useFileTree.ts
import type { FileNode } from '~/types'

const state = reactive({
  tree: [] as FileNode[],
  fileContent: '',
  currentPath: null as string | null,
  isLoading: false,
  error: null as string | null,
})

export function useFileTree() {
  async function fetchTree() {
    state.isLoading = true
    state.error = null
    try {
      const data = await $fetch('/api/tree') as { tree: FileNode[] }
      state.tree = data.tree
    } catch (e: any) {
      state.error = e.message || 'Failed to fetch tree'
      state.tree = []
    } finally {
      state.isLoading = false
    }
  }

  async function loadFile(filePath: string) {
    state.isLoading = true
    state.error = null
    state.currentPath = filePath
    try {
      const data = await $fetch(`/api/files/${filePath}`) as { content: string }
      state.fileContent = data.content
    } catch (e: any) {
      state.error = e.message || 'Failed to load file'
      state.fileContent = ''
    } finally {
      state.isLoading = false
    }
  }

  function clearContent() {
    state.currentPath = null
    state.fileContent = ''
  }

  return {
    state: readonly(state),
    fetchTree,
    loadFile,
    clearContent,
  }
}