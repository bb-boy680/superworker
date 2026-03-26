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
    <!-- 左侧：文件树，独立滚动 -->
    <aside class="w-64 border-r shrink-0 overflow-y-auto h-full">
      <LayoutFileTree />
    </aside>

    <!-- 右侧：Markdown 渲染区，独立滚动 -->
    <div class="flex-1 overflow-y-auto h-full">
      <WikiMarkdownViewer
        v-if="fileState.fileContent"
        :content="fileState.fileContent"
      />
    </div>
  </div>
</template>