# Wiki Viewer 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Nuxt.js 的 Wiki 文档可视化仪表盘，支持多项目切换、文件目录树浏览、Markdown 渲染和实时文件同步。

**Architecture:** Nuxt.js 全栈应用，前端使用 Vue 3 + shadcn-vue + vue-finder + markstream-vue，后端使用 Server API + WebSocket + chokidar 文件监听。单端口 3000 运行。

**Tech Stack:** Nuxt.js 3, Vue 3, shadcn-vue, vue-finder, markstream-vue, Tailwind CSS, chokidar, WebSocket

---

## 文件结构

```
ui/
├── nuxt.config.ts              # Nuxt 配置
├── app.vue                     # 根组件
├── tailwind.config.js          # Tailwind 配置
├── package.json                # 依赖
├── types/
│   └── index.ts                # 类型定义
├── pages/
│   └── index.vue               # 主页面
├── components/
│   ├── layout/
│   │   └── Sidebar.vue         # 侧边栏
│   ├── project/
│   │   └── ProjectSwitcher.vue # 项目切换器
│   └── wiki/
│       ├── FileTree.vue        # 文件目录树
│       └── MarkdownViewer.vue  # Markdown 渲染器
├── server/
│   ├── api/
│   │   ├── projects.get.ts     # 获取项目列表
│   │   ├── projects.post.ts    # 添加项目
│   │   ├── projects.delete.ts  # 删除项目
│   │   ├── tree.get.ts         # 获取目录树
│   │   └── files/[...path].ts  # 读取文件
│   ├── utils/
│   │   ├── projectStore.ts     # 项目存储
│   │   └── fileWatcher.ts      # 文件监听
│   └── plugins/
│       └── websocket.ts        # WebSocket 服务
└── composables/
    ├── useProject.ts           # 项目状态
    ├── useFileTree.ts          # 文件树状态
    └── useWebSocket.ts         # WebSocket 连接
```

---

## Task 1: 项目初始化

**Files:**
- Create: `ui/package.json`
- Create: `ui/nuxt.config.ts`
- Create: `ui/tailwind.config.js`
- Create: `ui/tsconfig.json`

- [ ] **Step 1: 创建 Nuxt 项目**

```bash
cd D:/AI/auto-worker/ui
npx nuxi@latest init .
```

选择:
- Package manager: npm
- Initialize git repository: No (已在项目中)

- [ ] **Step 2: 安装依赖**

```bash
npm install
npm install -D tailwindcss postcss autoprefixer
npm install @vueuse/core uuid chokidar
npm install radix-vue class-variance-authority clsx tailwind-merge
```

- [ ] **Step 3: 初始化 Tailwind CSS**

```bash
npx tailwindcss init
```

- [ ] **Step 4: 配置 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 5: 创建 assets/css/main.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: 配置 nuxt.config.ts**

```typescript
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  typescript: {
    strict: true,
  },
})
```

- [ ] **Step 7: 验证项目启动**

```bash
npm run dev
```

打开 http://localhost:3000 确认 Nuxt 欢迎页面显示。

- [ ] **Step 8: Commit**

```bash
git add ui/
git commit -m "feat: initialize Nuxt.js project with Tailwind CSS"
```

---

## Task 2: 类型定义

**Files:**
- Create: `ui/types/index.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add ui/types/
git commit -m "feat: add type definitions"
```

---

## Task 3: 项目存储工具

**Files:**
- Create: `ui/server/utils/projectStore.ts`

- [ ] **Step 1: 创建项目存储工具**

```typescript
// server/utils/projectStore.ts
import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import type { Project, ProjectConfig } from '~/types'

const CONFIG_DIR = path.join(os.homedir(), '.worker')
const CONFIG_FILE = path.join(CONFIG_DIR, 'project.json')

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

export function getProjects(): Project[] {
  return loadConfig().projects
}

export function getActiveProject(): Project | null {
  const config = loadConfig()
  return config.projects.find(p => p.id === config.activeProjectId) || null
}

export function addProject(name: string, projectPath: string): Project {
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
  const config = loadConfig()
  const project = config.projects.find(p => p.id === id)
  if (!project) return null
  config.activeProjectId = id
  project.lastAccessedAt = new Date().toISOString()
  saveConfig(config)
  return project
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/server/utils/
git commit -m "feat: add project store utility"
```

---

## Task 4: 项目管理 API

**Files:**
- Create: `ui/server/api/projects.get.ts`
- Create: `ui/server/api/projects.post.ts`
- Create: `ui/server/api/projects/[id].delete.ts`
- Create: `ui/server/api/projects/[id]/activate.patch.ts`

- [ ] **Step 1: 创建获取项目列表 API**

```typescript
// server/api/projects.get.ts
import { getProjects, getActiveProject } from '~/server/utils/projectStore'

export default defineEventHandler(() => {
  const projects = getProjects()
  const activeProject = getActiveProject()
  return {
    projects,
    activeProject,
  }
})
```

- [ ] **Step 2: 创建添加项目 API**

```typescript
// server/api/projects.post.ts
import { addProject } from '~/server/utils/projectStore'

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
```

- [ ] **Step 3: 创建删除项目 API**

```typescript
// server/api/projects/[id].delete.ts
import { removeProject } from '~/server/utils/projectStore'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const success = removeProject(id)
  if (!success) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  return { success: true }
})
```

- [ ] **Step 4: 创建激活项目 API**

```typescript
// server/api/projects/[id]/activate.patch.ts
import { activateProject } from '~/server/utils/projectStore'

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
```

- [ ] **Step 5: 测试 API**

```bash
# 启动服务器
npm run dev

# 测试添加项目
curl -X POST http://localhost:3000/api/projects -H "Content-Type: application/json" -d "{\"name\":\"test\",\"path\":\"D:/AI/auto-worker\"}"

# 测试获取项目
curl http://localhost:3000/api/projects
```

- [ ] **Step 6: Commit**

```bash
git add ui/server/api/
git commit -m "feat: add project management APIs"
```

---

## Task 5: 文件读取 API

**Files:**
- Create: `ui/server/api/tree.get.ts`
- Create: `ui/server/api/files/[...path].ts`

- [ ] **Step 1: 创建目录树 API**

```typescript
// server/api/tree.get.ts
import fs from 'fs'
import path from 'path'
import { getActiveProject } from '~/server/utils/projectStore'
import type { FileNode } from '~/types'

function buildTree(dir: string, basePath: string): FileNode[] {
  const items = fs.readdirSync(dir, { withFileTypes: true })
  return items
    .filter(item => !item.name.startsWith('.'))
    .map(item => {
      const fullPath = path.join(dir, item.name)
      const relativePath = path.relative(basePath, fullPath)
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

  const workerDir = path.join(project.path, '.worker')
  if (!fs.existsSync(workerDir)) {
    return { tree: [] }
  }

  const tree = buildTree(workerDir, workerDir)
  return { tree }
})
```

- [ ] **Step 2: 创建文件读取 API**

```typescript
// server/api/files/[...path].ts
import fs from 'fs'
import path from 'path'
import { getActiveProject } from '~/server/utils/projectStore'

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
```

- [ ] **Step 3: 测试 API**

```bash
# 测试获取目录树
curl http://localhost:3000/api/tree

# 测试读取文件
curl http://localhost:3000/api/files/wiki/zh/index.md
```

- [ ] **Step 4: Commit**

```bash
git add ui/server/api/
git commit -m "feat: add file tree and file reading APIs"
```

---

## Task 6: WebSocket 服务端

**Files:**
- Create: `ui/server/plugins/websocket.ts`
- Create: `ui/server/utils/fileWatcher.ts`

- [ ] **Step 1: 创建文件监听工具**

```typescript
// server/utils/fileWatcher.ts
import chokidar from 'chokidar'
import type { FSWatcher } from 'chokidar'

let watcher: FSWatcher | null = null
let connectedClients: Set<any> = new Set()

export function startWatcher(projectPath: string) {
  stopWatcher()
  const workerDir = `${projectPath}/.worker`
  watcher = chokidar.watch(workerDir, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  })

  watcher
    .on('add', (path) => broadcast('file:added', path))
    .on('change', (path) => broadcast('file:changed', path))
    .on('unlink', (path) => broadcast('file:deleted', path))

  console.log(`[Watcher] Started watching: ${workerDir}`)
}

export function stopWatcher() {
  if (watcher) {
    watcher.close()
    watcher = null
    console.log('[Watcher] Stopped')
  }
}

export function addClient(client: any) {
  connectedClients.add(client)
}

export function removeClient(client: any) {
  connectedClients.delete(client)
}

function broadcast(type: string, filePath: string) {
  const message = JSON.stringify({
    type,
    payload: {
      path: filePath,
      timestamp: Date.now(),
    },
  })
  connectedClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message)
    }
  })
}
```

- [ ] **Step 2: 创建 WebSocket 插件**

```typescript
// server/plugins/websocket.ts
import { defineNuxtPlugin } from '#imports'
import { getActiveProject } from '~/server/utils/projectStore'
import { startWatcher, stopWatcher, addClient, removeClient } from '~/server/utils/fileWatcher'

export default defineNuxtPlugin((nuxtApp) => {
  const port = process.env.NUXT_PORT || 3000

  nuxtApp.hook('listen', (server) => {
    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/_ws') {
        const ws = new (require('ws').WebSocket)(null)
        ws.setSocket(request, socket, head)

        addClient(ws)

        // 启动文件监听
        const project = getActiveProject()
        if (project) {
          startWatcher(project.path)
        }

        ws.on('close', () => {
          removeClient(ws)
        })
      }
    })
  })

  nuxtApp.hook('close', () => {
    stopWatcher()
  })
})
```

- [ ] **Step 3: 安装 ws 依赖**

```bash
npm install ws
npm install -D @types/ws
```

- [ ] **Step 4: Commit**

```bash
git add ui/server/plugins/ ui/server/utils/fileWatcher.ts ui/package.json
git commit -m "feat: add WebSocket server and file watcher"
```

---

## Task 7: 项目状态管理

**Files:**
- Create: `ui/composables/useProject.ts`

- [ ] **Step 1: 创建项目状态 composable**

```typescript
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
      const data = await $fetch('/api/projects')
      state.projects = data.projects
      state.activeProject = data.activeProject
    } catch (e: any) {
      state.error = e.message
    } finally {
      state.isLoading = false
    }
  }

  async function addProject(name: string, path: string) {
    try {
      const data = await $fetch('/api/projects', {
        method: 'POST',
        body: { name, path },
      })
      await fetchProjects()
      return data.project
    } catch (e: any) {
      state.error = e.message
      return null
    }
  }

  async function removeProject(id: string) {
    try {
      await $fetch(`/api/projects/${id}`, { method: 'DELETE' })
      await fetchProjects()
      return true
    } catch (e: any) {
      state.error = e.message
      return false
    }
  }

  async function activateProject(id: string) {
    try {
      const data = await $fetch(`/api/projects/${id}/activate`, {
        method: 'PATCH',
      })
      await fetchProjects()
      return data.project
    } catch (e: any) {
      state.error = e.message
      return null
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
```

- [ ] **Step 2: Commit**

```bash
git add ui/composables/
git commit -m "feat: add project state composable"
```

---

## Task 8: WebSocket 客户端

**Files:**
- Create: `ui/composables/useWebSocket.ts`

- [ ] **Step 1: 创建 WebSocket composable**

```typescript
// composables/useWebSocket.ts
import type { WSMessage } from '~/types'

const state = reactive({
  isConnected: false,
  lastMessage: null as WSMessage | null,
})

export function useWebSocket() {
  let ws: WebSocket | null = null
  let reconnectTimer: NodeJS.Timeout | null = null

  function connect(onMessage?: (msg: WSMessage) => void) {
    if (ws?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${protocol}//${window.location.host}/_ws`)

    ws.onopen = () => {
      state.isConnected = true
      console.log('[WS] Connected')
    }

    ws.onclose = () => {
      state.isConnected = false
      console.log('[WS] Disconnected')
      // 自动重连
      reconnectTimer = setTimeout(() => connect(onMessage), 3000)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage
        state.lastMessage = message
        onMessage?.(message)
      } catch (e) {
        console.error('[WS] Parse error:', e)
      }
    }

    ws.onerror = (error) => {
      console.error('[WS] Error:', error)
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }
    ws?.close()
    ws = null
  }

  return {
    state: readonly(state),
    connect,
    disconnect,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/composables/useWebSocket.ts
git commit -m "feat: add WebSocket client composable"
```

---

## Task 9: 文件树状态管理

**Files:**
- Create: `ui/composables/useFileTree.ts`

- [ ] **Step 1: 创建文件树 composable**

```typescript
// composables/useFileTree.ts
import type { FileNode } from '~/types'

const state = reactive({
  tree: [] as FileNode[],
  selectedFile: null as string | null,
  fileContent: '',
  isLoading: false,
})

export function useFileTree() {
  async function fetchTree() {
    state.isLoading = true
    try {
      const data = await $fetch('/api/tree')
      state.tree = data.tree
    } catch (e) {
      console.error('Failed to fetch tree:', e)
    } finally {
      state.isLoading = false
    }
  }

  async function loadFile(filePath: string) {
    state.isLoading = true
    state.selectedFile = filePath
    try {
      const data = await $fetch(`/api/files/${filePath}`)
      state.fileContent = data.content
    } catch (e) {
      console.error('Failed to load file:', e)
      state.fileContent = ''
    } finally {
      state.isLoading = false
    }
  }

  function selectFile(path: string) {
    state.selectedFile = path
  }

  return {
    state: readonly(state),
    fetchTree,
    loadFile,
    selectFile,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/composables/useFileTree.ts
git commit -m "feat: add file tree composable"
```

---

## Task 10: 侧边栏组件

**Files:**
- Create: `ui/components/layout/Sidebar.vue`

- [ ] **Step 1: 创建侧边栏组件**

```vue
<!-- components/layout/Sidebar.vue -->
<script setup lang="ts">
import { useProject } from '~/composables/useProject'
import { useFileTree } from '~/composables/useFileTree'
import { useWebSocket } from '~/composables/useWebSocket'

const activeTab = ref('wiki')
const { state: projectState } = useProject()
const { state: fileState, fetchTree, loadFile } = useFileTree()
const { state: wsState, connect } = useWebSocket()

// 项目切换时重新加载
watch(() => projectState.activeProject, () => {
  fetchTree()
})

// WebSocket 消息处理
onMounted(() => {
  fetchTree()
  connect((msg) => {
    if (msg.type === 'file:changed' || msg.type === 'file:added' || msg.type === 'tree:refresh') {
      fetchTree()
      if (fileState.selectedFile) {
        loadFile(fileState.selectedFile)
      }
    }
  })
})

// 文件树点击
function handleFileClick(path: string) {
  loadFile(path)
}
</script>

<template>
  <aside class="w-[260px] bg-slate-900 text-slate-100 flex flex-col h-screen">
    <!-- 项目切换器 -->
    <div class="p-4 border-b border-slate-700">
      <div class="text-xs text-slate-400 uppercase mb-2">项目</div>
      <select
        class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm"
        :value="projectState.activeProject?.id"
      >
        <option v-for="p in projectState.projects" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select>
    </div>

    <!-- 导航标签 -->
    <div class="p-3 border-b border-slate-700">
      <button
        class="w-full text-left px-3 py-2 rounded text-sm"
        :class="activeTab === 'wiki' ? 'bg-slate-700' : 'hover:bg-slate-800'"
        @click="activeTab = 'wiki'"
      >
        📄 Wiki 文档
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded text-sm text-slate-500"
        disabled
      >
        📋 Plan 计划
        <span class="ml-2 text-xs bg-slate-700 px-1 rounded">敬请期待</span>
      </button>
    </div>

    <!-- 文件树 -->
    <div class="flex-1 overflow-auto p-3" v-if="activeTab === 'wiki'">
      <div class="text-xs text-slate-400 uppercase mb-2">文档目录</div>
      <div class="text-sm">
        <div
          v-for="node in fileState.tree"
          :key="node.path"
          class="py-1"
        >
          <div
            v-if="node.type === 'file'"
            class="px-2 py-1 rounded cursor-pointer hover:bg-slate-700"
            :class="fileState.selectedFile === node.path ? 'bg-blue-600' : ''"
            @click="handleFileClick(node.path)"
          >
            📄 {{ node.name }}
          </div>
          <div v-else class="text-slate-300">
            📁 {{ node.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="p-3 border-t border-slate-700 text-xs text-slate-400">
      <div class="flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full"
          :class="wsState.isConnected ? 'bg-green-500' : 'bg-red-500'"
        />
        {{ wsState.isConnected ? '实时监听中' : '未连接' }}
      </div>
    </div>
  </aside>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add ui/components/layout/
git commit -m "feat: add Sidebar component"
```

---

## Task 11: Markdown 渲染器

**Files:**
- Create: `ui/components/wiki/MarkdownViewer.vue`

- [ ] **Step 1: 创建 Markdown 渲染组件**

```vue
<!-- components/wiki/MarkdownViewer.vue -->
<script setup lang="ts">
import { MarkStream } from 'markstream-vue'
import 'markstream-vue/style.css'

const props = defineProps<{
  content: string
}>()
</script>

<template>
  <div class="markdown-body p-6 max-w-4xl mx-auto">
    <MarkStream :content="content" />
  </div>
</template>

<style>
.markdown-body {
  @apply text-slate-800 leading-relaxed;
}

.markdown-body h1 {
  @apply text-3xl font-bold mb-4 mt-8 first:mt-0;
}

.markdown-body h2 {
  @apply text-2xl font-semibold mb-3 mt-6;
}

.markdown-body h3 {
  @apply text-xl font-semibold mb-2 mt-4;
}

.markdown-body p {
  @apply mb-4;
}

.markdown-body code {
  @apply bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono;
}

.markdown-body pre {
  @apply bg-slate-900 text-slate-100 p-4 rounded-lg mb-4 overflow-x-auto;
}

.markdown-body pre code {
  @apply bg-transparent p-0;
}

.markdown-body ul {
  @apply list-disc list-inside mb-4;
}

.markdown-body ol {
  @apply list-decimal list-inside mb-4;
}

.markdown-body table {
  @apply w-full border-collapse mb-4;
}

.markdown-body th,
.markdown-body td {
  @apply border border-slate-300 px-3 py-2 text-left;
}

.markdown-body th {
  @apply bg-slate-100 font-semibold;
}

.markdown-body blockquote {
  @apply border-l-4 border-slate-300 pl-4 italic text-slate-600;
}

.markdown-body a {
  @apply text-blue-600 hover:underline;
}
</style>
```

- [ ] **Step 2: 安装 markstream-vue**

```bash
npm install markstream-vue
```

- [ ] **Step 3: Commit**

```bash
git add ui/components/wiki/ ui/package.json
git commit -m "feat: add MarkdownViewer component"
```

---

## Task 12: 主页面

**Files:**
- Create: `ui/pages/index.vue`
- Create: `ui/app.vue`

- [ ] **Step 1: 创建根组件**

```vue
<!-- app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 2: 创建主页面**

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
import { useProject } from '~/composables/useProject'
import { useFileTree } from '~/composables/useFileTree'

const { fetchProjects } = useProject()
const { state: fileState } = useFileTree()

onMounted(() => {
  fetchProjects()
})
</script>

<template>
  <div class="flex h-screen bg-white">
    <!-- 侧边栏 -->
    <Sidebar />

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- 面包屑 -->
      <header class="px-6 py-3 border-b border-slate-200 text-sm text-slate-500">
        <span>Wiki</span>
        <span v-if="fileState.selectedFile">
          / {{ fileState.selectedFile }}
        </span>
      </header>

      <!-- 内容 -->
      <div class="flex-1 overflow-auto">
        <MarkdownViewer
          v-if="fileState.fileContent"
          :content="fileState.fileContent"
        />
        <div
          v-else
          class="flex items-center justify-center h-full text-slate-400"
        >
          请从左侧选择一个文档
        </div>
      </div>
    </main>
  </div>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add ui/pages/ ui/app.vue
git commit -m "feat: add main page layout"
```

---

## Task 13: 集成测试

- [ ] **Step 1: 启动开发服务器**

```bash
cd ui
npm run dev
```

- [ ] **Step 2: 测试功能清单**

1. 打开 http://localhost:3000
2. 测试项目切换
3. 测试文件树展示
4. 测试文件点击加载
5. 测试 Markdown 渲染
6. 测试 WebSocket 连接状态
7. 修改 .worker 目录下文件，验证实时更新

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete Wiki Viewer implementation"
```

---

## 完成检查

- [ ] 所有 API 正常工作
- [ ] WebSocket 连接正常
- [ ] 文件监听触发更新
- [ ] Markdown 渲染正确
- [ ] 项目切换功能正常
- [ ] 无 TypeScript 错误