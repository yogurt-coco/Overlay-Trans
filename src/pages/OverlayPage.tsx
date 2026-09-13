import { useEffect, useRef, useState } from 'react'
import { useAppConfig } from '../config/AppConfigContext'
import './OverlayPage.css'

/**
 * 悬浮翻译窗（OverlayPage）— 任务 1-2 UI 骨架
 *
 * 无边框、置顶、可拖拽；承载「翻译主界面」：原文输入区 + 译文结果区。
 * P0 说明：
 * - 本页面只做 UI 与交互骨架，真正的「读剪贴板 + 调大模型翻译 API」在任务 1-3 接入。
 * - ESC 关闭（隐藏）悬浮窗，程序继续驻留托盘。
 */
function OverlayPage() {
  const { config } = useAppConfig()
  const [sourceText, setSourceText] = useState('')
  const [resultText, setResultText] = useState('')
  const [status, setStatus] = useState('等待输入或按 Ctrl+T 唤起')
  const sourceRef = useRef<HTMLTextAreaElement>(null)

  // ESC 关闭悬浮窗；订阅全局快捷键触发事件（1-3 将据此读剪贴板并翻译）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.overlayAPI.hideOverlay()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    const unsubscribe = window.overlayAPI.onShortcutTriggered(() => {
      setStatus('快捷键已触发：任务 1-3 将在此读取剪贴板选中文本并翻译')
      sourceRef.current?.focus()
    })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      unsubscribe()
    }
  }, [])

  const handleTranslate = () => {
    if (!sourceText.trim()) {
      setStatus('原文为空，请输入或选取要翻译的文本')
      return
    }
    // 任务 1-3 接入：读取内存配置(provider/apiKey) → 调用大模型翻译 API → setResultText
    setResultText('（译文将在任务 1-3 接入大模型 API 后显示）')
    setStatus(`已提交翻译（目标语言：${config.targetLang}）— 待接入 API`)
  }

  const copyText = async (text: string, label: string) => {
    if (!text) {
      setStatus(`${label}为空，无可复制内容`)
      return
    }
    await navigator.clipboard.writeText(text)
    setStatus(`已复制${label}`)
  }

  return (
    <div className="overlay-page">
      {/* 顶部标题栏：可拖拽移动窗口 */}
      <div className="overlay-titlebar">
        <span className="overlay-title">Overlay Trans · 翻译</span>
        <button
          className="overlay-close"
          title="关闭 (Esc)"
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
          placeholder="在此输入 / 粘贴原文（任务 1-3 支持快捷键自动读取剪贴板选中文本）"
          onChange={(e) => setSourceText(e.target.value)}
        />

        <div className="overlay-result" title="译文结果">
          {resultText || <span className="overlay-placeholder">译文结果将显示在这里</span>}
        </div>
      </div>

      <div className="overlay-actions">
        <button className="primary" onClick={handleTranslate}>
          翻译
        </button>
        <button onClick={() => copyText(sourceText, '原文')}>复制原文</button>
        <button onClick={() => copyText(resultText, '译文')}>复制译文</button>
        <button onClick={() => setStatus('收藏功能将在 P1（含持久化）提供')}>收藏</button>
      </div>

      <div className="overlay-status">{status}</div>
    </div>
  )
}

export default OverlayPage
