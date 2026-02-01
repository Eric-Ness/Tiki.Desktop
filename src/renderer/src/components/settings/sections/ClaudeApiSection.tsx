import { useState, useEffect, useCallback } from 'react'
import { Zap, Check, X, AlertCircle, Eye, EyeOff, ExternalLink } from 'lucide-react'

type DataSource = 'files' | 'api'

export function ClaudeApiSection() {
  const [dataSource, setDataSource] = useState<DataSource>('files')
  const [sessionKey, setSessionKey] = useState('')
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    error?: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Load current settings
  useEffect(() => {
    const load = async () => {
      const source = await window.tikiDesktop.claudeStats.getDataSource()
      const key = await window.tikiDesktop.claudeStats.getSessionKey()
      setDataSource(source)
      setMaskedKey(key)
    }
    load()
  }, [])

  const handleTestConnection = useCallback(async () => {
    if (!sessionKey.trim()) return

    setIsTestingConnection(true)
    setTestResult(null)

    try {
      const result = await window.tikiDesktop.claudeStats.testConnection(sessionKey)
      setTestResult(result)
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsTestingConnection(false)
    }
  }, [sessionKey])

  const handleSaveSessionKey = useCallback(async () => {
    if (!sessionKey.trim()) return

    setIsSaving(true)
    try {
      await window.tikiDesktop.claudeStats.saveSessionKey(sessionKey)
      const key = await window.tikiDesktop.claudeStats.getSessionKey()
      setMaskedKey(key)
      setSessionKey('')
      setTestResult(null)
    } finally {
      setIsSaving(false)
    }
  }, [sessionKey])

  const handleClearSessionKey = useCallback(async () => {
    await window.tikiDesktop.claudeStats.clearSessionKey()
    setMaskedKey(null)
    setSessionKey('')
    setTestResult(null)
    // Switch back to files if API key is cleared
    if (dataSource === 'api') {
      await window.tikiDesktop.claudeStats.setDataSource('files')
      setDataSource('files')
    }
  }, [dataSource])

  const handleDataSourceChange = useCallback(async (source: DataSource) => {
    await window.tikiDesktop.claudeStats.setDataSource(source)
    setDataSource(source)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-slate-100 mb-1">Claude Usage Data</h3>
        <p className="text-sm text-slate-500">
          Configure how usage data is retrieved for the status bar widget.
        </p>
      </div>

      {/* Data Source Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-200">Data Source</label>

        <div className="space-y-2">
          <button
            onClick={() => handleDataSourceChange('files')}
            className={`w-full p-3 rounded-lg border text-left transition-colors ${
              dataSource === 'files'
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : 'border-border hover:border-border-hover'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full border-2 ${
                  dataSource === 'files'
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-500'
                }`}
              >
                {dataSource === 'files' && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200">Local Files</div>
                <div className="text-xs text-slate-500">
                  Reads from ~/.claude/stats-cache.json (no setup required)
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => maskedKey && handleDataSourceChange('api')}
            disabled={!maskedKey}
            className={`w-full p-3 rounded-lg border text-left transition-colors ${
              dataSource === 'api'
                ? 'border-amber-500/50 bg-amber-500/10'
                : maskedKey
                  ? 'border-border hover:border-border-hover'
                  : 'border-border opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  dataSource === 'api' ? 'border-amber-500 bg-amber-500' : 'border-slate-500'
                }`}
              >
                {dataSource === 'api' && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">Claude.ai API</span>
                  <Zap className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-xs text-slate-500">
                  Real-time data from Claude.ai (requires session key)
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Session Key Configuration */}
      <div className="p-4 bg-background-tertiary/50 rounded-lg border border-border space-y-4">
        <div>
          <h4 className="text-sm font-medium text-slate-200 mb-1">Session Key</h4>
          <p className="text-xs text-slate-500">
            Required for API mode. Get this from your browser&apos;s developer tools on claude.ai.
          </p>
        </div>

        {/* Current Key Status */}
        {maskedKey && (
          <div className="flex items-center justify-between p-2 bg-background rounded border border-border">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-slate-300 font-mono">{maskedKey}</span>
            </div>
            <button
              onClick={handleClearSessionKey}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              title="Remove session key"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input for new key */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
              placeholder="sk-ant-sid01-..."
              className="w-full px-3 py-2 pr-10 bg-background border border-border rounded text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={!sessionKey.trim() || isTestingConnection}
              className="px-3 py-1.5 text-sm bg-background border border-border rounded hover:border-border-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSaveSessionKey}
              disabled={!sessionKey.trim() || isSaving || (testResult && !testResult.success)}
              className="px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Key'}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`flex items-center gap-2 p-2 rounded text-sm ${
                testResult.success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {testResult.success ? (
                <>
                  <Check className="w-4 h-4" />
                  Connection successful
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  {testResult.error || 'Connection failed'}
                </>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="pt-2 border-t border-border">
          <h5 className="text-xs font-medium text-slate-400 mb-2">How to get your session key:</h5>
          <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
            <li>
              Open{' '}
              <button
                onClick={() => window.tikiDesktop.shell.openExternal('https://claude.ai/settings/usage')}
                className="text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                claude.ai/settings/usage
                <ExternalLink className="w-3 h-3" />
              </button>
            </li>
            <li>Open browser developer tools (F12 or Cmd+Option+I)</li>
            <li>Go to the Network tab and refresh the page</li>
            <li>Find a request named &quot;usage&quot;</li>
            <li>
              In Headers, find the Cookie header and copy the <code>sessionKey=sk-ant-...</code>{' '}
              value
            </li>
          </ol>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Note:</strong> Session keys expire periodically. You may need to update it
            occasionally. The key is stored locally and never sent anywhere except Claude.ai.
          </div>
        </div>
      </div>
    </div>
  )
}
