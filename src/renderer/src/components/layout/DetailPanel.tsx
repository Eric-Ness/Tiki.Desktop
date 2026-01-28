export function DetailPanel() {
  return (
    <div className="h-full bg-background-secondary border-l border-border flex flex-col">
      {/* Header */}
      <div className="h-9 px-3 flex items-center border-b border-border bg-background-tertiary/30">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <div className="text-center px-6 max-w-[200px]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No Selection</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Select a phase node in the workflow or an issue from the sidebar to view details
          </p>
        </div>
      </div>
    </div>
  )
}
