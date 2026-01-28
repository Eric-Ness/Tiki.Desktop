export interface ShipDetailProps {
  allPhasesComplete: boolean
}

// Ship icon SVG component
function ShipIcon({ complete }: { complete: boolean }) {
  const colorClass = complete ? 'text-green-400' : 'text-slate-500'

  return (
    <svg
      className={`w-12 h-12 ${colorClass}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  )
}

// Checkmark icon for complete state
function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 text-green-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function ShipDetail({ allPhasesComplete }: ShipDetailProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Header section */}
      <div
        data-testid="ship-header"
        className={`
          flex items-center gap-3 p-4 rounded-lg
          ${allPhasesComplete ? 'bg-green-900/30 border border-green-700' : 'bg-slate-700/50 border border-slate-600'}
        `}
      >
        <ShipIcon complete={allPhasesComplete} />
        <div className="flex-1">
          <h2
            data-testid="ship-title"
            className={`text-lg font-semibold ${allPhasesComplete ? 'text-green-300' : 'text-slate-300'}`}
          >
            {allPhasesComplete ? 'Ready to Ship' : 'Ship'}
          </h2>
          <p
            data-testid="ship-status"
            className={`text-sm ${allPhasesComplete ? 'text-green-400' : 'text-slate-400'}`}
          >
            {allPhasesComplete ? 'All phases complete - ready to ship!' : 'Phases in progress...'}
          </p>
        </div>
        {allPhasesComplete && <CheckIcon />}
      </div>

      {/* Status indicator */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Status</h3>
        <div className="flex items-center gap-2">
          <div
            data-testid="status-indicator"
            className={`
              w-3 h-3 rounded-full
              ${allPhasesComplete ? 'bg-green-500' : 'bg-amber-500'}
            `}
          />
          <span
            data-testid="status-text"
            className={`text-sm ${allPhasesComplete ? 'text-green-400' : 'text-amber-400'}`}
          >
            {allPhasesComplete ? 'Complete' : 'In Progress'}
          </span>
        </div>
      </div>
    </div>
  )
}
