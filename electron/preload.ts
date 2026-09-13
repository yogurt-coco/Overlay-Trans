import { ipcRenderer, contextBridge } from 'electron'
import { IpcChannel, type OverlayApi, type ShortcutTriggeredPayload } from './shared/ipc'

/**
 * preload 预加载脚本
 * Preload script
 *
 * 仅通过 contextBridge 把主进程的系统胶水能力，安全地暴露给渲染进程。
 * 不在这里写任何翻译业务逻辑；所有业务由渲染进程 React/TS 承担。
 *
 * Uses contextBridge to safely expose only the main process' system glue to the renderer.
 * No translation business logic lives here — that all belongs to the React/TS renderer.
 */
const overlayApi: OverlayApi = {
  onShortcutTriggered: (callback: (payload: ShortcutTriggeredPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ShortcutTriggeredPayload) => {
      callback(payload)
    }
    ipcRenderer.on(IpcChannel.ShortcutTriggered, listener)
    // 返回取消订阅函数，便于 React useEffect 清理
    // Return the unsubscribe function so a React useEffect can clean up
    return () => {
      ipcRenderer.removeListener(IpcChannel.ShortcutTriggered, listener)
    }
  },
  showMainWindow: () => ipcRenderer.invoke(IpcChannel.WindowShow),
  hideMainWindow: () => ipcRenderer.invoke(IpcChannel.WindowHide),
  showOverlay: () => ipcRenderer.invoke(IpcChannel.OverlayShow),
  hideOverlay: () => ipcRenderer.invoke(IpcChannel.OverlayHide),
  toggleOverlay: () => ipcRenderer.invoke(IpcChannel.OverlayToggle),
  quitApp: () => ipcRenderer.invoke(IpcChannel.AppQuit),
  getAppVersion: () => ipcRenderer.invoke(IpcChannel.AppGetVersion),
}

contextBridge.exposeInMainWorld('overlayAPI', overlayApi)
