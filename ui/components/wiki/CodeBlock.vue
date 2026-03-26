<!-- components/wiki/CodeBlock.vue -->
<script setup lang="ts">
import { MarkdownCodeBlockNode } from 'markstream-vue'

const props = defineProps<{
  node: {
    type: 'code_block'
    lang?: string
    value: string
    props?: Record<string, any>
  }
}>()
</script>

<template>
  <MarkdownCodeBlockNode
    :node="node"
    theme="vitesse-dark"
    :word-wrap="true"
    :show-copy-button="true"
  />
</template>