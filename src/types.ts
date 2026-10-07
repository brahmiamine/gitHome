export type VisibilityFilter = 'all' | 'public' | 'private'
export type SortMode = 'pushed' | 'updated' | 'name' | 'stars'

export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  public_repos: number
  total_private_repos?: number
}

export interface GitHubLicense {
  key: string
  name: string
  spdx_id: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description: string | null
  fork: boolean
  homepage: string | null
  language: string | null
  forks_count: number
  stargazers_count: number
  watchers_count: number
  open_issues_count: number
  size: number
  default_branch: string
  topics: string[]
  visibility: string
  archived: boolean
  disabled: boolean
  has_issues: boolean
  has_projects: boolean
  has_wiki: boolean
  has_pages: boolean
  pushed_at: string | null
  updated_at: string
  created_at: string
  owner: {
    login: string
    avatar_url: string
    html_url: string
  }
  license: GitHubLicense | null
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  draft: boolean
  merged_at: string | null
  updated_at: string
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  head: { ref: string }
  base: { ref: string }
}

export interface GitHubWorkflowRun {
  id: number
  name: string
  display_title: string
  status: string | null
  conclusion: string | null
  event: string
  html_url: string
  run_number: number
  created_at: string
  updated_at: string
  head_branch: string | null
  actor?: {
    login: string
    avatar_url: string
  }
}

export interface GitHubDeployment {
  id: number
  environment: string
  description: string | null
  created_at: string
  updated_at: string
  ref: string
  sha: string
  creator?: {
    login: string
    avatar_url: string
  }
}

export interface GitHubDeploymentStatus {
  id: number
  state: string
  description: string | null
  environment_url: string | null
  log_url: string | null
  created_at: string
}

export interface GitHubPages {
  html_url: string
  status: string
  cname: string | null
}

export interface GitHubCommit {
  sha: string
  html_url: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    } | null
  }
  author?: {
    login: string
    avatar_url: string
  } | null
}

export interface GitHubRelease {
  id: number
  tag_name: string
  name: string | null
  html_url: string
  published_at: string | null
  prerelease: boolean
  draft: boolean
}

export interface GitHubEnvironment {
  id: number
  name: string
  html_url?: string
}

export interface RepoDetails {
  recentPulls: GitHubPullRequest[]
  openPullCount: number
  workflowRuns: GitHubWorkflowRun[]
  workflowRunTotal: number
  deployments: Array<GitHubDeployment & { latestStatus?: GitHubDeploymentStatus }>
  pages: GitHubPages | null
  latestCommit: GitHubCommit | null
  release: GitHubRelease | null
  languages: Record<string, number>
  branchCount: number
  branchCountCapped: boolean
  environments: GitHubEnvironment[]
}

export interface RateLimitInfo {
  remaining: number
  limit: number
  reset: number
}
