import { useEffect, useRef, useState } from 'react'
import { useAppConfig } from '../config/AppConfigContext'
import './OverlayPage.css'

/**
 * 悬浮翻译窗（OverlayPage）— 任务 1-2 UI 骨架
 * Floating translation window (OverlayPage) — task 1-2 UI skeleton
 *
 * 无边框、置顶、可拖拽；承载「翻译主界面」：原文输入区 + 译文结果区。
 * Frameless, always on top, draggable; hosts the main translation UI:
 * source input area + translation result area.
 *
 * P0 说明 / P0 notes:
 * - 本页面只做 UI 与交互骨架，真正的「读剪贴板 + 调大模型翻译 API」在任务 1-3 接入。
 *   This page is only the UI/interaction skeleton; reading the clipboard and calling the
 *   LLM translation API is wired up in task 1-3.
 * - ESC 关闭（隐藏）悬浮窗，程序继续驻留托盘。
 *   ESC closes (hides) the overlay; the app keeps running in the tray.
 */
function OverlayPage() {
  const { config } = useAppConfig()
  const [sourceText, setSourceText] = useState('')
  const [resultText, setResultText] = useState('')
  const [status, setStatus] = useState('等待输入或按 Ctrl+T 唤起 · Waiting for input, or press Ctrl+T')
  const sourceRef = useRef<HTMLTextAreaElement>(null)

  // ESC 关闭悬浮窗；订阅全局快捷键触发事件（1-3 将据此读剪贴板并翻译）
  // ESC hides the overlay; subscribe to the global-shortcut event (task 1-3 will use it to
  // read the clipboard and translate).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.overlayAPI.hideOverlay()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    const unsubscribe = window.overlayAPI.onShortcutTriggered(() => {
      setStatus(
        '快捷键已触发：任务 1-3 将在此读取剪贴板选中文本并翻译 · Shortcut fired: task 1-3 will read the selected clipboard text and translate it',
      )
      sourceRef.current?.focus()
    })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      unsubscribe()
    }
  }, [])

  const handleTranslate = () => {
    if (!sourceText.trim()) {
      setStatus('原文为空，请输入或选取要翻译的文本 · Source is empty — type or select the text to translate')
      return
    }
    // 任务 1-3 接入：读取内存配置(provider/apiKey) → 调用大模型翻译 API → setResultText
    // Task 1-3 will wire this up: read in-memory config (provider/apiKey) → call the LLM
    // translation API → setResultText
    setResultText('（译文将在任务 1-3 接入大模型 API 后显示） · (The translation appears once the LLM API is wired up in task 1-3)')
    setStatus(
      `已提交翻译（目标语言：${config.targetLang}）— 待接入 API · Translation submitted (target: ${config.targetLang}) — API pending`,
    )
  }

  const copyText = async (text: string, label: string, labelEn: string) => {
    if (!text) {
      setStatus(`${label}为空，无可复制内容 · ${labelEn} is empty, nothing to copy`)
      return
    }
    await navigator.clipboard.writeText(text)
    setStatus(`已复制${label} · ${labelEn} copied`)
  }

  return (
    <div className="overlay-page">
      {/* 顶部标题栏：可拖拽移动窗口 / Title bar: drag to move the window */}
      <div className="overlay-titlebar">
        <span className="overlay-title">Overlay Trans · 翻译 / Translate</span>
        <button
          className="overlay-close"
          title="关闭 (Esc) / Close (Esc)"
          onClick={() => window.overlayAPI.hideOverlay()}
        >
          ✕
        </button>
      </div>

      <div className="overlay-body">
        <textarea
          ref={sourceRef}
          className="overlay-input"
          value={sourceText}
          placeholder="在此输入 / 粘贴原文（任务 1-3 支持快捷键自动读取剪贴板选中文本）&#10;Type or paste the source text here (task 1-3 adds shortcut-driven clipboard capture)"
          onChange={(e) => setSourceText(e.target.value)}
        />

        <div className="overlay-result" title="译文结果 / Translation result">
          {resultText || (
            <span className="overlay-placeholder">
              译文结果将显示在这里 · The translation will appear here
            </span>
          )}
        </div>
      </div>

      <div className="overlay-actions">
        <button className="primary" onClick={handleTranslate}>
          <span className="btn-zh">翻译</span>
          <span className="btn-en">Translate</span>
        </button>
        <button onClick={() => copyText(sourceText, '原文', 'Source text')}>
          <span className="btn-zh">复制原文</span>
          <span className="btn-en">Copy source</span>
        </button>
        <button onClick={() => copyText(resultText, '译文', 'Translation')}>
          <span className="btn-zh">复制译文</span>
          <span className="btn-en">Copy result</span>
        </button>
        <button
          onClick={() =>
            setStatus('收藏功能将在 P1（含持久化）提供 · Favorites arrive in P1 (with persistence)')
          }
        >
          <span className="btn-zh">收藏</span>
          <span className="btn-en">Favorite</span>
        </button>
      </div>

      <div className="overlay-status">{status}</div>
    </div>
  )
}

export default OverlayPage
