import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export interface UsageRecord {
  id: string
  timestamp: string
  inputTokens: number
  outputTokens: number
  model: string
  issueNumber?: number
  sessionId: string
}

export interface UsageSummary {
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  recordCount: number
}

export interface DailyUsage {
  date: string
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  recordCount: number
}

// Model pricing (per 1M tokens)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3, output: 15 },
  'claude-opus-4-5-20251101': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  default: { input: 3, output: 15 }
}

export class UsageService {
  private records: UsageRecord[] = []
  private storagePath: string

  constructor(storagePath?: string) {
    this.storagePath = storagePath || path.join(app.getPath('userData'), 'usage.json')
    this.load()
  }

  private load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8')
        this.records = JSON.parse(data)
      }
    } catch {
      this.records = []
    }
  }

  private save(): void {
    fs.writeFileSync(this.storagePath, JSON.stringify(this.records, null, 2))
  }

  addRecord(record: Omit<UsageRecord, 'id' | 'timestamp'>): void {
    this.records.push({
      ...record,
      id: randomUUID(),
      timestamp: new Date().toISOString()
    })
    this.save()
  }

  getRecords(since?: Date): UsageRecord[] {
    if (!since) return this.records
    return this.records.filter((r) => new Date(r.timestamp) >= since)
  }

  getSummary(since?: Date): UsageSummary {
    const records = this.getRecords(since)
    return this.calculateSummary(records)
  }

  private calculateSummary(records: UsageRecord[]): UsageSummary {
    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0)
    const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0)

    // Calculate cost
    let cost = 0
    records.forEach((r) => {
      const pricing = MODEL_PRICING[r.model] || MODEL_PRICING.default
      cost += (r.inputTokens / 1_000_000) * pricing.input
      cost += (r.outputTokens / 1_000_000) * pricing.output
    })

    return {
      totalInputTokens,
      totalOutputTokens,
      estimatedCost: Math.round(cost * 100) / 100,
      recordCount: records.length
    }
  }

  getIssueUsage(issueNumber: number): UsageSummary {
    const issueRecords = this.records.filter((r) => r.issueNumber === issueNumber)
    return this.calculateSummary(issueRecords)
  }

  getSessionUsage(sessionId: string): UsageSummary {
    const sessionRecords = this.records.filter((r) => r.sessionId === sessionId)
    return this.calculateSummary(sessionRecords)
  }

  clearHistory(): void {
    this.records = []
    this.save()
  }

  getDailyUsage(days?: number): DailyUsage[] {
    let records = this.records

    if (days) {
      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - days)
      sinceDate.setHours(0, 0, 0, 0)
      records = records.filter((r) => new Date(r.timestamp) >= sinceDate)
    }

    // Group by date
    const byDate = new Map<string, UsageRecord[]>()
    records.forEach((r) => {
      const date = r.timestamp.split('T')[0]
      if (!byDate.has(date)) {
        byDate.set(date, [])
      }
      byDate.get(date)!.push(r)
    })

    // Convert to DailyUsage array
    const dailyUsage: DailyUsage[] = []
    byDate.forEach((dayRecords, date) => {
      const summary = this.calculateSummary(dayRecords)
      dailyUsage.push({
        date,
        ...summary
      })
    })

    // Sort by date ascending
    dailyUsage.sort((a, b) => a.date.localeCompare(b.date))

    return dailyUsage
  }
}

export const usageService = new UsageService()
