// server/api/projects.get.ts
import { getProjects, getActiveProject } from '../utils/projectStore'

export default defineEventHandler(() => {
  const projects = getProjects()
  const activeProject = getActiveProject()
  return {
    projects,
    activeProject,
  }
})