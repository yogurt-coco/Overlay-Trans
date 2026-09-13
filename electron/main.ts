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

/** P0 默认全局快捷键：唤起 / 切换悬浮窗 · P0 default global shortcut: show/toggle the overlay */
const TOGGLE_OVERLAY_ACCELERATOR = 'CommandOrControl+T'

let win: BrowserWindow | null = null
let overlayWin: BrowserWindow | null = null
let tray: Tray | null = null
/** 标记是否正在真正退出（区分「关闭到托盘」与「退出应用」）
 * Whether the app is really quitting (distinguishes "close to tray" from "quit app") */
let isQuitting = false

function getWindowIcon() {
  return path.join(process.env.VITE_PUBLIC, 'tray-icon.png')
}

/** 统一的渲染页加载：按路由 hash 区分主窗口(设置)与悬浮窗(翻译)
 * Single renderer loader: the route hash selects the main window (settings) or the overlay
 * (translation). */
function loadRenderer(target: BrowserWindow, route: string) {
  if (VITE_DEV_SERVER_URL) {
    target.loadURL(`${VITE_DEV_SERVER_URL}#${route}`)
  } else {
    target.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: route })
  }
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
  // Closing the main window does not quit the process; it just hides to the system tray.
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win?.hide()
    }
  })

  win.on('closed', () => {
    win = null
  })

  loadRenderer(win, '/')

  // 开发模式下自动弹出窗口，便于验证 IPC 与快捷键链路；
  // 生产模式遵循产品流程：启动即后台托盘驻留，不占用主窗口。
  // In dev the window pops up automatically so the IPC/shortcut path is easy to verify;
  // in production the app follows the product flow: start silently in the tray.
  if (isDev) {
    win.once('ready-to-show', () => win?.show())
  }
}

function showMainWindow() {
  if (!win || win.isDestroyed()) {
    createWindow()
    return
  }
  win.show()
  win.focus()
}

function hideMainWindow() {
  win?.hide()
}

/** 创建悬浮翻译窗口：无边框、置顶、可拖拽（拖拽由渲染层 CSS -webkit-app-region 实现）
 * Create the floating translation window: frameless, always on top, draggable (dragging comes
 * from the renderer CSS `-webkit-app-region`). */
function createOverlayWindow() {
  overlayWin = new BrowserWindow({
    icon: getWindowIcon(),
    width: 420,
    height: 280,
    frame: false,
    transparent: false,
    resizable: true,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // 提升到屏幕保护层级，确保叠加在游戏画面之上
  // Raise to the screen-saver level so the overlay stays above full-screen games
  overlayWin.setAlwaysOnTop(true, 'screen-saver')

  // 关闭悬浮窗时仅隐藏，不销毁，便于下次快速唤起
  // Closing the overlay only hides it (no destroy) so the next invocation is instant
  overlayWin.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      overlayWin?.hide()
    }
  })

  overlayWin.on('closed', () => {
    overlayWin = null
  })

  loadRenderer(overlayWin, '/overlay')
}

function showOverlay() {
  if (!overlayWin || overlayWin.isDestroyed()) {
    createOverlayWindow()
  }
  overlayWin?.show()
  overlayWin?.focus()
}

function hideOverlay() {
  overlayWin?.hide()
}

function toggleOverlay() {
  if (overlayWin && !overlayWin.isDestroyed() && overlayWin.isVisible()) {
    hideOverlay()
  } else {
    showOverlay()
  }
}

/** 全局快捷键触发：唤起悬浮翻译窗，并推送事件给悬浮窗渲染进程（P0：1-3 将据此读剪贴板并翻译）
 * Global shortcut handler: shows the overlay and pushes the event to its renderer (in P0,
 * task 1-3 will use it to read the clipboard and translate). */
function handleShortcutTriggered() {
  const payload: ShortcutTriggeredPayload = {
    shortcutId: 'toggle-overlay',
    accelerator: TOGGLE_OVERLAY_ACCELERATOR,
    timestamp: Date.now(),
  }
  if (!overlayWin || overlayWin.isDestroyed()) {
    createOverlayWindow()
  }
  if (overlayWin) {
    // 若窗口刚创建、页面尚未就绪，等加载完成后再推送，避免事件丢失
    // If the window was just created and the page is not ready yet, wait for the load to
    // finish before sending, so the event is not lost
    if (overlayWin.webContents.isLoading()) {
      overlayWin.webContents.once('did-finish-load', () => {
        overlayWin?.webContents.send(IpcChannel.ShortcutTriggered, payload)
      })
    } else {
      overlayWin.webContents.send(IpcChannel.ShortcutTriggered, payload)
    }
  }
  showOverlay()
}

function createTray() {
  // Windows 托盘图标缩放到 16x16，避免过大模糊
  // Scale the Windows tray icon to 16x16 to avoid a blurry oversized image
  const icon = nativeImage.createFromPath(getWindowIcon()).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Overlay Trans')

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示悬浮翻译窗 / Show overlay', click: () => showOverlay() },
    { label: '显示主窗口（设置） / Show main window (settings)', click: () => showMainWindow() },
    { type: 'separator' },
    {
      label: '退出 / Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)
  // 单击托盘图标唤起悬浮翻译窗
  // A single click on the tray icon brings up the overlay
  tray.on('click', () => showOverlay())
}

function registerShortcuts() {
  const ok = globalShortcut.register(TOGGLE_OVERLAY_ACCELERATOR, handleShortcutTriggered)
  if (!ok) {
    console.warn(
      `[Overlay Trans] 全局快捷键注册失败 / failed to register global shortcut: ${TOGGLE_OVERLAY_ACCELERATOR}`,
    )
  }
}

function registerIpcHandlers() {
  ipcMain.handle(IpcChannel.WindowShow, () => showMainWindow())
  ipcMain.handle(IpcChannel.WindowHide, () => hideMainWindow())
  ipcMain.handle(IpcChannel.OverlayShow, () => showOverlay())
  ipcMain.handle(IpcChannel.OverlayHide, () => hideOverlay())
  ipcMain.handle(IpcChannel.OverlayToggle, () => toggleOverlay())
  ipcMain.handle(IpcChannel.AppQuit, () => {
    isQuitting = true
    app.quit()
  })
  ipcMain.handle(IpcChannel.AppGetVersion, () => app.getVersion())
}

// 单实例锁：托盘常驻应用避免重复启动，第二次启动时唤起已有窗口
// Single-instance lock: a tray-resident app must not start twice; a second launch focuses the
// existing window instead
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
// "window-all-closed": with the hide-to-tray strategy windows are normally never destroyed;
// on a real quit (isQuitting) follow the platform convention.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit()
  }
})
