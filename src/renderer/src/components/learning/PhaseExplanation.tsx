import { useState } from 'react'

export interface PhaseExplanationProps {
  explanation: {
    whyThisPhase: string
    whatHappens: string[]
    conceptsInvolved: string[]
  }
  onConceptClick?: (conceptId: string) => void
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function PhaseExplanation({ explanation, onConceptClick }: PhaseExplanationProps) {
  const [expanded, setExpanded] = useState(false)

  const handleConceptClick = (conceptId: string) => {
    if (onConceptClick) {
      onConceptClick(conceptId)
    }
  }

  return (
    <div
      data-testid="phase-explanation"
      className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4"
    >
      {/* Learning Mode badge */}
      <span className="text-xs bg-cyan-600 rounded px-2 py-0.5 text-white mb-3 inline-block">
        Learning Mode
      </span>

      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex items-center justify-between w-full text-left mt-2"
      >
        <span className="text-sm font-medium text-cyan-200 flex items-center gap-2">
          <svg
            data-testid="phase-explanation-toggle"
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          Why this phase?
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Why explanation */}
          <p className="text-sm text-slate-300">{explanation.whyThisPhase}</p>

          {/* What happens list */}
          {explanation.whatHappens.length > 0 && (
            <div>
              <span className="text-sm font-medium text-cyan-200">What happens:</span>
              <ul
                data-testid="what-happens-list"
                className="list-disc ml-4 text-sm text-slate-300 mt-1"
              >
                {explanation.whatHappens.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Concepts involved */}
          {explanation.conceptsInvolved.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Concepts:</span>
              {explanation.conceptsInvolved.map((concept) => (
                <button
                  key={concept}
                  onClick={() => handleConceptClick(concept)}
                  className="bg-slate-700 hover:bg-slate-600 text-xs px-2 py-1 rounded text-slate-200 transition-colors"
                >
                  {capitalize(concept)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
