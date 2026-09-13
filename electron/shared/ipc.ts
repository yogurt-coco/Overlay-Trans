/**
 * IPC 统一类型定义
 *
 * 约定：主进程 (main) 与渲染进程 (renderer) 共用本文件。
 * 任何频道 / 入参 / 返回值类型的修改，都必须两边同步更新。
 *
 * 分层职责（严格遵守）：
 * - 主进程：仅系统胶水能力（托盘、窗口生命周期、全局快捷键）
 * - 渲染进程：全部 UI、网络请求、翻译业务逻辑
 * - preload：通过 contextBridge 把系统接口安全暴露给渲染进程
 */

/** 所有 IPC 频道名常量，避免主/渲染进程硬编码字符串 */
export const IpcChannel = {
  /** main -> renderer：全局快捷键被触发（事件推送） */
  ShortcutTriggered: 'overlay:shortcut-triggered',
  /** renderer -> main：显示并聚焦主窗口（设置/历史入口） */
  WindowShow: 'window:show',
  /** renderer -> main：隐藏主窗口（驻留托盘） */
  WindowHide: 'window:hide',
  /** renderer -> main：显示并聚焦悬浮翻译窗口 */
  OverlayShow: 'overlay:show',
  /** renderer -> main：隐藏悬浮翻译窗口（ESC 关闭） */
  OverlayHide: 'overlay:hide',
  /** renderer -> main：切换悬浮翻译窗口显示/隐藏 */
  OverlayToggle: 'overlay:toggle',
  /** renderer -> main：退出应用 */
  AppQuit: 'app:quit',
  /** renderer -> main：读取应用版本号 */
  AppGetVersion: 'app:get-version',
} as const

export type IpcChannelValue = (typeof IpcChannel)[keyof typeof IpcChannel]

/** 已注册的全局快捷键标识（P0 仅一个：唤起/切换悬浮窗） */
export type ShortcutId = 'toggle-overlay'

/** 全局快捷键触发时，主进程推送给渲染进程的载荷 */
export interface ShortcutTriggeredPayload {
  /** 触发的快捷键标识 */
  shortcutId: ShortcutId
  /** Electron 加速键字符串，例如 "CommandOrControl+T" */
  accelerator: string
  /** 触发时间戳（毫秒） */
  timestamp: number
}

/**
 * preload 通过 contextBridge 暴露到 `window.overlayAPI` 的接口契约。
 * 主进程实现对应 handler，渲染进程按此类型调用。
 */
export interface OverlayApi {
  /** 订阅全局快捷键触发事件，返回取消订阅函数 */
  onShortcutTriggered: (callback: (payload: ShortcutTriggeredPayload) => void) => () => void
  /** 显示并聚焦主窗口（设置/历史入口） */
  showMainWindow: () => Promise<void>
  /** 隐藏主窗口（驻留系统托盘） */
  hideMainWindow: () => Promise<void>
  /** 显示并聚焦悬浮翻译窗口 */
  showOverlay: () => Promise<void>
  /** 隐藏悬浮翻译窗口（ESC 关闭） */
  hideOverlay: () => Promise<void>
  /** 切换悬浮翻译窗口显示/隐藏 */
  toggleOverlay: () => Promise<void>
  /** 退出应用 */
  quitApp: () => Promise<void>
  /** 获取应用版本号 */
  getAppVersion: () => Promise<string>
}
