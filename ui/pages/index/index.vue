<script setup lang="ts">
// 默认子路由，重定向到 /wiki
definePageMeta({
  middleware: [
    () => navigateTo('/wiki')
  ]
})
</script>

<template>
  <div></div>
</template>