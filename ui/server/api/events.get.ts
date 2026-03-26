import { eventHandler, setHeaders } from 'h3'
import { getActiveProject } from '../utils/projectStore'
import { addClient, removeClient, broadcast } from '../utils/sseClients'

export default eventHandler((event) => {
  setHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const client = {
    send: (data: string) => {
      try {
        event.node.res.write(`data: ${data}\n\n`)
      } catch (e) {
        // Client disconnected
      }
    },
  }

  addClient(client)

  // 启动文件监听
  const project = getActiveProject()
  if (project) {
    import('../utils/fileWatcher').then(({ startWatcher }) => {
      startWatcher(project.path)
    })
  }

  // 保持连接
  const keepAlive = setInterval(() => {
    try {
      event.node.res.write(': keepalive\n\n')
    } catch (e) {
      clearInterval(keepAlive)
      removeClient(client)
    }
  }, 30000)

  // 清理
  event.node.req.on('close', () => {
    clearInterval(keepAlive)
    removeClient(client)
  })

  // 返回一个空的响应体，让连接保持打开
  return ''
})