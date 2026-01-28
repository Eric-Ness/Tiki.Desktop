export interface IssueDetailProps {
  issue: {
    number: number
    title: string
    body?: string
    labels?: string[]
    state: string
  }
}

// State badge styling
const stateBadgeStyles: Record<string, string> = {
  open: 'bg-green-600 text-green-100',
  closed: 'bg-purple-600 text-purple-100'
}

// Simple label colors for variety
const labelColors = [
  'bg-blue-600 text-blue-100',
  'bg-amber-600 text-amber-100',
  'bg-pink-600 text-pink-100',
  'bg-teal-600 text-teal-100',
  'bg-indigo-600 text-indigo-100',
  'bg-orange-600 text-orange-100'
]

function getLabelColor(index: number): string {
  return labelColors[index % labelColors.length]
}

export function IssueDetail({ issue }: IssueDetailProps) {
  const { number, title, body, labels, state } = issue
  const normalizedState = state.toLowerCase()
  const badgeStyle = stateBadgeStyles[normalizedState] || stateBadgeStyles.open

  return (
    <div className="p-4 space-y-6">
      {/* Header section with cyan accent */}
      <div className="border-l-4 border-cyan-500 pl-3">
        {/* Issue number and title */}
        <div className="flex items-start gap-2">
          <span data-testid="issue-number" className="text-cyan-400 font-semibold">
            #{number}
          </span>
          <h2 data-testid="issue-title" className="text-lg font-semibold text-white flex-1">
            {title}
          </h2>
        </div>

        {/* State badge */}
        <span
          data-testid="state-badge"
          className={`
            inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium uppercase
            ${badgeStyle}
          `}
        >
          {normalizedState}
        </span>
      </div>

      {/* Body section */}
      {body && body.trim() !== '' && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Description</h3>
          <div
            data-testid="issue-body"
            className="bg-slate-700/50 rounded-lg p-3 prose prose-sm prose-invert max-w-none"
          >
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{body}</p>
          </div>
        </div>
      )}

      {/* Labels section */}
      {labels && labels.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Labels</h3>
          <div data-testid="labels-section" className="flex flex-wrap gap-2">
            {labels.map((label, index) => (
              <span
                key={index}
                data-testid="label-badge"
                className={`
                  inline-block px-2 py-0.5 rounded text-xs font-medium
                  ${getLabelColor(index)}
                `}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
