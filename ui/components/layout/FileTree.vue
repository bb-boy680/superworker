<!-- components/layout/FileTree.vue -->
<script setup lang="ts">
import { File, Folder, FolderOpen, ChevronRight } from 'lucide-vue-next'
import { useFileTree } from '~/composables/useFileTree'

const route = useRoute()
const router = useRouter()
const { state: fileState, toggleFolder, loadFile } = useFileTree()

// 当前选中文件路径（从状态获取）
const currentPath = computed(() => fileState.currentPath)

// 文件点击处理
function handleFileClick(filePath: string, event: MouseEvent) {
  const path = `/wiki/${filePath}`

  if (event.metaKey || event.ctrlKey) {
    // Ctrl/Cmd + 点击：新标签页打开
    window.open(path, '_blank')
  } else {
    // 普通点击：直接加载文件，不触发路由导航
    loadFile(filePath)
    // 静默更新 URL，不触发页面刷新
    history.replaceState(null, '', path)
  }
}

// 递归渲染文件节点
function renderFileNode(node: any, level = 0) {
  const paddingLeft = level * 30 + 8
  const isExpanded = fileState.expandedFolders.has(node.path)
  const isSelected = currentPath.value === node.path

  if (node.type === 'file') {
    return h('button', {
      key: node.path,
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
  }

  // 文件夹节点
  return h('div', { key: node.path }, [
    // 文件夹按钮
    h('button', {
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
    // 子节点容器 - 添加左边距形成树形结构
    ...(node.children && isExpanded
      ? [
          h('div', {
            class: 'relative ml-[calc(var(--level)*16+24px)]',
            style: { '--level': level }
          }, [
            // 左侧缩进线
            h('div', {
              class: 'absolute left-0 top-0 bottom-0 w-px bg-border/50'
            }),
            // 子节点
            ...node.children.map((child: any) => renderFileNode(child, level + 1))
          ])
        ]
      : [])
  ])
}

const fileTreeNodes = computed(() => {
  return fileState.tree.map((node: any) => renderFileNode(node))
})
</script>

<template>
  <div class="space-y-0.5 py-1">
    <component :is="node" v-for="node in fileTreeNodes" :key="node.key" />
  </div>
</template>
