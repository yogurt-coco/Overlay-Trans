import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { IpcChannel, type ShortcutTriggeredPayload } from './shared/ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const isDev = !!VITE_DEV_SERVER_URL

/** P0 默认全局快捷键：唤起 / 切换悬浮窗 */
const TOGGLE_OVERLAY_ACCELERATOR = 'CommandOrControl+T'

let win: BrowserWindow | null = null
let tray: Tray | null = null
/** 标记是否正在真正退出（区分「关闭到托盘」与「退出应用」） */
let isQuitting = false

function getWindowIcon() {
  return path.join(process.env.VITE_PUBLIC, 'tray-icon.png')
}

function createWindow() {
  win = new BrowserWindow({
    icon: getWindowIcon(),
    width: 900,
    height: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // 关闭主窗口时不退出进程，仅隐藏到系统托盘后台驻留。
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win?.hide()
    }
  })

  win.on('closed', () => {
    win = null
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // 开发模式下自动弹出窗口，便于验证 IPC 与快捷键链路；
  // 生产模式遵循产品流程：启动即后台托盘驻留，不占用主窗口。
  if (isDev) {
    win.once('ready-to-show', () => win?.show())
  }
}

function showMainWindow() {
  if (!win) {
    createWindow()
    return
  }
  win.show()
  win.focus()
}

function hideMainWindow() {
  win?.hide()
}

/** 全局快捷键触发：推送事件给渲染进程，并唤起主窗口（P0 骨架行为） */
function handleShortcutTriggered() {
  const payload: ShortcutTriggeredPayload = {
    shortcutId: 'toggle-overlay',
    accelerator: TOGGLE_OVERLAY_ACCELERATOR,
    timestamp: Date.now(),
  }
  win?.webContents.send(IpcChannel.ShortcutTriggered, payload)
  showMainWindow()
}

function createTray() {
  // Windows 托盘图标缩放到 16x16，避免过大模糊
  const icon = nativeImage.createFromPath(getWindowIcon()).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Overlay Trans')

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => showMainWindow() },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)
  // 单击托盘图标同样唤起主窗口
  tray.on('click', () => showMainWindow())
}

function registerShortcuts() {
  const ok = globalShortcut.register(TOGGLE_OVERLAY_ACCELERATOR, handleShortcutTriggered)
  if (!ok) {
    console.warn(`[Overlay Trans] 全局快捷键注册失败：${TOGGLE_OVERLAY_ACCELERATOR}`)
  }
}

function registerIpcHandlers() {
  ipcMain.handle(IpcChannel.WindowShow, () => showMainWindow())
  ipcMain.handle(IpcChannel.WindowHide, () => hideMainWindow())
  ipcMain.handle(IpcChannel.AppQuit, () => {
    isQuitting = true
    app.quit()
  })
  ipcMain.handle(IpcChannel.AppGetVersion, () => app.getVersion())
}

// 单实例锁：托盘常驻应用避免重复启动，第二次启动时唤起已有窗口
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())

  app.whenReady().then(() => {
    registerIpcHandlers()
    createWindow()
    createTray()
    registerShortcuts()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      } else {
        showMainWindow()
      }
    })
  })
}

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// 关闭全部窗口时：因采用「隐藏到托盘」策略，正常不会触发销毁；
// 真正退出（isQuitting）时按平台惯例处理。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit()
  }
})
