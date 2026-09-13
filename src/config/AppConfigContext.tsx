import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * P0 应用配置（仅内存态）
 * P0 app configuration (in-memory only)
 *
 * 注意：P0 阶段配置只保存在渲染进程内存中，程序关闭即丢失；
 * 快捷键配置按方案 A 仅作 UI 占位，不接线、不重注册全局热键。
 * 持久化（SQLite）在 P1 任务 2-1 实现。
 *
 * Note: in P0 the config lives only in renderer memory and is lost on exit.
 * The shortcut setting is option A: a UI placeholder only — it is not wired up
 * and never re-registers the global hotkey.
 * Persistence (SQLite) lands in P1, task 2-1.
 */

export type ProviderId = 'openai' | 'deepseek' | 'anthropic' | 'google' | 'ollama'

export const PROVIDER_OPTIONS: { id: ProviderId; label: string }[] = [
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic Claude' },
  { id: 'google', label: 'Google Gemini' },
  { id: 'ollama', label: 'Ollama（本地 / local）' },
]

export interface AppConfig {
  /** 大模型服务商 / LLM provider */
  provider: ProviderId
  /** API Key（P0 内存态，不持久化） / API key (P0: in memory, not persisted) */
  apiKey: string
  /** 自定义 API Base URL（可选） / Custom API base URL (optional) */
  apiBaseUrl: string
  /** 翻译目标语言 / Target language for translation */
  targetLang: string
  /** 快捷键展示文本（P0 仅 UI 占位） / Shortcut label (P0: UI placeholder only) */
  shortcutLabel: string
}

const DEFAULT_CONFIG: AppConfig = {
  provider: 'deepseek',
  apiKey: '',
  apiBaseUrl: '',
  targetLang: 'zh-CN',
  shortcutLabel: 'Ctrl+T',
}

interface AppConfigContextValue {
  config: AppConfig
  updateConfig: (patch: Partial<AppConfig>) => void
}

const AppConfigContext = createContext<AppConfigContextValue | undefined>(undefined)

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)

  const value = useMemo<AppConfigContextValue>(
    () => ({
      config,
      updateConfig: (patch) => setConfig((prev) => ({ ...prev, ...patch })),
    }),
    [config],
  )

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>
}

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext)
  if (!ctx) {
    throw new Error('useAppConfig 必须在 AppConfigProvider 内使用 / useAppConfig must be used inside AppConfigProvider')
  }
  return ctx
}
