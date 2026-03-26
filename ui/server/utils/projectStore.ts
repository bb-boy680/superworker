// server/utils/projectStore.ts
import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import type { Project, ProjectConfig } from '../../types'

const CONFIG_DIR = path.join(os.homedir(), '.worker')
const CONFIG_FILE = path.join(CONFIG_DIR, 'project.json')

// 从环境变量获取 CLI 传入的项目路径
function getCLIProjectPath(): string | null {
  return process.env.WORKER_PROJECT_PATH || null
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

function loadConfig(): ProjectConfig {
  ensureConfigDir()
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig: ProjectConfig = {
      projects: [],
      activeProjectId: null,
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2))
    return defaultConfig
  }
  const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
  return JSON.parse(content)
}

function saveConfig(config: ProjectConfig) {
  ensureConfigDir()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

// 获取 CLI 模式下的虚拟项目
function getCLIProject(): Project | null {
  const cliPath = getCLIProjectPath()
  if (!cliPath) return null

  const projectName = path.basename(cliPath)
  return {
    id: 'cli-project',
    name: projectName,
    path: cliPath,
    addedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  }
}

export function getProjects(): Project[] {
  const cliProject = getCLIProject()
  if (cliProject) {
    // CLI 模式：只返回 CLI 项目
    return [cliProject]
  }
  return loadConfig().projects
}

export function getActiveProject(): Project | null {
  // 优先检查 CLI 项目
  const cliProject = getCLIProject()
  if (cliProject) {
    return cliProject
  }

  const config = loadConfig()
  return config.projects.find(p => p.id === config.activeProjectId) || null
}

export function addProject(name: string, projectPath: string): Project {
  // CLI 模式下不添加项目
  if (getCLIProjectPath()) {
    return getCLIProject()!
  }

  const config = loadConfig()
  const existing = config.projects.find(p => p.path === projectPath)
  if (existing) {
    return existing
  }
  const project: Project = {
    id: uuidv4(),
    name,
    path: projectPath,
    addedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  }
  config.projects.push(project)
  if (!config.activeProjectId) {
    config.activeProjectId = project.id
  }
  saveConfig(config)
  return project
}

export function removeProject(id: string): boolean {
  // CLI 模式下不允许删除
  if (getCLIProjectPath()) {
    return false
  }

  const config = loadConfig()
  const index = config.projects.findIndex(p => p.id === id)
  if (index === -1) return false
  config.projects.splice(index, 1)
  if (config.activeProjectId === id) {
    config.activeProjectId = config.projects[0]?.id || null
  }
  saveConfig(config)
  return true
}

export function activateProject(id: string): Project | null {
  // CLI 模式下始终返回 CLI 项目
  if (getCLIProjectPath()) {
    return getCLIProject()
  }

  const config = loadConfig()
  const project = config.projects.find(p => p.id === id)
  if (!project) return null
  config.activeProjectId = id
  project.lastAccessedAt = new Date().toISOString()
  saveConfig(config)
  return project
}