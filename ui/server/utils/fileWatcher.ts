import chokidar from 'chokidar'
import type { FSWatcher } from 'chokidar'
import { broadcast } from './sseClients'

let watcher: FSWatcher | null = null

export function startWatcher(projectPath: string) {
  stopWatcher()
  const workerDir = `${projectPath}/.worker`

  watcher = chokidar.watch(workerDir, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  })

  watcher
    .on('add', (filePath) => broadcast('file:added', filePath))
    .on('change', (filePath) => broadcast('file:changed', filePath))
    .on('unlink', (filePath) => broadcast('file:deleted', filePath))

  console.log(`[Watcher] Started watching: ${workerDir}`)
}

export function stopWatcher() {
  if (watcher) {
    watcher.close()
    watcher = null
    console.log('[Watcher] Stopped')
  }
}