/**
 * IPC 统一类型定义
 * Shared IPC type definitions
 *
 * 约定：主进程 (main) 与渲染进程 (renderer) 共用本文件。
 * 任何频道 / 入参 / 返回值类型的修改，都必须两边同步更新。
 * Contract: this file is shared by the main and renderer processes. Any change to a channel,
 * its arguments or its return type must be applied on both sides.
 *
 * 分层职责（严格遵守） / Layer responsibilities (strictly enforced):
 * - 主进程：仅系统胶水能力（托盘、窗口生命周期、全局快捷键）
 *   Main process: system glue only (tray, window lifecycle, global shortcuts)
 * - 渲染进程：全部 UI、网络请求、翻译业务逻辑
 *   Renderer process: all UI, network requests and translation business logic
 * - preload：通过 contextBridge 把系统接口安全暴露给渲染进程
 *   Preload: safely expose the system API to the renderer via contextBridge
 */

/** 所有 IPC 频道名常量，避免主/渲染进程硬编码字符串
 * All IPC channel names as constants, so neither process hard-codes strings */
export const IpcChannel = {
  /** main -> renderer：全局快捷键被触发（事件推送） · global shortcut fired (push event) */
  ShortcutTriggered: 'overlay:shortcut-triggered',
  /** renderer -> main：显示并聚焦主窗口（设置/历史入口） · show and focus the main window (settings/history) */
  WindowShow: 'window:show',
  /** renderer -> main：隐藏主窗口（驻留托盘） · hide the main window (stay in the tray) */
  WindowHide: 'window:hide',
  /** renderer -> main：显示并聚焦悬浮翻译窗口 · show and focus the overlay window */
  OverlayShow: 'overlay:show',
  /** renderer -> main：隐藏悬浮翻译窗口（ESC 关闭） · hide the overlay window (ESC) */
  OverlayHide: 'overlay:hide',
  /** renderer -> main：切换悬浮翻译窗口显示/隐藏 · toggle overlay visibility */
  OverlayToggle: 'overlay:toggle',
  /** renderer -> main：退出应用 · quit the application */
  AppQuit: 'app:quit',
  /** renderer -> main：读取应用版本号 · read the application version */
  AppGetVersion: 'app:get-version',
} as const

export type IpcChannelValue = (typeof IpcChannel)[keyof typeof IpcChannel]

/** 已注册的全局快捷键标识（P0 仅一个：唤起/切换悬浮窗）
 * Identifier of a registered global shortcut (P0 has exactly one: toggle the overlay) */
export type ShortcutId = 'toggle-overlay'

/** 全局快捷键触发时，主进程推送给渲染进程的载荷
 * Payload the main process pushes to the renderer when a global shortcut fires */
export interface ShortcutTriggeredPayload {
  /** 触发的快捷键标识 · which shortcut fired */
  shortcutId: ShortcutId
  /** Electron 加速键字符串，例如 "CommandOrControl+T" · Electron accelerator string */
  accelerator: string
  /** 触发时间戳（毫秒） · trigger timestamp in milliseconds */
  timestamp: number
}

/**
 * preload 通过 contextBridge 暴露到 `window.overlayAPI` 的接口契约。
 * 主进程实现对应 handler，渲染进程按此类型调用。
 *
 * The API contract preload exposes on `window.overlayAPI` via contextBridge.
 * The main process implements the matching handlers; the renderer calls through this type.
 */
export interface OverlayApi {
  /** 订阅全局快捷键触发事件，返回取消订阅函数
   * Subscribe to global-shortcut events; returns the unsubscribe function */
  onShortcutTriggered: (callback: (payload: ShortcutTriggeredPayload) => void) => () => void
  /** 显示并聚焦主窗口（设置/历史入口） · show and focus the main window */
  showMainWindow: () => Promise<void>
  /** 隐藏主窗口（驻留系统托盘） · hide the main window (stay in the tray) */
  hideMainWindow: () => Promise<void>
  /** 显示并聚焦悬浮翻译窗口 · show and focus the overlay window */
  showOverlay: () => Promise<void>
  /** 隐藏悬浮翻译窗口（ESC 关闭） · hide the overlay window (ESC) */
  hideOverlay: () => Promise<void>
  /** 切换悬浮翻译窗口显示/隐藏 · toggle overlay visibility */
  toggleOverlay: () => Promise<void>
  /** 退出应用 · quit the application */
  quitApp: () => Promise<void>
  /** 获取应用版本号 · get the application version */
  getAppVersion: () => Promise<string>
}
