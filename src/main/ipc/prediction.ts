import { ipcMain } from 'electron'
import {
  CostPredictor,
  CostPrediction,
  BudgetSettings,
  isHighCost,
  loadBudgetSettings,
  saveBudgetSettings,
  getDailySpend,
  getWeeklySpend
} from '../services/cost-predictor'
import {
  saveExecutionRecord,
  ExecutionRecord,
  getRecentExecutions,
  GitHubIssue
} from '../services/feature-extractor'

const predictors = new Map<string, CostPredictor>()

function getPredictor(cwd: string): CostPredictor {
  if (!predictors.has(cwd)) {
    const predictor = new CostPredictor()
    // Note: loadHistory is async but we create predictor synchronously
    // The predictor will work with empty history until loaded
    predictors.set(cwd, predictor)
  }
  return predictors.get(cwd)!
}

async function ensurePredictorLoaded(cwd: string): Promise<CostPredictor> {
  const predictor = getPredictor(cwd)
  // Always reload to ensure we have latest data
  await predictor.loadHistory(cwd)
  return predictor
}

export function registerPredictionHandlers(): void {
  // prediction:estimate-issue - Predict cost for issue
  ipcMain.handle(
    'prediction:estimate-issue',
    async (_, { cwd, issue }: { cwd: string; issue: GitHubIssue }) => {
      const predictor = await ensurePredictorLoaded(cwd)
      return predictor.predictCost(issue)
    }
  )

  // prediction:estimate-plan - Predict cost from plan
  ipcMain.handle(
    'prediction:estimate-plan',
    async (
      _,
      {
        cwd,
        plan,
        issue
      }: {
        cwd: string
        plan: { phases: Array<{ files: string[]; verification: string[] }> }
        issue: GitHubIssue
      }
    ) => {
      const predictor = await ensurePredictorLoaded(cwd)
      return predictor.predictFromPlan(plan, issue)
    }
  )

  // prediction:record-actual - Record actual execution cost
  ipcMain.handle(
    'prediction:record-actual',
    async (_, { cwd, record }: { cwd: string; record: ExecutionRecord }) => {
      await saveExecutionRecord(cwd, record)
      // Reload history to include new record
      const predictor = getPredictor(cwd)
      await predictor.loadHistory(cwd)
      return { success: true }
    }
  )

  // prediction:get-history - Get prediction vs actual history
  ipcMain.handle(
    'prediction:get-history',
    async (_, { cwd, limit }: { cwd: string; limit?: number }) => {
      return getRecentExecutions(cwd, limit || 50)
    }
  )

  // prediction:get-budget - Get budget settings and status
  ipcMain.handle('prediction:get-budget', async (_, { cwd }: { cwd: string }) => {
    const settings = await loadBudgetSettings(cwd)
    const dailySpend = await getDailySpend(cwd)
    const weeklySpend = await getWeeklySpend(cwd)
    return { settings, dailySpend, weeklySpend }
  })

  // prediction:set-budget - Set daily/weekly budget
  ipcMain.handle(
    'prediction:set-budget',
    async (_, { cwd, settings }: { cwd: string; settings: BudgetSettings }) => {
      await saveBudgetSettings(cwd, settings)
      return { success: true }
    }
  )

  // prediction:get-average-cost - Get average cost from history
  ipcMain.handle('prediction:get-average-cost', async (_, { cwd }: { cwd: string }) => {
    const predictor = await ensurePredictorLoaded(cwd)
    return {
      average: predictor.getAverageIssueCost(),
      recent: predictor.getRecentAverageCost(5)
    }
  })

  // prediction:is-high-cost - Check if prediction is high cost
  ipcMain.handle(
    'prediction:is-high-cost',
    async (
      _,
      {
        cwd,
        prediction,
        threshold
      }: { cwd: string; prediction: CostPrediction; threshold?: number }
    ) => {
      const predictor = await ensurePredictorLoaded(cwd)
      const averageCost = predictor.getAverageIssueCost()
      return isHighCost(prediction, averageCost, threshold)
    }
  )

  // prediction:clear-cache - Clear predictor cache for a project
  ipcMain.handle('prediction:clear-cache', async (_, { cwd }: { cwd: string }) => {
    predictors.delete(cwd)
    return { success: true }
  })
}
