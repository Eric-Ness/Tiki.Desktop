import { useCallback } from 'react'
import { useTikiStore, type Project } from '../../stores/tiki-store'

interface ProjectListProps {
  onProjectSwitch: (project: Project) => void
}

export function ProjectList({ onProjectSwitch }: ProjectListProps) {
  const projects = useTikiStore((state) => state.projects)
  const activeProject = useTikiStore((state) => state.activeProject)
  const addProject = useTikiStore((state) => state.addProject)
  const removeProject = useTikiStore((state) => state.removeProject)

  const handleAddProject = useCallback(async () => {
    const result = await window.tikiDesktop.projects.pickFolder()
    if (result) {
      // Check if project already exists
      const exists = projects.some((p) => p.path === result.path)
      if (!exists) {
        addProject(result)
        // Auto-switch to the new project
        onProjectSwitch(result)
      }
    }
  }, [projects, addProject, onProjectSwitch])

  const handleRemoveProject = useCallback(
    (e: React.MouseEvent, projectId: string) => {
      e.stopPropagation() // Prevent triggering project switch
      removeProject(projectId)
    },
    [removeProject]
  )

  const handleProjectClick = useCallback(
    (project: Project) => {
      if (activeProject?.id !== project.id) {
        onProjectSwitch(project)
      }
    },
    [activeProject, onProjectSwitch]
  )

  return (
    <div className="px-2 py-1">
      {/* Project list */}
      <div className="space-y-1">
        {projects.map((project) => {
          const isActive = activeProject?.id === project.id

          return (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                group transition-colors
                ${isActive ? 'bg-amber-900/30 text-amber-200' : 'hover:bg-background-tertiary text-slate-400'}
              `}
            >
              {/* Folder icon */}
              <svg
                className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-500' : 'text-slate-500'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>

              {/* Project name */}
              <span className="flex-1 truncate text-sm">{project.name}</span>

              {/* Active indicator */}
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              )}

              {/* Remove button (hidden until hover) */}
              <button
                onClick={(e) => handleRemoveProject(e, project.id)}
                className={`
                  p-0.5 rounded opacity-0 group-hover:opacity-100
                  hover:bg-red-900/50 hover:text-red-400
                  transition-opacity
                  ${isActive ? 'text-amber-400' : 'text-slate-500'}
                `}
                title="Remove project"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="text-sm text-slate-500 italic py-2">No projects added</div>
        )}
      </div>

      {/* Add project button */}
      <button
        onClick={handleAddProject}
        className="
          w-full mt-2 px-2 py-1.5 rounded
          flex items-center justify-center gap-2
          text-sm text-slate-400
          border border-dashed border-slate-600
          hover:border-amber-500 hover:text-amber-400
          transition-colors
        "
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Project
      </button>
    </div>
  )
}
