<!-- components/layout/Sidebar.vue -->
<script setup lang="ts">
import { File } from 'lucide-vue-next'
import { useProject } from '~/composables/useProject'
import { useFileTree } from '~/composables/useFileTree'
import { useWebSocket } from '~/composables/useWebSocket'

const activeTab = ref('wiki')
const { state: projectState, fetchProjects, activateProject } = useProject()
const { fetchTree } = useFileTree()
const { state: wsState, connect } = useWebSocket()

// 当前选中的项目
const selectedProjectId = computed({
  get: () => projectState.activeProject?.id || '',
  set: async (id: string) => {
    if (id) {
      await activateProject(id)
      await fetchTree()
    }
  }
})

// 项目切换时重新加载
watch(() => projectState.activeProject, () => {
  fetchTree()
})

// WebSocket 消息处理
onMounted(() => {
  fetchProjects()
  fetchTree()
  connect((msg) => {
    if (msg.type === 'file:changed' || msg.type === 'file:added' || msg.type === 'file:deleted') {
      fetchTree()
    }
  })
})
</script>

<template>
  <UiSidebar collapsible="icon">
    <UiSidebarHeader>
      <UiSidebarMenu>
        <UiSidebarMenuItem>
          <UiSidebarMenuButton size="lg" class="flex items-center gap-2">
            <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <File class="size-4" />
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">Wiki Viewer</span>
            </div>
          </UiSidebarMenuButton>
        </UiSidebarMenuItem>
      </UiSidebarMenu>
    </UiSidebarHeader>

    <UiSidebarContent>
      <!-- 项目选择 -->
      <UiSidebarGroup>
        <UiSidebarGroupLabel>项目</UiSidebarGroupLabel>
        <UiSidebarGroupContent>
          <select
            v-model="selectedProjectId"
            class="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="" disabled>选择项目</option>
            <option v-for="p in projectState.projects" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </UiSidebarGroupContent>
      </UiSidebarGroup>

      <!-- 导航 -->
      <UiSidebarGroup>
        <UiSidebarGroupLabel>导航</UiSidebarGroupLabel>
        <UiSidebarGroupContent>
          <UiSidebarMenu>
            <UiSidebarMenuItem>
              <NuxtLink to="/wiki">
                <UiSidebarMenuButton
                  :isActive="activeTab === 'wiki'"
                  @click="activeTab = 'wiki'"
                >
                  <File class="h-4 w-4" />
                  <span>Wiki 文档</span>
                </UiSidebarMenuButton>
              </NuxtLink>
            </UiSidebarMenuItem>
            <UiSidebarMenuItem>
              <UiSidebarMenuButton disabled class="opacity-50">
                <span>Plan 计划</span>
                <span class="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">敬请期待</span>
              </UiSidebarMenuButton>
            </UiSidebarMenuItem>
          </UiSidebarMenu>
        </UiSidebarGroupContent>
      </UiSidebarGroup>
    </UiSidebarContent>

    <UiSidebarFooter>
      <div class="flex items-center gap-2 text-xs text-muted-foreground p-2">
        <span
          class="w-2 h-2 rounded-full"
          :class="wsState.isConnected ? 'bg-green-500' : 'bg-red-500'"
        />
        <span>{{ wsState.isConnected ? '实时监听中' : '未连接' }}</span>
      </div>
    </UiSidebarFooter>

    <UiSidebarRail />
  </UiSidebar>
</template>