// SSE 客户端管理
interface SSEClient {
  send: (data: string) => void
}

let connectedClients: Set<SSEClient> = new Set()

export function addClient(client: SSEClient) {
  connectedClients.add(client)
  console.log(`[SSE] Client connected, total: ${connectedClients.size}`)
}

export function removeClient(client: SSEClient) {
  connectedClients.delete(client)
  console.log(`[SSE] Client disconnected, total: ${connectedClients.size}`)
}

export function broadcast(type: string, filePath: string) {
  const message = JSON.stringify({
    type,
    payload: {
      path: filePath,
      timestamp: Date.now(),
    },
  })

  connectedClients.forEach((client) => {
    try {
      client.send(message)
    } catch (e) {
      connectedClients.delete(client)
    }
  })
}