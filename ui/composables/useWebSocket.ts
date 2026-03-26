// composables/useWebSocket.ts - 使用 SSE (Server-Sent Events) 替代 WebSocket
import type { WSMessage } from '~/types'

const state = reactive({
  isConnected: false,
  lastMessage: null as WSMessage | null,
})

export function useWebSocket() {
  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connect(onMessage?: (msg: WSMessage) => void) {
    if (eventSource) return

    eventSource = new EventSource('/api/events')

    eventSource.onopen = () => {
      state.isConnected = true
      console.log('[SSE] Connected')
    }

    eventSource.onclose = () => {
      state.isConnected = false
      console.log('[SSE] Disconnected')
      eventSource = null
      // 自动重连
      reconnectTimer = setTimeout(() => connect(onMessage), 3000)
    }

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage
        state.lastMessage = message
        onMessage?.(message)
      } catch (e) {
        // 忽略非 JSON 消息（如 keepalive）
      }
    }

    eventSource.onerror = (error) => {
      console.error('[SSE] Error:', error)
      eventSource?.close()
      eventSource = null
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }
    eventSource?.close()
    eventSource = null
  }

  return {
    state: readonly(state),
    connect,
    disconnect,
  }
}