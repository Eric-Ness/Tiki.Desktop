import { X, Download, RotateCcw, RefreshCw, AlertCircle } from 'lucide-react'

export type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number; bytesPerSecond: number; total: number; transferred: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

interface UpdateToastProps {
  status: UpdateStatus
  onDownload: () => void
  onInstall: () => void
  onDismiss: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function UpdateToast({ status, onDownload, onInstall, onDismiss }: UpdateToastProps) {
  // Don't show toast for certain states
  if (status.type === 'checking' || status.type === 'not-available') {
    return null
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-200">
      <div className="bg-background-secondary border border-border rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {status.type === 'available' && (
              <Download className="w-5 h-5 text-teal-400" />
            )}
            {status.type === 'downloading' && (
              <RefreshCw className="w-5 h-5 text-teal-400 animate-spin" />
            )}
            {status.type === 'downloaded' && (
              <RotateCcw className="w-5 h-5 text-green-400" />
            )}
            {status.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="font-medium text-slate-200">
              {status.type === 'available' && 'Update Available'}
              {status.type === 'downloading' && 'Downloading Update'}
              {status.type === 'downloaded' && 'Update Ready'}
              {status.type === 'error' && 'Update Error'}
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="text-sm text-slate-400">
          {status.type === 'available' && (
            <p>Version {status.version} is available for download.</p>
          )}
          {status.type === 'downloading' && (
            <div className="space-y-2">
              <p>
                {formatBytes(status.transferred)} / {formatBytes(status.total)}
                <span className="text-slate-500 ml-2">
                  ({formatBytes(status.bytesPerSecond)}/s)
                </span>
              </p>
              {/* Progress bar */}
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${Math.min(status.percent, 100)}%` }}
                />
              </div>
            </div>
          )}
          {status.type === 'downloaded' && (
            <p>Version {status.version} has been downloaded. Restart to apply the update.</p>
          )}
          {status.type === 'error' && (
            <p className="text-red-400">{status.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          {status.type === 'available' && (
            <button
              onClick={onDownload}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded transition-colors"
            >
              Download
            </button>
          )}
          {status.type === 'downloaded' && (
            <button
              onClick={onInstall}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded transition-colors"
            >
              Restart to Update
            </button>
          )}
          {status.type === 'error' && (
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
