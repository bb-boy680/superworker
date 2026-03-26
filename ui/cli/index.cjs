#!/usr/bin/env node

const { spawn, fork } = require('child_process')
const path = require('path')
const fs = require('fs')

// 解析命令行参数
const args = process.argv.slice(2)
const showUI = args.includes('--ui') || args.includes('-u')
const showHelp = args.includes('--help') || args.includes('-h')
const portArg = args.find(a => a.startsWith('--port=') || a.startsWith('-p='))
const port = portArg ? portArg.split('=')[1] : '3000'

if (showHelp) {
  console.log(`
auto-worker - AI Auto Worker CLI

Usage:
  auto-worker --ui              Start UI dashboard
  auto-worker --ui <path>       Start UI for specific directory
  auto-worker -u                Start UI dashboard (short)
  auto-worker --help            Show this help message

Options:
  --port, -p <port>             Specify port (default: 3000)

Examples:
  cd /path/to/your/project
  auto-worker --ui              Start UI for current directory

  auto-worker --ui D:/projects/myproject   Start UI for specific project
`)
  process.exit(0)
}

if (showUI) {
  // 获取目标目录
  const targetArg = args.find(a => !a.startsWith('-'))
  const targetDir = targetArg || process.cwd()
  const absolutePath = path.resolve(targetDir)

  // 检查目录是否存在
  if (!fs.existsSync(absolutePath)) {
    console.error(`[auto-worker] Error: Directory not found: ${absolutePath}`)
    process.exit(1)
  }

  // 检查/创建 .worker 目录
  const workerDir = path.join(absolutePath, '.worker')
  if (!fs.existsSync(workerDir)) {
    console.log(`[auto-worker] Creating .worker directory at ${workerDir}`)
    fs.mkdirSync(workerDir, { recursive: true })
  }

  // 设置环境变量
  process.env.WORKER_PROJECT_PATH = absolutePath
  process.env.WORKER_DIR = workerDir
  process.env.NUXT_PORT = port

  const projectName = path.basename(absolutePath)
  console.log('')
  console.log('╔════════════════════════════════════════════╗')
  console.log('║         AI Auto Worker - Wiki Viewer       ║')
  console.log('╚════════════════════════════════════════════╝')
  console.log('')
  console.log(`[auto-worker] Project: ${projectName}`)
  console.log(`[auto-worker] Path: ${absolutePath}`)
  console.log(`[auto-worker] Worker: ${workerDir}`)
  console.log(`[auto-worker] Port: ${port}`)
  console.log('')

  // 获取 UI 目录
  const uiDir = __dirname

  // 检查是否有构建输出
  const hasBuild = fs.existsSync(path.join(uiDir, '.output'))

  if (hasBuild) {
    // 生产模式：使用构建输出
    console.log('[auto-worker] Starting in production mode...')
    const serverPath = path.join(uiDir, '.output', 'server', 'index.mjs')

    const server = fork(serverPath, [], {
      stdio: 'inherit',
      env: {
        ...process.env,
        HOST: '0.0.0.0',
        PORT: port,
        WORKER_PROJECT_PATH: absolutePath,
        WORKER_DIR: workerDir,
      },
    })

    server.on('error', (err) => {
      console.error('[auto-worker] Failed to start:', err)
      process.exit(1)
    })

    server.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[auto-worker] Process exited with code ${code}`)
      }
      process.exit(code || 0)
    })
  } else {
    // 开发模式：使用 nuxt dev
    console.log('[auto-worker] Starting in development mode...')
    console.log('[auto-worker] Press Ctrl+C to stop')
    console.log('')

    const nuxt = spawn('pnpm', ['dev'], {
      cwd: uiDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NUXT_PORT: port,
        WORKER_PROJECT_PATH: absolutePath,
        WORKER_DIR: workerDir,
      },
      shell: true
    })

    nuxt.on('error', (err) => {
      console.error('[auto-worker] Failed to start:', err)
      process.exit(1)
    })

    nuxt.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[auto-worker] Process exited with code ${code}`)
      }
      process.exit(code || 0)
    })
  }
} else {
  console.log('[auto-worker] Use --ui to start the UI dashboard')
  console.log('[auto-worker] Run auto-worker --help for more information')
}