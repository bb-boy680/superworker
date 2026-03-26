// composables/useProject.ts
import type { Project } from '~/types'

const state = reactive({
  projects: [] as Project[],
  activeProject: null as Project | null,
  isLoading: false,
  error: null as string | null,
})

export function useProject() {
  async function fetchProjects() {
    state.isLoading = true
    state.error = null
    try {
      const data = await $fetch('/api/projects') as { projects: Project[], activeProject: Project | null }
      state.projects = data.projects
      state.activeProject = data.activeProject
    } catch (e: any) {
      state.error = e.message || 'Failed to fetch projects'
    } finally {
      state.isLoading = false
    }
  }

  async function addProject(name: string, path: string) {
    state.isLoading = true
    state.error = null
    try {
      const data = await $fetch('/api/projects', {
        method: 'POST',
        body: { name, path },
      }) as { project: Project }
      await fetchProjects()
      return data.project
    } catch (e: any) {
      state.error = e.message || 'Failed to add project'
      return null
    } finally {
      state.isLoading = false
    }
  }

  async function removeProject(id: string) {
    state.isLoading = true
    state.error = null
    try {
      await $fetch(`/api/projects/${id}`, { method: 'DELETE' })
      await fetchProjects()
      return true
    } catch (e: any) {
      state.error = e.message || 'Failed to remove project'
      return false
    } finally {
      state.isLoading = false
    }
  }

  async function activateProject(id: string) {
    state.isLoading = true
    state.error = null
    try {
      const data = await $fetch(`/api/projects/${id}/activate`, {
        method: 'PATCH',
      }) as { project: Project }
      await fetchProjects()
      return data.project
    } catch (e: any) {
      state.error = e.message || 'Failed to activate project'
      return null
    } finally {
      state.isLoading = false
    }
  }

  return {
    state: readonly(state),
    fetchProjects,
    addProject,
    removeProject,
    activateProject,
  }
}