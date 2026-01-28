export function DetailPanel() {
  return (
    <div className="h-full bg-background-secondary border-l border-border flex flex-col">
      {/* Header */}
      <div className="h-9 px-3 flex items-center border-b border-border">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <div className="text-center px-4">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <p className="text-sm mb-1">No Selection</p>
          <p className="text-xs text-slate-600">
            Select a phase node or issue to view details
          </p>
        </div>
      </div>
    </div>
  )
}
