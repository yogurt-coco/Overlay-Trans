import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import OverlayPage from './pages/OverlayPage'
import SettingsPage from './pages/SettingsPage'

/**
 * 渲染进程路由（HashRouter）
 * Renderer routing (HashRouter)
 *
 * 主窗口加载 `#/`（设置页），悬浮窗加载 `#/overlay`（翻译主界面）。
 * 两个窗口是同源的独立渲染进程，通过 hash 路由区分承载的页面。
 * P0 不含历史页面（历史在 P1 任务 2-2）。
 *
 * The main window loads `#/` (settings), the overlay loads `#/overlay` (translation UI).
 * Both windows are separate same-origin renderers; the hash route selects the page.
 * P0 has no history page (history comes in P1, task 2-2).
 */
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SettingsPage />} />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
