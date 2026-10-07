import type {
  GitHubCommit,
  GitHubDeployment,
  GitHubDeploymentStatus,
  GitHubEnvironment,
  GitHubPages,
  GitHubPullRequest,
  GitHubRelease,
  GitHubRepo,
  GitHubUser,
  GitHubWorkflowRun,
  RateLimitInfo,
  RepoDetails,
} from '../types'

const API_ROOT = 'https://api.github.com'
const API_VERSION = '2022-11-28'

export class GitHubApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
  }
}

function encodeRepo(fullName: string) {
  return fullName
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
}

export class GitHubClient {
  private token: string | null

  constructor(token?: string | null) {
    this.token = token?.trim() || null
  }

  private async request<T>(path: string, options?: { allow404?: boolean; allow403?: boolean; allow409?: boolean }): Promise<T | null> {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_ROOT}${path}`, { headers })

    if (response.status === 404 && options?.allow404) return null
    if (response.status === 403 && options?.allow403) return null\n    if (response.status === 409 && options?.allow409) return null

    if (!response.ok) {
      let message = `GitHub API: erreur ${response.status}`
      try {
        const body = (await response.json()) as { message?: string }
        if (body.message) message = body.message
      } catch {
        // Keep the generic message if GitHub did not return JSON.
      }
      throw new GitHubApiError(message, response.status)
    }

    if (response.status === 204) return null
    return (await response.json()) as T
  }

  async getAuthenticatedUser(): Promise<GitHubUser> {
    const user = await this.request<GitHubUser>('/user')
    if (!user) throw new GitHubApiError('Utilisateur introuvable', 404)
    return user
  }

  async getPublicUser(username: string): Promise<GitHubUser> {
    const user = await this.request<GitHubUser>(`/users/${encodeURIComponent(username)}`)
    if (!user) throw new GitHubApiError('Utilisateur introuvable', 404)
    return user
  }

  async listRepositories(username?: string): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = []

    for (let page = 1; page <= 10; page += 1) {
      const path = this.token
        ? `/user/repos?per_page=100&page=${page}&sort=pushed&direction=desc&affiliation=owner,collaborator,organization_member&visibility=all`
        : `/users/${encodeURIComponent(username || '')}/repos?per_page=100&page=${page}&sort=pushed&direction=desc&type=owner`

      const chunk = (await this.request<GitHubRepo[]>(path)) ?? []
      repos.push(...chunk)
      if (chunk.length < 100) break
    }

    return repos
  }

  async getRateLimit(): Promise<RateLimitInfo | null> {
    const payload = await this.request<{
      resources: { core: { remaining: number; limit: number; reset: number } }
    }>('/rate_limit', { allow403: true })

    return payload?.resources.core ?? null
  }

  async getRepoDetails(fullName: string): Promise<RepoDetails> {
    const repo = encodeRepo(fullName)

    const [
      recentPullsResult,
      openPullsResult,
      workflowResult,
      deploymentsResult,
      pagesResult,
      commitsResult,
      releaseResult,
      languagesResult,
      branchesResult,
      environmentsResult,
    ] = await Promise.allSettled([
      this.request<GitHubPullRequest[]>(`/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=6`),
      this.request<GitHubPullRequest[]>(`/repos/${repo}/pulls?state=open&sort=updated&direction=desc&per_page=100`),
      this.request<{ total_count: number; workflow_runs: GitHubWorkflowRun[] }>(
        `/repos/${repo}/actions/runs?per_page=5`,
        { allow403: true },
      ),
      this.request<GitHubDeployment[]>(`/repos/${repo}/deployments?per_page=5`, {
        allow403: true,
      }),
      this.request<GitHubPages>(`/repos/${repo}/pages`, { allow404: true, allow403: true }),
      this.request<GitHubCommit[]>(`/repos/${repo}/commits?per_page=1`, { allow409: true }),
      this.request<GitHubRelease>(`/repos/${repo}/releases/latest`, { allow404: true }),
      this.request<Record<string, number>>(`/repos/${repo}/languages`),
      this.request<Array<{ name: string }>>(`/repos/${repo}/branches?per_page=100`),
      this.request<{ total_count: number; environments: GitHubEnvironment[] }>(
        `/repos/${repo}/environments?per_page=30`,
        { allow403: true, allow404: true },
      ),
    ])

    const value = <T,>(result: PromiseSettledResult<T | null>, fallback: T): T =>
      result.status === 'fulfilled' && result.value !== null ? result.value : fallback

    const deployments = value(deploymentsResult, [] as GitHubDeployment[])
    const deploymentsWithStatus = await Promise.all(
      deployments.map(async (deployment) => {
        try {
          const statuses = await this.request<GitHubDeploymentStatus[]>(
            `/repos/${repo}/deployments/${deployment.id}/statuses?per_page=1`,
            { allow403: true },
          )
          return { ...deployment, latestStatus: statuses?.[0] }
        } catch {
          return deployment
        }
      }),
    )

    const workflow = value(workflowResult, { total_count: 0, workflow_runs: [] })
    const branches = value(branchesResult, [] as Array<{ name: string }>)
    const environments = value(environmentsResult, { total_count: 0, environments: [] })

    return {
      recentPulls: value(recentPullsResult, [] as GitHubPullRequest[]),
      openPullCount: value(openPullsResult, [] as GitHubPullRequest[]).length,
      workflowRuns: workflow.workflow_runs,
      workflowRunTotal: workflow.total_count,
      deployments: deploymentsWithStatus,
      pages: value(pagesResult, null as GitHubPages | null),
      latestCommit: value(commitsResult, [] as GitHubCommit[])[0] ?? null,
      release: value(releaseResult, null as GitHubRelease | null),
      languages: value(languagesResult, {} as Record<string, number>),
      branchCount: branches.length,
      branchCountCapped: branches.length === 100,
      environments: environments.environments,
    }
  }
}
