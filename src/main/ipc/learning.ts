import { ipcMain } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { UserLearningService } from '../services/user-learning-service'

let learningService: UserLearningService | null = null

function getService(): UserLearningService {
  if (!learningService) {
    const basePath = join(homedir(), '.tiki-desktop', 'learning')
    learningService = new UserLearningService(basePath)
  }
  return learningService
}

export function registerLearningHandlers(): void {
  // learning:get-progress - Get current progress
  ipcMain.handle('learning:get-progress', async () => {
    const service = getService()
    return service.getProgress()
  })

  // learning:mark-concept-seen - Mark concept as seen
  ipcMain.handle('learning:mark-concept-seen', async (_, { conceptId }) => {
    const service = getService()
    return service.markConceptSeen(conceptId)
  })

  // learning:set-learning-mode - Toggle learning mode
  ipcMain.handle('learning:set-learning-mode', async (_, { enabled }) => {
    const service = getService()
    return service.setLearningMode(enabled)
  })

  // learning:set-expert-mode - Toggle expert mode
  ipcMain.handle('learning:set-expert-mode', async (_, { enabled }) => {
    const service = getService()
    return service.setExpertMode(enabled)
  })

  // learning:get-explanation - Get concept explanation
  ipcMain.handle('learning:get-explanation', async (_, { conceptId }) => {
    const service = getService()
    return service.getConceptExplanation(conceptId)
  })

  // learning:get-phase-explanation - Get phase explanation
  ipcMain.handle('learning:get-phase-explanation', async (_, { phase }) => {
    const service = getService()
    return service.getPhaseExplanation(phase)
  })

  // learning:should-show - Check if explanation should be shown
  ipcMain.handle('learning:should-show', async (_, { conceptId }) => {
    const service = getService()
    const progress = await service.getProgress()
    return service.shouldShowExplanation(conceptId, progress)
  })
}
