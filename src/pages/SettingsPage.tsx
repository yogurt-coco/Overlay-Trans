import { useEffect, useState } from 'react'
import { PROVIDER_OPTIONS, useAppConfig, type ProviderId } from '../config/AppConfigContext'
import './SettingsPage.css'

const TARGET_LANG_OPTIONS = [
  { id: 'zh-CN', label: '简体中文 / Chinese (Simplified)' },
  { id: 'zh-TW', label: '繁体中文 / Chinese (Traditional)' },
  { id: 'en', label: '英语 / English' },
  { id: 'ja', label: '日语 / Japanese' },
  { id: 'ko', label: '韩语 / Korean' },
]

/**
 * 设置页（主窗口）— 任务 1-2 UI 骨架
 * Settings page (main window) — task 1-2 UI skeleton
 *
 * P0 说明（严格遵守） / P0 rules (strictly enforced):
 * - APIKey / 服务商 / 目标语言：仅保存到内存（AppConfigProvider），程序关闭即丢失。
 *   API key / provider / target language: kept in memory only (AppConfigProvider), lost on exit.
 * - 快捷键配置：方案 A，仅 UI 占位展示，不接线、不重注册全局热键；自定义留到 P1。
 *   Shortcut setting: option A — display-only placeholder, not wired up, no hotkey
 *   re-registration; customization comes in P1.
 * - 不做任何持久化（SQLite 在 P1 任务 2-1）。
 *   No persistence at all (SQLite arrives in P1, task 2-1).
 */
function SettingsPage() {
  const { config, updateConfig } = useAppConfig()
  const [version, setVersion] = useState('')
  const [savedTip, setSavedTip] = useState('')

  useEffect(() => {
    window.overlayAPI
      .getAppVersion()
      .then(setVersion)
      .catch(() => setVersion('获取失败 / unavailable'))
  }, [])

  const handleSave = () => {
    // 内存态生效：updateConfig 已在受控输入中实时更新，这里仅给出反馈
    // Memory-only: updateConfig already applies on every controlled input change,
    // so this handler just shows feedback.
    setSavedTip('已保存到内存（P0 不持久化，关闭程序后丢失） · Saved in memory (P0 has no persistence — lost on exit)')
    window.setTimeout(() => setSavedTip(''), 3000)
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>Overlay Trans · 设置 / Settings</h1>
        <span className="settings-version">v{version || '—'}</span>
      </header>

      <section className="settings-section">
        <h2>翻译服务 / Translation service</h2>

        <label className="field">
          <span>
            大模型服务商
            <small>LLM provider</small>
          </span>
          <select
            value={config.provider}
            onChange={(e) => updateConfig({ provider: e.target.value as ProviderId })}
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>
            API Key
            <small>API key</small>
          </span>
          <input
            type="password"
            value={config.apiKey}
            placeholder="请输入 API Key（P0 仅内存保存） / Enter API key (P0: memory only)"
            onChange={(e) => updateConfig({ apiKey: e.target.value })}
          />
        </label>

        <label className="field">
          <span>
            API Base URL（可选）
            <small>API base URL (optional)</small>
          </span>
          <input
            type="text"
            value={config.apiBaseUrl}
            placeholder="留空则使用服务商默认地址 / Leave empty to use the provider default"
            onChange={(e) => updateConfig({ apiBaseUrl: e.target.value })}
          />
        </label>

        <label className="field">
          <span>
            翻译目标语言
            <small>Target language</small>
          </span>
          <select
            value={config.targetLang}
            onChange={(e) => updateConfig({ targetLang: e.target.value })}
          >
            {TARGET_LANG_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="settings-section">
        <h2>快捷键 / Keyboard shortcut</h2>
        <label className="field">
          <span>
            唤起悬浮窗
            <small>Toggle overlay window</small>
          </span>
          <input type="text" value={config.shortcutLabel} readOnly className="readonly" />
        </label>
        <p className="hint">
          P0 仅展示默认快捷键 Ctrl+T，自定义配置将在 P1（含持久化）开放。
          <br />
          P0 only displays the default shortcut Ctrl+T; customization arrives in P1 (together
          with persistence).
        </p>
      </section>

      <div className="settings-actions">
        <button className="primary" onClick={handleSave}>
          保存（内存） / Save (memory)
        </button>
        <button onClick={() => window.overlayAPI.showOverlay()}>
          打开悬浮翻译窗 / Open overlay
        </button>
        <button onClick={() => window.overlayAPI.hideMainWindow()}>
          隐藏到托盘 / Hide to tray
        </button>
        <button className="danger" onClick={() => window.overlayAPI.quitApp()}>
          退出应用 / Quit app
        </button>
      </div>

      {savedTip && <div className="settings-tip">{savedTip}</div>}

      <p className="hint footer-hint">
        当前版本无持久化存储，配置在关闭程序后丢失；OCR 尚未实现（见 P1）。
        <br />
        This build has no persistent storage — settings are lost when the app closes; OCR is not
        implemented yet (see P1).
      </p>
    </div>
  )
}

export default SettingsPage
