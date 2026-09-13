import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * P0 应用配置（仅内存态）
 *
 * 注意：P0 阶段配置只保存在渲染进程内存中，程序关闭即丢失；
 * 快捷键配置按方案 A 仅作 UI 占位，不接线、不重注册全局热键。
 * 持久化（SQLite）在 P1 任务 2-1 实现。
 */

export type ProviderId = 'openai' | 'deepseek' | 'anthropic' | 'google' | 'ollama'

export const PROVIDER_OPTIONS: { id: ProviderId; label: string }[] = [
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic Claude' },
  { id: 'google', label: 'Google Gemini' },
  { id: 'ollama', label: 'Ollama（本地）' },
]

export interface AppConfig {
  /** 大模型服务商 */
  provider: ProviderId
  /** API Key（P0 内存态，不持久化） */
  apiKey: string
  /** 自定义 API Base URL（可选） */
  apiBaseUrl: string
  /** 翻译目标语言 */
  targetLang: string
  /** 快捷键展示文本（P0 仅 UI 占位） */
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
    throw new Error('useAppConfig 必须在 AppConfigProvider 内使用')
  }
  return ctx
}
