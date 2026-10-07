import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LockIcon,
  RepoIcon,
  SearchIcon,
  StarIcon,
} from '@primer/octicons-react'
import { Header } from './components/Header'
import { RepoCard } from './components/RepoCard'
import { TokenGate } from './components/TokenGate'
import { GitHubApiError, GitHubClient } from './lib/github'
import type {
  GitHubRepo,
  GitHubUser,
  RateLimitInfo,
  SortMode,
  VisibilityFilter,
} from './types'

const PUBLIC_USERNAME = 'brahmiamine'
const PAGE_SIZE = 36

function getInitialTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem('githome-theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function errorMessage(error: unknown) {
  if (error instanceof GitHubApiError && error.status === 401) {
    return 'Token GitHub invalide ou expiré. Vérifie le token puis réessaie.'
  }
  if (error instanceof GitHubApiError && error.status === 403) {
    return 'GitHub a refusé la requête. Vérifie les permissions du token ou la limite API.'
  }
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.'
}

export default function App() {
  const bootedRef = useRef(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme)
  const [client, setClient] = useState(() => new GitHubClient())
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null)
  const [publicMode, setPublicMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('pushed')
  const [page, setPage] = useState(1)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('githome-theme', theme)
  }, [theme])

  async function loadDashboard(nextClient: GitHubClient, nextUser: GitHubUser, isPublic: boolean) {
    const [nextRepos, nextRateLimit] = await Promise.all([
      nextClient.listRepositories(isPublic ? nextUser.login : undefined),
      nextClient.getRateLimit(),
    ])
    setClient(nextClient)
    setUser(nextUser)
    setRepos(nextRepos)
    setRateLimit(nextRateLimit)
    setPublicMode(isPublic)
    setPage(1)
  }

  async function connectWithToken(token: string) {
    setLoading(true)
    setError(null)
    try {
      const nextClient = new GitHubClient(token)
      const nextUser = await nextClient.getAuthenticatedUser()
      await loadDashboard(nextClient, nextUser, false)
      sessionStorage.setItem('githome-token', token)
    } catch (err) {
      sessionStorage.removeItem('githome-token')
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function connectPublic() {
    setLoading(true)
    setError(null)
    try {
      const nextClient = new GitHubClient()
      const nextUser = await nextClient.getPublicUser(PUBLIC_USERNAME)
      await loadDashboard(nextClient, nextUser, true)
      sessionStorage.removeItem('githome-token')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    const token = sessionStorage.getItem('githome-token')
    if (token) void connectWithToken(token)
  }, [])

  async function refresh() {
    if (!user) return
    setRefreshing(true)
    setError(null)
    try {
      const [nextRepos, nextRateLimit] = await Promise.all([
        client.listRepositories(publicMode ? user.login : undefined),
        client.getRateLimit(),
      ])
      setRepos(nextRepos)
      setRateLimit(nextRateLimit)
      setRefreshVersion((value) => value + 1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRefreshing(false)
    }
  }

  function logout() {
    sessionStorage.removeItem('githome-token')
    setUser(null)
    setRepos([])
    setRateLimit(null)
    setClient(new GitHubClient())
    setPublicMode(false)
    setError(null)
    setSearch('')
    setVisibility('all')
    setPage(1)
  }

  const stats = useMemo(() => {
    const privateRepos = repos.filter((repo) => repo.private).length
    return {
      total: repos.length,
      private: privateRepos,
      public: repos.length - privateRepos,
      stars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    }
  }, [repos])

  const filteredRepos = useMemo(() => {
    const query = search.trim().toLowerCase()
    const result = repos.filter((repo) => {
      if (visibility === 'private' && !repo.private) return false
      if (visibility === 'public' && repo.private) return false
      if (!query) return true

      return [
        repo.name,
        repo.full_name,
        repo.description || '',
        repo.language || '',
        ...repo.topics,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })

    return result.sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name)
      if (sortMode === 'stars') return b.stargazers_count - a.stargazers_count
      if (sortMode === 'updated') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
      return new Date(b.pushed_at || 0).getTime() - new Date(a.pushed_at || 0).getTime()
    })
  }, [repos, search, visibility, sortMode])

  useEffect(() => {
    setPage(1)
  }, [search, visibility, sortMode])

  const pageCount = Math.max(1, Math.ceil(filteredRepos.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleRepos = filteredRepos.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  if (!user) {
    return (
      <TokenGate
        loading={loading}
        error={error}
        onTokenConnect={connectWithToken}
        onPublicConnect={connectPublic}
      />
    )
  }

  return (
    <div className="app-shell">
      <Header
        user={user}
        rateLimit={rateLimit}
        theme={theme}
        refreshing={refreshing}
        onRefresh={refresh}
        onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        onLogout={logout}
      />

      <main className="dashboard">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">GitHub workspace</p>
            <h1>Repositories</h1>
            <p>
              Vue consolidée des projets accessibles à <strong>@{user.login}</strong>.
              {publicMode && ' Mode public : les repositories privés ne sont pas visibles.'}
            </p>
          </div>
          {publicMode && (
            <button className="btn btn-primary" onClick={logout}>
              Connecter les repos privés
            </button>
          )}
        </section>

        {error && <div className="global-error">{error}</div>}

        <section className="stats-grid" aria-label="Résumé GitHub">
          <div className="stat-card">
            <RepoIcon size={20} />
            <div><strong>{stats.total}</strong><span>Repositories</span></div>
          </div>
          <div className="stat-card">
            <span className="public-dot" />
            <div><strong>{stats.public}</strong><span>Publics</span></div>
          </div>
          <div className="stat-card">
            <LockIcon size={18} />
            <div><strong>{stats.private}</strong><span>Privés</span></div>
          </div>
          <div className="stat-card">
            <StarIcon size={20} />
            <div><strong>{stats.stars.toLocaleString('fr-FR')}</strong><span>Stars</span></div>
          </div>
        </section>

        <section className="toolbar">
          <div className="search-box">
            <SearchIcon size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un repo par nom, langage, topic…"
              aria-label="Rechercher un repository"
            />
          </div>

          <div className="filter-group">
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as VisibilityFilter)}
              aria-label="Filtrer par visibilité"
            >
              <option value="all">Tous</option>
              <option value="public">Publics</option>
              <option value="private">Privés</option>
            </select>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              aria-label="Trier les repositories"
            >
              <option value="pushed">Dernier push</option>
              <option value="updated">Dernière mise à jour</option>
              <option value="name">Nom</option>
              <option value="stars">Stars</option>
            </select>
          </div>
        </section>

        <div className="results-line">
          <span>{filteredRepos.length} repository{filteredRepos.length > 1 ? 's' : ''}</span>
          {search && <span>pour « {search} »</span>}
        </div>

        {visibleRepos.length > 0 ? (
          <section className="repo-list" aria-label="Repositories">
            {visibleRepos.map((repo) => (
              <RepoCard
                key={`${repo.id}-${refreshVersion}`}
                repo={repo}
                client={client}
              />
            ))}
          </section>
        ) : (
          <section className="no-results">
            <RepoIcon size={28} />
            <h2>Aucun repository trouvé</h2>
            <p>Essaie de modifier la recherche ou le filtre de visibilité.</p>
          </section>
        )}

        {pageCount > 1 && (
          <nav className="pagination" aria-label="Pagination">
            <button
              className="btn btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              ← Précédent
            </button>
            <span>Page {currentPage} sur {pageCount}</span>
            <button
              className="btn btn-secondary"
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              Suivant →
            </button>
          </nav>
        )}
      </main>

      <footer className="footer">
        <span>GitHome · React + Vite · GitHub REST API · 100 % frontend</span>
      </footer>
    </div>
  )
}
