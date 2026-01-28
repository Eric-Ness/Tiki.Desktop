interface StatusBarProps {
  version: string
}

export function StatusBar({ version }: StatusBarProps) {
  return (
    <div className="h-6 bg-background-tertiary border-t border-border flex items-center px-3 text-xs text-slate-500">
      {/* Left side - Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span>Idle</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - Info */}
      <div className="flex items-center gap-4">
        <span>Tiki Desktop v{version || '0.0.0'}</span>
      </div>
    </div>
  )
}
