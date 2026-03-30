# Wiki Router 设计文档

## 概述

将 Wiki 从单页面状态切换改造为 Nuxt 路由驱动，支持 URL 直接访问、浏览器前进/后退、链接分享。

## 目标

- `/wiki/{path}` 动态路由匹配完整文件路径
- 选中状态由 URL 参数驱动
- 支持普通点击路由跳转、Ctrl/Cmd+点击新标签页打开
- 预留扩展性，未来可添加其他子路由

## 文件结构

```
ui/
├── layouts/
│   └── default.vue              # 主布局（Sidebar + NuxtPage）
├── pages/
│   ├── index.vue                # 重定向到 /wiki
│   └── wiki/
│       └── [...slug].vue        # /wiki/** 动态路由
├── components/
│   ├── layout/
│   │   └── Sidebar.vue          # 侧边栏（保持不变）
│   └── wiki/
│       ├── MarkdownViewer.vue   # Markdown 渲染（保持不变）
│       └── CodeBlock.vue        # 代码块（保持不变）
└── composables/
    └── useFileTree.ts           # 简化状态管理
```

## 路由设计

| 路径 | 页面 | 行为 |
|------|------|------|
| `/` | `pages/index.vue` | 重定向到 `/wiki` |
| `/wiki` | `pages/wiki/[...slug].vue` | 显示文件树，内容区空白 |
| `/wiki/zh/android/Android平台` | `pages/wiki/[...slug].vue` | 渲染对应文件内容 |

## 布局结构

### layouts/default.vue

```
┌─────────────┬──────────────────────────────┐
│             │                              │
│   Sidebar   │      <NuxtPage />            │
│   (固定)    │      (路由内容区)             │
│             │                              │
└─────────────┴──────────────────────────────┘
```

### pages/wiki/[...slug].vue

```
┌─────────────┬──────────────────────────────┐
│             │                              │
│  文件选择树  │      Markdown 渲染           │
│             │      (未选择时空白)           │
│             │                              │
└─────────────┴──────────────────────────────┐
```

## 组件职责

### layouts/default.vue

- 渲染固定侧边栏
- 提供 `<NuxtPage />` 插槽
- 包含顶部 header（显示当前路径、加载状态）

### pages/wiki/[...slug].vue

- 两栏布局：文件树 + 内容区
- 监听路由参数变化，加载对应文件
- 未选择文件时内容区保持空白

### components/layout/Sidebar.vue

- 保持现有实现
- 文件点击时触发路由跳转

## 数据流

```
URL 参数 (slug) → 组装文件路径 → API 获取内容 → 渲染
```

1. `watch(route.params.slug)` → 组装路径
2. 调用 `/api/files/{path}` 获取内容
3. 传入 `MarkdownViewer` 渲染

## 交互细节

### 文件点击行为

```typescript
function handleFileClick(file: string, event: MouseEvent) {
  const path = `/wiki/${file}`

  if (event.metaKey || event.ctrlKey) {
    // Ctrl/Cmd + 点击：新标签页打开
    window.open(path, '_blank')
  } else {
    // 普通点击：路由跳转
    router.push(path)
  }
}
```

### 文件树选中状态

```typescript
// 当前选中文件由路由参数决定
const currentPath = computed(() => {
  const slug = route.params.slug
  return slug ? (slug as string[]).join('/') : null
})

// 高亮当前选中项
:class="{ 'bg-accent': node.path === currentPath }"
```

## useFileTree 改动

移除 `selectedFile` 状态（由路由管理），简化为：

```typescript
const state = reactive({
  tree: [] as FileNode[],
  fileContent: '',
  isLoading: false,
  error: null as string | null,
})

async function loadFile(filePath: string) {
  state.isLoading = true
  try {
    const data = await $fetch(`/api/files/${filePath}`)
    state.fileContent = data.content
  } catch (e) {
    state.error = e.message
  } finally {
    state.isLoading = false
  }
}
```

## 实现步骤

1. 创建 `layouts/default.vue`，提取公共布局
2. 创建 `pages/wiki/[...slug].vue`，实现动态路由页面
3. 修改 `pages/index.vue`，添加重定向
4. 修改 `useFileTree.ts`，简化状态管理
5. 修改 `Sidebar.vue`，更新文件点击行为
6. 测试路由跳转、选中状态、新标签页打开