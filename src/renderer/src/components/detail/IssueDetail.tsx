import { GitHubIssue } from '../../stores/tiki-store'
import { IssueActions } from '../issues'

export interface IssueDetailProps {
  issue: GitHubIssue | {
    number: number
    title: string
    body?: string
    labels?: string[] | Array<{ name: string; color: string }>
    state: string
    url?: string
    hasPlan?: boolean
  }
  cwd?: string
}

// State badge styling
const stateBadgeStyles: Record<string, string> = {
  open: 'bg-green-600 text-green-100',
  closed: 'bg-purple-600 text-purple-100'
}

// Convert hex color to tailwind-compatible rgba
function hexToRgba(hex: string, alpha: number = 0.3): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(100, 100, 100, ${alpha})`
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
}

// Simple label colors for variety (fallback)
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

export function IssueDetail({ issue, cwd }: IssueDetailProps) {
  const { number, title, body, labels, state } = issue
  const hasPlan = 'hasPlan' in issue ? issue.hasPlan : undefined
  const normalizedState = state.toLowerCase()
  const badgeStyle = stateBadgeStyles[normalizedState] || stateBadgeStyles.open

  const handleOpenInBrowser = async () => {
    if (number) {
      try {
        await window.tikiDesktop.github.openInBrowser(number, cwd)
      } catch (error) {
        console.error('Failed to open issue in browser:', error)
      }
    }
  }

  // Normalize labels to array of objects
  const normalizedLabels = labels
    ? labels.map((label) =>
        typeof label === 'string'
          ? { name: label, color: '' }
          : label
      )
    : []

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

        {/* State and plan badges */}
        <div className="flex items-center gap-2 mt-2">
          <span
            data-testid="state-badge"
            className={`
              inline-block px-2 py-0.5 rounded text-xs font-medium uppercase
              ${badgeStyle}
            `}
          >
            {normalizedState}
          </span>
          {hasPlan && (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-cyan-600 text-cyan-100">
              Has Plan
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick actions for working with the issue */}
        {'url' in issue && (
          <IssueActions issue={issue as GitHubIssue} />
        )}

        {/* Open in GitHub button */}
        <button
          onClick={handleOpenInBrowser}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 active:bg-slate-700 rounded transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Open in GitHub
        </button>
      </div>

      {/* Body section */}
      {body && body.trim() !== '' && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Description</h3>
          <div
            data-testid="issue-body"
            className="bg-slate-700/50 rounded-lg p-3 prose prose-sm prose-invert max-w-none max-h-[300px] overflow-y-auto"
          >
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{body}</p>
          </div>
        </div>
      )}

      {/* Labels section */}
      {normalizedLabels.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Labels</h3>
          <div data-testid="labels-section" className="flex flex-wrap gap-2">
            {normalizedLabels.map((label, index) => (
              <span
                key={index}
                data-testid="label-badge"
                className={`
                  inline-block px-2 py-0.5 rounded text-xs font-medium
                  ${label.color ? '' : getLabelColor(index)}
                `}
                style={
                  label.color
                    ? {
                        backgroundColor: hexToRgba(label.color, 0.3),
                        color: `#${label.color}`,
                        border: `1px solid ${hexToRgba(label.color, 0.5)}`
                      }
                    : undefined
                }
              >
                {label.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
