import Anthropic from '@anthropic-ai/sdk'

// Lazy initialization - only create client when needed
let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic()
  }
  return client
}

export interface IssueRecommendation {
  number: number
  title: string
  reasoning: string
  includeInRelease: boolean
}

export interface RecommendationResult {
  recommendations: IssueRecommendation[]
  summary: string
}

export interface RecommendationError {
  error: string
}

export async function recommendIssuesForRelease(
  issues: Array<{ number: number; title: string; body?: string; labels?: string[] }>,
  version: string
): Promise<RecommendationResult | RecommendationError> {
  // Check for API key first
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error:
        'ANTHROPIC_API_KEY not set. Please set it in your environment variables or start the app with the key set.'
    }
  }

  if (issues.length === 0) {
    return { error: 'No issues provided' }
  }

  const issueList = issues
    .map(
      (i) =>
        `#${i.number}: ${i.title}${i.labels?.length ? ` [${i.labels.join(', ')}]` : ''}${i.body ? `\n   ${i.body.slice(0, 200)}${i.body.length > 200 ? '...' : ''}` : ''}`
    )
    .join('\n\n')

  try {
    const anthropic = getClient()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are helping plan a software release ${version}.

Analyze these open issues and recommend which should be grouped into this release. Consider:
- Thematic coherence (related features/fixes that make sense together)
- Dependencies between issues (some may need to ship together)
- Reasonable scope for a single release (not too many issues)
- Priority and impact

Issues:
${issueList}

Respond ONLY with valid JSON in this exact format (no markdown code blocks, just raw JSON):
{
  "summary": "Brief 1-2 sentence explanation of the release theme",
  "recommendations": [
    { "number": 1, "includeInRelease": true, "reasoning": "Brief reason why this issue fits or doesn't fit" }
  ]
}

Include ALL issues in the recommendations array, with includeInRelease set to true or false for each.`
        }
      ]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Try to parse the JSON, handling potential markdown code blocks
    let jsonText = text.trim()
    if (jsonText.startsWith('```')) {
      // Remove markdown code block
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(jsonText) as {
      summary: string
      recommendations: Array<{
        number: number
        includeInRelease: boolean
        reasoning: string
      }>
    }

    return {
      summary: parsed.summary,
      recommendations: parsed.recommendations.map((r) => ({
        number: r.number,
        title: issues.find((i) => i.number === r.number)?.title || '',
        reasoning: r.reasoning,
        includeInRelease: r.includeInRelease
      }))
    }
  } catch (error) {
    console.error('LLM recommendation error:', error)

    // Check for Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return { error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.' }
      }
      if (error.status === 429) {
        return { error: 'Rate limited. Please try again later.' }
      }
      if (error.status === 400) {
        return { error: `Bad request: ${error.message}` }
      }
      return { error: `API error (${error.status}): ${error.message}` }
    }

    // Check for network errors
    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return { error: 'Network error. Please check your internet connection.' }
      }
      return { error: error.message }
    }

    return { error: 'LLM recommendation failed. Check console for details.' }
  }
}
