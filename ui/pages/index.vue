<script setup lang="ts">
import { useFileTree } from '~/composables/useFileTree'

const { state: fileState } = useFileTree()
</script>

<template>
  <UiSidebarProvider>
    <LayoutSidebar />

    <UiSidebarInset class="h-screen">
      <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <UiSidebarTrigger class="-ml-1" />
        <div class="text-sm text-muted-foreground">
          Wiki
          <span v-if="fileState.currentPath" class="text-foreground font-medium">
            / {{ fileState.currentPath }}
          </span>
        </div>
        <span v-if="fileState.isLoading" class="ml-2 text-xs text-primary">加载中...</span>
      </header>

      <main class="flex-1 overflow-hidden">
        <NuxtPage />
      </main>
    </UiSidebarInset>
  </UiSidebarProvider>
</template>