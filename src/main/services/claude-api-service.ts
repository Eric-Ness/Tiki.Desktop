/**
 * Claude API Service
 *
 * Fetches usage data directly from Claude.ai's web API.
 * Requires a session key from the user's browser cookies.
 */

import { net } from 'electron'
import Store from 'electron-store'

// Separate store for Claude API settings
interface ClaudeApiSettings {
  sessionKey?: string
  orgId?: string
  dataSource: 'files' | 'api'
}

const claudeApiStore = new Store<ClaudeApiSettings>({
  name: 'claude-api',
  defaults: {
    dataSource: 'files'
  }
})

export interface ClaudeApiUsage {
  fiveHour: LimitData | null
  sevenDay: LimitData | null
  sevenDayOpus: LimitData | null
  sevenDaySonnet: LimitData | null
}

export interface LimitData {
  utilization: number
  resetsAt: string | null
}

export interface ClaudeApiError {
  type: string
  message: string
}

interface UsageResponse {
  five_hour: {
    utilization: number
    resets_at: string | null
  }
  seven_day?: {
    utilization: number
    resets_at: string | null
  }
  seven_day_opus?: {
    utilization: number
    resets_at: string | null
  }
  seven_day_sonnet?: {
    utilization: number
    resets_at: string | null
  }
}

interface OrganizationResponse {
  uuid: string
  name: string
}

const BASE_URL = 'https://claude.ai/api'

function buildHeaders(sessionKey: string): Record<string, string> {
  return {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json',
    'anthropic-client-platform': 'web_claude_ai',
    'anthropic-client-version': '1.0.0',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    origin: 'https://claude.ai',
    referer: 'https://claude.ai/settings/usage',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    Cookie: `sessionKey=${sessionKey}`
  }
}

async function fetchJson<T>(url: string, sessionKey: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url,
      useSessionCookies: false
    })

    const headers = buildHeaders(sessionKey)
    for (const [key, value] of Object.entries(headers)) {
      request.setHeader(key, value)
    }

    let responseData = ''

    request.on('response', (response) => {
      if (response.statusCode === 401) {
        reject(new Error('Session expired or invalid. Please update your session key.'))
        return
      }

      if (response.statusCode === 403) {
        reject(new Error('Access forbidden. Possibly blocked by Cloudflare.'))
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP error: ${response.statusCode}`))
        return
      }

      response.on('data', (chunk) => {
        responseData += chunk.toString()
      })

      response.on('end', () => {
        try {
          // Check for HTML response (Cloudflare block)
          if (responseData.includes('<!DOCTYPE html>') || responseData.includes('<html')) {
            reject(new Error('Received HTML response. Possibly blocked by Cloudflare.'))
            return
          }

          const data = JSON.parse(responseData) as T
          resolve(data)
        } catch {
          reject(new Error('Failed to parse response'))
        }
      })
    })

    request.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`))
    })

    request.end()
  })
}

export class ClaudeApiService {
  private cachedOrgId: string | null = null

  /**
   * Fetch organizations to get the organization ID
   */
  async fetchOrganizations(sessionKey: string): Promise<OrganizationResponse[]> {
    const url = `${BASE_URL}/organizations`
    return fetchJson<OrganizationResponse[]>(url, sessionKey)
  }

  /**
   * Get organization ID (cached or fetched)
   */
  async getOrganizationId(sessionKey: string): Promise<string> {
    // Check if we have a stored org ID
    const storedOrgId = claudeApiStore.get('orgId')
    if (storedOrgId) {
      return storedOrgId
    }

    // Check cache
    if (this.cachedOrgId) {
      return this.cachedOrgId
    }

    // Fetch from API
    const orgs = await this.fetchOrganizations(sessionKey)
    if (orgs.length === 0) {
      throw new Error('No organizations found')
    }

    // Use the first organization
    this.cachedOrgId = orgs[0].uuid
    claudeApiStore.set('orgId', this.cachedOrgId)

    return this.cachedOrgId
  }

  /**
   * Fetch usage data from Claude.ai API
   */
  async fetchUsage(sessionKey?: string): Promise<ClaudeApiUsage> {
    const key = sessionKey || claudeApiStore.get('sessionKey')
    if (!key) {
      throw new Error('No session key configured')
    }

    const orgId = await this.getOrganizationId(key)
    const url = `${BASE_URL}/organizations/${orgId}/usage`

    const response = await fetchJson<UsageResponse>(url, key)

    return {
      fiveHour: response.five_hour
        ? {
            utilization: response.five_hour.utilization,
            resetsAt: response.five_hour.resets_at
          }
        : null,
      sevenDay: response.seven_day
        ? {
            utilization: response.seven_day.utilization,
            resetsAt: response.seven_day.resets_at
          }
        : null,
      sevenDayOpus: response.seven_day_opus
        ? {
            utilization: response.seven_day_opus.utilization,
            resetsAt: response.seven_day_opus.resets_at
          }
        : null,
      sevenDaySonnet: response.seven_day_sonnet
        ? {
            utilization: response.seven_day_sonnet.utilization,
            resetsAt: response.seven_day_sonnet.resets_at
          }
        : null
    }
  }

  /**
   * Test connection with a session key
   */
  async testConnection(sessionKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.fetchOrganizations(sessionKey)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Clear cached organization ID
   */
  clearCache(): void {
    this.cachedOrgId = null
    claudeApiStore.delete('orgId')
  }

  // ========== Settings Management ==========

  /**
   * Save session key
   */
  saveSessionKey(sessionKey: string): void {
    claudeApiStore.set('sessionKey', sessionKey)
  }

  /**
   * Get session key (masked for display)
   */
  getSessionKeyMasked(): string | null {
    const key = claudeApiStore.get('sessionKey')
    if (!key) return null
    if (key.length > 20) {
      return key.substring(0, 12) + '...' + key.substring(key.length - 8)
    }
    return '***'
  }

  /**
   * Check if session key is configured
   */
  hasSessionKey(): boolean {
    return !!claudeApiStore.get('sessionKey')
  }

  /**
   * Clear session key
   */
  clearSessionKey(): void {
    claudeApiStore.delete('sessionKey')
    this.clearCache()
  }

  /**
   * Get data source preference
   */
  getDataSource(): 'files' | 'api' {
    return claudeApiStore.get('dataSource') || 'files'
  }

  /**
   * Set data source preference
   */
  setDataSource(source: 'files' | 'api'): void {
    claudeApiStore.set('dataSource', source)
  }
}

export const claudeApiService = new ClaudeApiService()
