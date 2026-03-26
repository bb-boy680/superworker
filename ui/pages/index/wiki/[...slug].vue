<script setup lang="ts">
import { useFileTree } from '~/composables/useFileTree'

const route = useRoute()
const { state: fileState, loadFile, clearContent } = useFileTree()

// 只在初始加载时从路由读取文件路径
onMounted(() => {
  const slug = route.params.slug
  const path = slug && Array.isArray(slug) && slug.length > 0
    ? slug.join('/')
    : null
  if (path) {
    loadFile(path)
  } else {
    clearContent()
  }
})
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
        :content="fileState.fileContent"
      />
    </div>
  </div>
</template>
