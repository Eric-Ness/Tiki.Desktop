import { useLearning } from '../../contexts/LearningContext'

export interface LearningModeToggleProps {
  compact?: boolean
}

export function LearningModeToggle({ compact = false }: LearningModeToggleProps) {
  const {
    loading,
    learningModeEnabled,
    expertModeEnabled,
    toggleLearningMode,
    toggleExpertMode
  } = useLearning()

  if (compact) {
    return (
      <div
        data-testid="learning-toggle-compact"
        className="flex items-center gap-3 text-sm text-slate-300"
      >
        {loading && (
          <span
            data-testid="learning-toggle-loading"
            className="w-4 h-4 border-2 border-slate-500 border-t-amber-500 rounded-full animate-spin"
          />
        )}
        <span>Learning</span>
        <button
          role="switch"
          aria-checked={learningModeEnabled}
          onClick={toggleLearningMode}
          disabled={loading}
          className={`relative w-8 h-4 rounded-full transition-colors ${
            learningModeEnabled ? 'bg-amber-500' : 'bg-slate-600'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
              learningModeEnabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        {learningModeEnabled && (
          <>
            <span className="text-slate-500">|</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span>Expert</span>
              <input
                type="checkbox"
                checked={expertModeEnabled}
                onChange={toggleExpertMode}
                aria-label="Expert Mode"
                className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
              />
            </label>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {loading && (
        <div
          data-testid="learning-toggle-loading"
          className="flex items-center gap-2 text-sm text-slate-400"
        >
          <span className="w-4 h-4 border-2 border-slate-500 border-t-amber-500 rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      )}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-slate-300 font-medium">Learning Mode</span>
        <button
          role="switch"
          aria-checked={learningModeEnabled}
          onClick={toggleLearningMode}
          disabled={loading}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            learningModeEnabled ? 'bg-amber-500' : 'bg-slate-600'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
              learningModeEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {learningModeEnabled && (
        <label className="flex items-center gap-2 py-1 cursor-pointer">
          <input
            type="checkbox"
            checked={expertModeEnabled}
            onChange={toggleExpertMode}
            aria-label="Expert Mode"
            className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
          />
          <span className="text-sm text-slate-300">
            Expert Mode <span className="text-slate-500">(hide all tips)</span>
          </span>
        </label>
      )}
    </div>
  )
}
