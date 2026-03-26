// plugins/markstream.client.ts
import { setCustomComponents, enableMermaid } from 'markstream-vue'
import CodeBlock from '~/components/wiki/CodeBlock.vue'

export default defineNuxtPlugin(() => {
  // 启用 Mermaid 图表渲染
  enableMermaid()

  // 配置代码块使用自定义渲染器（带 Shiki 语法高亮）
  setCustomComponents('wiki-viewer', {
    code_block: CodeBlock,
  })
})