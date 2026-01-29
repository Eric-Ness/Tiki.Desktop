import { spawn } from 'child_process'

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

/**
 * Run a prompt through Claude CLI and get the response
 * Uses stdin to avoid command line length limits on Windows
 */
async function runClaudePrompt(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', '--output-format', 'text'], {
      shell: true,
      env: { ...process.env }
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim())
      } else {
        reject(new Error(stderr || `Claude CLI exited with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`))
    })

    // Write prompt to stdin and close it
    proc.stdin.write(prompt)
    proc.stdin.end()
  })
}

export async function recommendIssuesForRelease(
  issues: Array<{ number: number; title: string; body?: string; labels?: string[] }>,
  version: string
): Promise<RecommendationResult | RecommendationError> {
  if (issues.length === 0) {
    return { error: 'No issues provided' }
  }

  const issueList = issues
    .map(
      (i) =>
        `#${i.number}: ${i.title}${i.labels?.length ? ` [${i.labels.join(', ')}]` : ''}${i.body ? `\n   ${i.body.slice(0, 200)}${i.body.length > 200 ? '...' : ''}` : ''}`
    )
    .join('\n\n')

  const prompt = `You are helping plan a software release ${version}.

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

  try {
    const response = await runClaudePrompt(prompt)

    // Try to parse the JSON, handling potential markdown code blocks
    let jsonText = response.trim()
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

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('ENOENT')) {
        return { error: 'Claude CLI not found. Make sure "claude" is installed and in your PATH.' }
      }
      if (error.message.includes('spawn')) {
        return { error: 'Failed to run Claude CLI. Check that it is properly installed.' }
      }
      return { error: error.message }
    }

    return { error: 'LLM recommendation failed. Check console for details.' }
  }
}
