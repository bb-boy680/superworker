<!-- components/layout/FileTree.vue -->
<script lang="ts">
import { defineComponent, h, computed, reactive, readonly } from 'vue'
import { File, Folder, FolderOpen, ChevronRight } from 'lucide-vue-next'
import { useFileTree } from '~/composables/useFileTree'
import type { FileNode } from '~/types'

// 递归渲染函数
function renderNode(
  node: FileNode,
  level: number,
  currentPath: string | null,
  expandedFolders: ReadonlySet<string>,
  onFileClick: (path: string, e: MouseEvent) => void,
  onToggleFolder: (path: string) => void
): any {
  const paddingLeft = level * 30 + 8
  const isSelected = currentPath === node.path
  const isExpanded = expandedFolders.has(node.path)

  if (node.type === 'file') {
    return h('button', {
      key: node.path,
      class: [
        'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left',
        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground'
      ],
      style: { paddingLeft: `${paddingLeft}px` },
      onClick: (e: MouseEvent) => onFileClick(node.path, e)
    }, [
      h(File, { class: 'h-4 w-4 shrink-0' }),
      h('span', { class: 'truncate' }, node.name)
    ])
  }

  // 文件夹节点
  return h('div', { key: node.path, class: 'folder-node' }, [
    h('button', {
      class: 'w-full flex items-center gap-1 px-2 py-1.5 text-sm rounded-md transition-colors text-left hover:bg-accent hover:text-accent-foreground',
      style: { paddingLeft: `${paddingLeft}px` },
      onClick: () => onToggleFolder(node.path)
    }, [
      h(ChevronRight, {
        class: ['h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-90']
      }),
      isExpanded
        ? h(FolderOpen, { class: 'h-4 w-4 shrink-0 text-muted-foreground' })
        : h(Folder, { class: 'h-4 w-4 shrink-0 text-muted-foreground' }),
      h('span', { class: 'truncate font-medium' }, node.name)
    ]),
    ...(node.children && isExpanded
      ? [
        h('div', {
          class: 'relative ml-[calc(var(--level)*16+24px)]',
          style: { '--level': level }
        }, [
          h('div', { class: 'absolute left-0 top-0 bottom-0 w-px bg-border/50' }),
          ...node.children.map((child: FileNode) =>
            renderNode(child, level + 1, currentPath, expandedFolders, onFileClick, onToggleFolder)
          )
        ])
      ]
      : [])
  ])
}

export default defineComponent({
  name: 'FileTree',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const { state: fileState, toggleFolder, loadFile } = useFileTree()

    const currentPath = computed(() => fileState.currentPath)

    function handleFileClick(filePath: string, event: MouseEvent) {
      const path = `/wiki/${filePath}`
      if (event.metaKey || event.ctrlKey) {
        window.open(path, '_blank')
      } else {
        loadFile(filePath)
        history.replaceState(null, '', path)
      }
    }

    return () =>
      h('div', { class: 'space-y-0.5 py-1' },
        fileState.tree.map((node: FileNode) =>
          renderNode(
            node,
            0,
            currentPath.value,
            fileState.expandedFolders,
            handleFileClick,
            toggleFolder
          )
        )
      )
  }
})
</script>