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