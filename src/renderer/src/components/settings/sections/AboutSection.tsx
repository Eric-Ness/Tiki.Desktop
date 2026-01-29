import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Download, RotateCcw, AlertCircle, Check } from 'lucide-react'
import type { UpdateStatus } from '../../UpdateToast'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function AboutSection() {
  const [version, setVersion] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  // Get current app version
  useEffect(() => {
    window.tikiDesktop.getVersion().then(setVersion)
  }, [])

  // Listen for update status events from the main process
  useEffect(() => {
    const unsubscribe = window.tikiDesktop.updates.onStatus((status) => {
      setUpdateStatus(status)
    })
    return () => unsubscribe()
  }, [])

  const handleCheckForUpdates = useCallback(async () => {
    setIsChecking(true)
    setUpdateStatus({ type: 'checking' })
    try {
      const result = await window.tikiDesktop.updates.check()
      // If check completed but we didn't receive status via events, handle it here
      if (result && !result.success) {
        setUpdateStatus({ type: 'error', message: result.error })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check for updates'
      setUpdateStatus({ type: 'error', message })
    } finally {
      // Always reset isChecking when the check completes (success or failure)
      setIsChecking(false)
    }
  }, [])

  const handleDownload = useCallback(() => {
    window.tikiDesktop.updates.download()
  }, [])

  const handleInstall = useCallback(() => {
    window.tikiDesktop.updates.install()
  }, [])

  const getStatusDisplay = () => {
    if (!updateStatus) {
      return null
    }

    switch (updateStatus.type) {
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Checking for updates...</span>
          </div>
        )
      case 'available':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-400">
              <Download className="w-4 h-4" />
              <span>Version {updateStatus.version} is available</span>
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded transition-colors"
            >
              Download Update
            </button>
          </div>
        )
      case 'downloading':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Downloading update...</span>
            </div>
            <div className="text-sm text-slate-400">
              {formatBytes(updateStatus.transferred)} / {formatBytes(updateStatus.total)}
              <span className="text-slate-500 ml-2">
                ({formatBytes(updateStatus.bytesPerSecond)}/s)
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-300"
                style={{ width: `${Math.min(updateStatus.percent, 100)}%` }}
              />
            </div>
          </div>
        )
      case 'downloaded':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <RotateCcw className="w-4 h-4" />
              <span>Version {updateStatus.version} is ready to install</span>
            </div>
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded transition-colors"
            >
              Restart to Update
            </button>
          </div>
        )
      case 'not-available':
        return (
          <div className="flex items-center gap-2 text-green-400">
            <Check className="w-4 h-4" />
            <span>You're on the latest version</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{updateStatus.message}</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* App Info */}
      <div>
        <h3 className="text-sm font-medium text-slate-200 mb-4">Application</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Tiki.Desktop</span>
            <span className="text-slate-300 font-mono">v{version}</span>
          </div>
        </div>
      </div>

      {/* Updates */}
      <div>
        <h3 className="text-sm font-medium text-slate-200 mb-4">Updates</h3>
        <div className="space-y-4">
          {/* Check for Updates Button */}
          <button
            onClick={handleCheckForUpdates}
            disabled={isChecking || updateStatus?.type === 'downloading'}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 text-sm font-medium rounded transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            Check for Updates
          </button>

          {/* Status Display */}
          <div className="mt-4">
            {getStatusDisplay()}
          </div>
        </div>
      </div>

      {/* Links */}
      <div>
        <h3 className="text-sm font-medium text-slate-200 mb-4">Resources</h3>
        <div className="space-y-2">
          <a
            href="https://github.com/Eric-Ness/Tiki.Desktop"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-teal-400 hover:text-teal-300 transition-colors"
          >
            GitHub Repository
          </a>
          <a
            href="https://github.com/Eric-Ness/Tiki.Desktop/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-teal-400 hover:text-teal-300 transition-colors"
          >
            Release Notes
          </a>
          <a
            href="https://github.com/Eric-Ness/Tiki.Desktop/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-teal-400 hover:text-teal-300 transition-colors"
          >
            Report an Issue
          </a>
        </div>
      </div>
    </div>
  )
}
