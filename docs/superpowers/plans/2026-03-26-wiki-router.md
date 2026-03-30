# Wiki Router 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Wiki 从单页面状态切换改造为 Nuxt 路由驱动，支持 `/wiki/{path}` 动态路由。

**Architecture:** 使用 Nuxt Layouts 分离布局与页面，`[...slug].vue` 捕获所有 `/wiki/**` 路由，选中状态由 URL 参数驱动。

**Tech Stack:** Nuxt 3, Vue 3, Vue Router

---

## 文件结构

```
ui/
├── layouts/
│   └── default.vue              # 创建 - 主布局
├── pages/
│   ├── index.vue                # 修改 - 重定向到 /wiki
│   └── wiki/
│       └── [...slug].vue        # 创建 - 动态路由页面
├── composables/
│   └── useFileTree.ts           # 修改 - 简化状态管理
└── components/
    └── layout/
        └── Sidebar.vue          # 修改 - 文件点击行为
```

---

### Task 1: 创建 layouts/default.vue

**Files:**
- Create: `ui/layouts/default.vue`

- [ ] **Step 1: 创建 layouts 目录和 default.vue**

```vue
<!-- layouts/default.vue -->
<script setup lang="ts">
import { useFileTree } from '~/composables/useFileTree'

const { state: fileState } = useFileTree()
</script>

<template>
  <UiSidebarProvider>
    <LayoutSidebar />

    <UiSidebarInset>
      <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <UiSidebarTrigger class="-ml-1" />
        <div class="text-sm text-muted-foreground">
          Wiki
          <span v-if="fileState.currentPath" class="text-foreground font-medium">
            / {{ fileState.currentPath }}
          </span>
        </div>
        <span v-if="fileState.isLoading" class="ml-2 text-xs text-primary">加载中...</span>
      </header>

      <main class="flex-1 overflow-auto">
        <NuxtPage />
      </main>
    </UiSidebarInset>
  </UiSidebarProvider>
</template>
```

- [ ] **Step 2: 验证布局文件创建成功**

Run: `ls ui/layouts/`
Expected: 输出包含 `default.vue`

- [ ] **Step 3: Commit**

```bash
git add ui/layouts/default.vue
git commit -m "feat: add default layout with sidebar"
```

---

### Task 2: 修改 useFileTree.ts

**Files:**
- Modify: `ui/composables/useFileTree.ts`

- [ ] **Step 1: 重写 useFileTree.ts，移除 selectedFile 状态**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add ui/composables/useFileTree.ts
git commit -m "refactor: simplify useFileTree, use currentPath instead of selectedFile"
```

---

### Task 3: 创建 pages/wiki/[...slug].vue

**Files:**
- Create: `ui/pages/wiki/[...slug].vue`

- [ ] **Step 1: 创建 wiki 目录和动态路由页面**

```vue
<!-- pages/wiki/[...slug].vue -->
<script setup lang="ts">
import { useFileTree } from '~/composables/useFileTree'

const route = useRoute()
const router = useRouter()
const { state: fileState, loadFile, clearContent } = useFileTree()

// 从路由参数获取当前文件路径
const currentFilePath = computed(() => {
  const slug = route.params.slug
  return slug && Array.isArray(slug) && slug.length > 0
    ? slug.join('/')
    : null
})

// 监听路由变化，加载文件
watch(currentFilePath, (path) => {
  if (path) {
    loadFile(path)
  } else {
    clearContent()
  }
}, { immediate: true })
</script>

<template>
  <div class="flex h-full">
    <!-- 左侧：文件树 -->
    <aside class="w-64 border-r shrink-0 overflow-auto">
      <LayoutFileTree />
    </aside>

    <!-- 右侧：Markdown 渲染区 -->
    <div class="flex-1 overflow-auto">
      <WikiMarkdownViewer
        v-if="fileState.fileContent"
        :content="fileState.fileContent"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 2: 验证页面文件创建成功**

Run: `ls ui/pages/wiki/`
Expected: 输出包含 `[...slug].vue`

- [ ] **Step 3: Commit**

```bash
git add ui/pages/wiki/[...slug].vue
git commit -m "feat: add wiki dynamic route page"
```

---

### Task 4: 创建 LayoutFileTree 组件

**Files:**
- Create: `ui/components/layout/FileTree.vue`

- [ ] **Step 1: 从 Sidebar.vue 抽离文件树为独立组件**

```vue
<!-- components/layout/FileTree.vue -->
<script setup lang="ts">
import { File, Folder, FolderOpen, ChevronRight } from 'lucide-vue-next'
import { useFileTree } from '~/composables/useFileTree'

const route = useRoute()
const router = useRouter()
const { state: fileState } = useFileTree()

// 展开/折叠状态
const expandedFolders = ref<Set<string>>(new Set())

function toggleFolder(path: string) {
  if (expandedFolders.value.has(path)) {
    expandedFolders.value.delete(path)
  } else {
    expandedFolders.value.add(path)
  }
}

// 当前选中文件路径（从路由获取）
const currentPath = computed(() => {
  const slug = route.params.slug
  return slug && Array.isArray(slug) && slug.length > 0
    ? slug.join('/')
    : null
})

// 文件点击处理
function handleFileClick(filePath: string, event: MouseEvent) {
  const path = `/wiki/${filePath}`

  if (event.metaKey || event.ctrlKey) {
    // Ctrl/Cmd + 点击：新标签页打开
    window.open(path, '_blank')
  } else {
    // 普通点击：路由跳转
    router.push(path)
  }
}

// 递归渲染文件节点
function renderFileNode(node: any, level = 0) {
  const paddingLeft = level * 12 + 8
  const isExpanded = expandedFolders.value.has(node.path)
  const isSelected = currentPath.value === node.path

  return h('div', { key: node.path }, [
    node.type === 'file'
      ? h('button', {
          class: [
            'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left',
            isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground'
          ],
          style: { paddingLeft: `${paddingLeft}px` },
          onClick: (e: MouseEvent) => handleFileClick(node.path, e)
        }, [
          h(File, { class: 'h-4 w-4 shrink-0' }),
          h('span', { class: 'truncate' }, node.name)
        ])
      : h('button', {
          class: 'w-full flex items-center gap-1 px-2 py-1.5 text-sm rounded-md transition-colors text-left hover:bg-accent hover:text-accent-foreground',
          style: { paddingLeft: `${paddingLeft}px` },
          onClick: () => toggleFolder(node.path)
        }, [
          h(ChevronRight, {
            class: ['h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-90']
          }),
          isExpanded ? h(FolderOpen, { class: 'h-4 w-4 shrink-0 text-muted-foreground' }) : h(Folder, { class: 'h-4 w-4 shrink-0 text-muted-foreground' }),
          h('span', { class: 'truncate font-medium' }, node.name)
        ]),
    ...(node.children && expandedFolders.value.has(node.path)
      ? node.children.map((child: any) => renderFileNode(child, level + 1))
      : [])
  ])
}

const fileTreeNodes = computed(() => {
  return fileState.tree.map((node: any) => renderFileNode(node))
})
</script>

<template>
  <div v-if="fileState.isLoading" class="text-sm text-muted-foreground py-2 px-2">
    加载中...
  </div>
  <div v-else-if="fileState.tree.length === 0" class="text-sm text-muted-foreground py-2 px-2">
    暂无文档
  </div>
  <div v-else class="space-y-0.5 py-1">
    <component :is="node" v-for="node in fileTreeNodes" :key="node.key" />
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add ui/components/layout/FileTree.vue
git commit -m "feat: extract FileTree component from Sidebar"
```

---

### Task 5: 修改 Sidebar.vue

**Files:**
- Modify: `ui/components/layout/Sidebar.vue`

- [ ] **Step 1: 移除文件树相关代码，简化 Sidebar**

```vue
<!-- components/layout/Sidebar.vue -->
<script setup lang="ts">
import { File } from 'lucide-vue-next'
import { useProject } from '~/composables/useProject'
import { useFileTree } from '~/composables/useFileTree'
import { useWebSocket } from '~/composables/useWebSocket'

const activeTab = ref('wiki')
const { state: projectState, fetchProjects, activateProject } = useProject()
const { fetchTree } = useFileTree()
const { state: wsState, connect } = useWebSocket()

// 当前选中的项目
const selectedProjectId = computed({
  get: () => projectState.activeProject?.id || '',
  set: async (id: string) => {
    if (id) {
      await activateProject(id)
      await fetchTree()
    }
  }
})

// 项目切换时重新加载
watch(() => projectState.activeProject, () => {
  fetchTree()
})

// WebSocket 消息处理
onMounted(() => {
  fetchProjects()
  fetchTree()
  connect((msg) => {
    if (msg.type === 'file:changed' || msg.type === 'file:added' || msg.type === 'file:deleted') {
      fetchTree()
    }
  })
})
</script>

<template>
  <UiSidebar collapsible="icon">
    <UiSidebarHeader>
      <UiSidebarMenu>
        <UiSidebarMenuItem>
          <UiSidebarMenuButton size="lg" class="flex items-center gap-2">
            <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <File class="size-4" />
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">Wiki Viewer</span>
            </div>
          </UiSidebarMenuButton>
        </UiSidebarMenuItem>
      </UiSidebarMenu>
    </UiSidebarHeader>

    <UiSidebarContent>
      <!-- 项目选择 -->
      <UiSidebarGroup>
        <UiSidebarGroupLabel>项目</UiSidebarGroupLabel>
        <UiSidebarGroupContent>
          <select
            v-model="selectedProjectId"
            class="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="" disabled>选择项目</option>
            <option v-for="p in projectState.projects" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </UiSidebarGroupContent>
      </UiSidebarGroup>

      <!-- 导航 -->
      <UiSidebarGroup>
        <UiSidebarGroupLabel>导航</UiSidebarGroupLabel>
        <UiSidebarGroupContent>
          <UiSidebarMenu>
            <UiSidebarMenuItem>
              <NuxtLink to="/wiki">
                <UiSidebarMenuButton
                  :isActive="activeTab === 'wiki'"
                  @click="activeTab = 'wiki'"
                >
                  <File class="h-4 w-4" />
                  <span>Wiki 文档</span>
                </UiSidebarMenuButton>
              </NuxtLink>
            </UiSidebarMenuItem>
            <UiSidebarMenuItem>
              <UiSidebarMenuButton disabled class="opacity-50">
                <span>Plan 计划</span>
                <span class="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">敬请期待</span>
              </UiSidebarMenuButton>
            </UiSidebarMenuItem>
          </UiSidebarMenu>
        </UiSidebarGroupContent>
      </UiSidebarGroup>
    </UiSidebarContent>

    <UiSidebarFooter>
      <div class="flex items-center gap-2 text-xs text-muted-foreground p-2">
        <span
          class="w-2 h-2 rounded-full"
          :class="wsState.isConnected ? 'bg-green-500' : 'bg-red-500'"
        />
        <span>{{ wsState.isConnected ? '实时监听中' : '未连接' }}</span>
      </div>
    </UiSidebarFooter>

    <UiSidebarRail />
  </UiSidebar>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add ui/components/layout/Sidebar.vue
git commit -m "refactor: simplify Sidebar, remove file tree logic"
```

---

### Task 6: 修改 pages/index.vue

**Files:**
- Modify: `ui/pages/index.vue`

- [ ] **Step 1: 简化 index.vue，添加重定向**

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
// 重定向到 /wiki
definePageMeta({
  redirect: '/wiki'
})
</script>

<template>
  <div></div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add ui/pages/index.vue
git commit -m "feat: redirect root path to /wiki"
```

---

### Task 7: 验证与测试

- [ ] **Step 1: 启动开发服务器**

Run: `cd ui && pnpm dev`

- [ ] **Step 2: 手动测试路由功能**

测试项：
1. 访问 `/` 应自动跳转到 `/wiki`
2. 访问 `/wiki` 应显示文件树 + 空白内容区
3. 点击文件应跳转到 `/wiki/{path}` 并显示内容
4. Ctrl/Cmd + 点击文件应在新建标签页打开
5. 文件选中状态应正确高亮
6. 浏览器前进/后退应正常工作

- [ ] **Step 3: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: resolve routing issues"
```

---

### Task 8: 清理与最终提交

- [ ] **Step 1: 检查所有变更**

Run: `git status`
Expected: 所有变更已提交

- [ ] **Step 2: 查看提交历史**

Run: `git log --oneline -10`
Expected: 显示本次实现的提交记录