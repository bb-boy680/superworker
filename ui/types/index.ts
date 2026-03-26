// types/index.ts

export interface Project {
  id: string
  name: string
  path: string
  addedAt: string
  lastAccessedAt: string
}

export interface ProjectConfig {
  projects: Project[]
  activeProjectId: string | null
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  extension?: string
}

export interface WSMessage {
  type: 'file:changed' | 'file:added' | 'file:deleted' | 'tree:refresh'
  payload: {
    path: string
    timestamp: number
  }
}