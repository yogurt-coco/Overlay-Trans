import { useEffect, useState } from 'react'
import type { ShortcutTriggeredPayload } from '../electron/shared/ipc'
import './App.css'

/**
 * 任务 1-1 系统胶水能力自检面板（非翻译业务 UI）。
 * 仅用于验证：preload 暴露的 overlayAPI、全局快捷键事件推送、窗口控制 IPC 是否连通。
 * 翻译主界面 / 设置页在任务 1-2 搭建。
 */
function App() {
  const [version, setVersion] = useState<string>('未知')
  const [lastShortcut, setLastShortcut] = useState<ShortcutTriggeredPayload | null>(null)
  const [triggerCount, setTriggerCount] = useState(0)

  useEffect(() => {
    // 订阅全局快捷键触发事件（主进程 -> 渲染进程）
    const unsubscribe = window.overlayAPI.onShortcutTriggered((payload) => {
      setLastShortcut(payload)
      setTriggerCount((count) => count + 1)
    })

    window.overlayAPI.getAppVersion().then(setVersion).catch(() => setVersion('获取失败'))

    return unsubscribe
  }, [])

  return (
    <div style={{ padding: 24, textAlign: 'left', maxWidth: 640, margin: '0 auto' }}>
      <h1>Overlay Trans · 任务 1-1 系统能力自检</h1>
      <p>当前应用版本：{version}</p>
      <p>
        全局快捷键 <code>Ctrl+T</code> 触发次数：<strong>{triggerCount}</strong>
      </p>
      {lastShortcut && (
        <p>
          最近一次触发：{lastShortcut.shortcutId} / {lastShortcut.accelerator} /{' '}
          {new Date(lastShortcut.timestamp).toLocaleTimeString()}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={() => window.overlayAPI.hideMainWindow()}>隐藏到托盘</button>
        <button onClick={() => window.overlayAPI.quitApp()}>退出应用</button>
      </div>
      <p style={{ marginTop: 24, color: '#888' }}>
        提示：关闭主窗口不会退出程序，会驻留系统托盘；右键托盘图标可「显示主窗口 / 退出」。
      </p>
    </div>
  )
}

export default App
