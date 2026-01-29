import { useState } from 'react'

export interface ConceptCardProps {
  concept: {
    id: string
    title: string
    shortDescription: string
    fullExplanation: string
    relatedConcepts: string[]
  }
  onDismiss: () => void
  onLearnMore?: (conceptId: string) => void
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function ConceptCard({ concept, onDismiss, onLearnMore }: ConceptCardProps) {
  const [expanded, setExpanded] = useState(false)

  const handleRelatedConceptClick = (conceptId: string) => {
    if (onLearnMore) {
      onLearnMore(conceptId)
    }
  }

  return (
    <div
      data-testid="concept-card"
      className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4"
    >
      {/* Header with icon and title */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          data-testid="concept-icon-lightbulb"
          className="w-5 h-5 text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
        <h3 className="text-lg font-semibold text-amber-200">{concept.title}</h3>
      </div>

      {/* Short description */}
      <p className="text-sm text-slate-300 mb-3">{concept.shortDescription}</p>

      {/* Expand/collapse button and full explanation */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 mb-3"
      >
        {expanded ? 'Show less' : 'Show more'}
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <p className="text-sm text-slate-300 mb-3 pl-2 border-l-2 border-amber-500/30">
          {concept.fullExplanation}
        </p>
      )}

      {/* Related concepts */}
      {concept.relatedConcepts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-xs text-slate-400">Related:</span>
          {concept.relatedConcepts.map((related) => (
            <button
              key={related}
              onClick={() => handleRelatedConceptClick(related)}
              className="bg-slate-700 hover:bg-slate-600 text-xs px-2 py-1 rounded text-slate-200 transition-colors"
            >
              {capitalize(related)}
            </button>
          ))}
        </div>
      )}

      {/* Got it! button */}
      <button
        onClick={onDismiss}
        className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
      >
        Got it!
      </button>
    </div>
  )
}
