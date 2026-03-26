<!-- components/wiki/MarkdownViewer.vue -->
<script setup lang="ts">
import MarkdownRender from 'markstream-vue'
import 'markstream-vue/index.css'

const props = defineProps<{
  content: string
}>()
</script>

<template>
  <div class="markdown-container py-6 w-full">
    <MarkdownRender
      custom-id="wiki-viewer"
      :content="content"
    />
  </div>
</template>

<style>
/* markstream-vue 样式增强 */
.markdown-container {
  line-height: 1.7;
}

/* 使用 data-custom-id 选择器自定义样式 */
.markdown-container [data-custom-id="wiki-viewer"] {
  font-family: inherit;
}

/* 标题样式 */
.markdown-container :deep(h1) {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1rem;
  margin-top: 2rem;
  line-height: 1.3;
}

.markdown-container :deep(h1:first-child) {
  margin-top: 0;
}

.markdown-container :deep(h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  margin-top: 1.5rem;
  line-height: 1.4;
}

.markdown-container :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
}

/* 段落和文本 */
.markdown-container :deep(p) {
  margin-bottom: 1rem;
}

/* 行内代码 */
.markdown-container :deep(code:not(pre code)) {
  background: #f1f5f9;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* 代码块 */
.markdown-container :deep(pre) {
  background: #1e293b;
  color: #f1f5f9;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.markdown-container :deep(pre code) {
  background: transparent;
  padding: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* 列表 */
.markdown-container :deep(ul),
.markdown-container :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.markdown-container :deep(ul) {
  list-style: disc;
}

.markdown-container :deep(ol) {
  list-style: decimal;
}

.markdown-container :deep(li) {
  margin-bottom: 0.25rem;
}

/* 链接 */
.markdown-container :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.markdown-container :deep(a:hover) {
  color: #1d4ed8;
}

/* 引用 */
.markdown-container :deep(blockquote) {
  border-left: 4px solid #e2e8f0;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #64748b;
}

/* 表格 */
.markdown-container :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.markdown-container :deep(th),
.markdown-container :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.markdown-container :deep(th) {
  background: #f8fafc;
  font-weight: 600;
}

/* 分割线 */
.markdown-container :deep(hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 1.5rem 0;
}

/* 图片 */
.markdown-container :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}
</style>