import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useLayoutPresetsStore, builtInPresets, LayoutPreset } from '../../stores/layout-presets'
import { SavePresetDialog } from './SavePresetDialog'
import { RenamePresetDialog } from './RenamePresetDialog'
import { DeletePresetDialog } from './DeletePresetDialog'

export function LayoutPresetSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [renameDialogPreset, setRenameDialogPreset] = useState<LayoutPreset | null>(null)
  const [deleteDialogPreset, setDeleteDialogPreset] = useState<LayoutPreset | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [justApplied, setJustApplied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const activePresetId = useLayoutPresetsStore((state) => state.activePresetId)
  const presets = useLayoutPresetsStore((state) => state.presets)
  const applyPreset = useLayoutPresetsStore((state) => state.applyPreset)
  const renamePreset = useLayoutPresetsStore((state) => state.renamePreset)
  const deletePreset = useLayoutPresetsStore((state) => state.deletePreset)

  // Combine built-in and custom presets for keyboard navigation
  const allPresets = useMemo(() => [...builtInPresets, ...presets], [presets])

  // All navigable items: presets + save action
  const totalItems = allPresets.length + 1 // +1 for "Save Current Layout"

  // Get current preset name
  const currentPreset = allPresets.find((p) => p.id === activePresetId)
  const currentPresetName = currentPreset?.name || 'Custom'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Reset highlighted index when dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      // Find the currently active preset index for initial highlight
      const activeIndex = allPresets.findIndex((p) => p.id === activePresetId)
      setHighlightedIndex(activeIndex >= 0 ? activeIndex : 0)
    } else {
      setHighlightedIndex(-1)
    }
  }, [isOpen, allPresets, activePresetId])

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return

      switch (event.key) {
        case 'Escape':
          setIsOpen(false)
          triggerButtonRef.current?.focus()
          break
        case 'ArrowDown':
          event.preventDefault()
          setHighlightedIndex((prev) => (prev + 1) % totalItems)
          break
        case 'ArrowUp':
          event.preventDefault()
          setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems)
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          if (highlightedIndex >= 0) {
            if (highlightedIndex < allPresets.length) {
              handleSelectPreset(allPresets[highlightedIndex].id)
            } else {
              handleSaveCurrentLayout()
            }
          }
          break
        case 'Home':
          event.preventDefault()
          setHighlightedIndex(0)
          break
        case 'End':
          event.preventDefault()
          setHighlightedIndex(totalItems - 1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, highlightedIndex, allPresets, totalItems])

  const handleSelectPreset = useCallback((presetId: string) => {
    applyPreset(presetId)
    setIsOpen(false)
    // Trigger applied animation
    setJustApplied(true)
    setTimeout(() => setJustApplied(false), 400)
    // Return focus to trigger button
    triggerButtonRef.current?.focus()
  }, [applyPreset])

  const handleSaveCurrentLayout = useCallback(() => {
    setIsOpen(false)
    setIsSaveDialogOpen(true)
  }, [])

  const handleRenamePreset = useCallback((preset: LayoutPreset, e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setRenameDialogPreset(preset)
  }, [])

  const handleDeletePreset = useCallback((preset: LayoutPreset, e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setDeleteDialogPreset(preset)
  }, [])

  const handleConfirmRename = useCallback(
    (newName: string) => {
      if (renameDialogPreset) {
        renamePreset(renameDialogPreset.id, newName)
      }
      setRenameDialogPreset(null)
    },
    [renameDialogPreset, renamePreset]
  )

  const handleConfirmDelete = useCallback(() => {
    if (deleteDialogPreset) {
      deletePreset(deleteDialogPreset.id)
    }
    setDeleteDialogPreset(null)
  }, [deleteDialogPreset, deletePreset])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger button */}
      <button
        ref={triggerButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-slate-400 hover:text-slate-300 transition-colors rounded px-1 -mx-1 ${justApplied ? 'preset-applied-highlight' : ''}`}
        aria-label="Select layout preset"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="preset-listbox"
      >
        {/* Layout icon */}
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span className={justApplied ? 'preset-active-pulse' : ''}>{currentPresetName}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          id="preset-listbox"
          className="absolute bottom-full mb-2 right-0 w-48 bg-background-secondary border border-border rounded-lg shadow-xl z-50 preset-dropdown-enter"
          role="listbox"
          aria-label="Layout presets"
          aria-activedescendant={highlightedIndex >= 0 && highlightedIndex < allPresets.length ? `preset-${allPresets[highlightedIndex].id}` : highlightedIndex === allPresets.length ? 'preset-save-new' : undefined}
        >
          {/* Built-in presets section */}
          <div className="p-1">
            <div className="px-3 py-1.5 text-xs text-slate-500 font-medium uppercase tracking-wide">
              Built-in
            </div>
            {builtInPresets.map((preset, index) => (
              <button
                key={preset.id}
                id={`preset-${preset.id}`}
                onClick={() => handleSelectPreset(preset.id)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                  activePresetId === preset.id
                    ? 'bg-amber-500/20 text-amber-400'
                    : highlightedIndex === index
                    ? 'bg-background-tertiary text-slate-200'
                    : 'text-slate-300 hover:bg-background-tertiary'
                }`}
                role="option"
                aria-selected={activePresetId === preset.id}
              >
                {/* Checkmark for active preset */}
                <span className="w-4 flex-shrink-0">
                  {activePresetId === preset.id && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 text-left">{preset.name}</span>
                {/* Built-in badge */}
                <svg
                  className="w-3 h-3 text-slate-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  title="Built-in preset"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </button>
            ))}
          </div>

          {/* Custom presets section (if any) */}
          {presets.length > 0 && (
            <div className="p-1 border-t border-border">
              <div className="px-3 py-1.5 text-xs text-slate-500 font-medium uppercase tracking-wide">
                Custom
              </div>
              {presets.map((preset, index) => {
                const itemIndex = builtInPresets.length + index
                return (
                  <div
                    key={preset.id}
                    id={`preset-${preset.id}`}
                    className={`group flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors cursor-pointer ${
                      activePresetId === preset.id
                        ? 'bg-amber-500/20 text-amber-400'
                        : highlightedIndex === itemIndex
                        ? 'bg-background-tertiary text-slate-200'
                        : 'text-slate-300 hover:bg-background-tertiary'
                    }`}
                    onClick={() => handleSelectPreset(preset.id)}
                    onMouseEnter={() => setHighlightedIndex(itemIndex)}
                    role="option"
                    aria-selected={activePresetId === preset.id}
                  >
                    {/* Checkmark for active preset */}
                    <span className="w-4 flex-shrink-0">
                      {activePresetId === preset.id && (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 text-left truncate">{preset.name}</span>
                    {/* Edit/Delete buttons - visible on hover or keyboard highlight */}
                    <div className={`flex items-center gap-1 transition-opacity ${highlightedIndex === itemIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {/* Edit (pencil) button */}
                      <button
                        onClick={(e) => handleRenamePreset(preset, e)}
                        className="p-1 rounded hover:bg-background transition-colors"
                        aria-label={`Rename ${preset.name}`}
                        title="Rename preset"
                        tabIndex={-1}
                      >
                        <svg
                          className="w-3 h-3 text-slate-400 hover:text-slate-200"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {/* Delete (trash) button */}
                      <button
                        onClick={(e) => handleDeletePreset(preset, e)}
                        className="p-1 rounded hover:bg-background transition-colors"
                        aria-label={`Delete ${preset.name}`}
                        title="Delete preset"
                        tabIndex={-1}
                      >
                        <svg
                          className="w-3 h-3 text-slate-400 hover:text-red-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Save current layout option */}
          <div className="p-1 border-t border-border">
            <button
              id="preset-save-new"
              onClick={handleSaveCurrentLayout}
              onMouseEnter={() => setHighlightedIndex(allPresets.length)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                highlightedIndex === allPresets.length
                  ? 'bg-background-tertiary text-slate-200'
                  : 'text-slate-300 hover:bg-background-tertiary'
              }`}
              role="option"
              aria-selected={false}
            >
              {/* Plus icon */}
              <span className="w-4 flex-shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              <span className="flex-1 text-left">Save Current Layout...</span>
            </button>
          </div>
        </div>
      )}

      {/* Save preset dialog */}
      <SavePresetDialog isOpen={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)} />

      {/* Rename preset dialog */}
      <RenamePresetDialog
        isOpen={renameDialogPreset !== null}
        preset={renameDialogPreset}
        onClose={() => setRenameDialogPreset(null)}
        onRename={handleConfirmRename}
      />

      {/* Delete preset confirmation dialog */}
      <DeletePresetDialog
        isOpen={deleteDialogPreset !== null}
        preset={deleteDialogPreset}
        onClose={() => setDeleteDialogPreset(null)}
        onDelete={handleConfirmDelete}
      />
    </div>
  )
}
