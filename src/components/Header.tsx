import {
  MarkGithubIcon,
  MoonIcon,
  RepoIcon,
  SignOutIcon,
  SunIcon,
  SyncIcon,
} from '@primer/octicons-react'
import type { GitHubUser, RateLimitInfo } from '../types'

interface HeaderProps {
  user: GitHubUser
  rateLimit: RateLimitInfo | null
  theme: 'dark' | 'light'
  refreshing: boolean
  onRefresh: () => void
  onToggleTheme: () => void
  onLogout: () => void
}

export function Header({
  user,
  rateLimit,
  theme,
  refreshing,
  onRefresh,
  onToggleTheme,
  onLogout,
}: HeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <MarkGithubIcon size={32} />
        <span>GitHome</span>
        <span className="beta-badge">dashboard</span>
      </div>

      <div className="topbar-actions">
        {rateLimit && (
          <div
            className="rate-limit"
            title={`Limite API GitHub : ${rateLimit.remaining}/${rateLimit.limit}`}
          >
            <RepoIcon size={14} />
            <span>{rateLimit.remaining.toLocaleString('fr-FR')} API</span>
          </div>
        )}

        <button
          className="icon-btn"
          onClick={onRefresh}
          title="Rafraîchir"
          aria-label="Rafraîchir les repositories"
          disabled={refreshing}
        >
          <SyncIcon size={16} className={refreshing ? 'spin' : ''} />
        </button>

        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title="Changer de thème"
          aria-label="Changer de thème"
        >
          {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>

        <a className="user-chip" href={user.html_url} target="_blank" rel="noreferrer">
          <img src={user.avatar_url} alt="" />
          <span>{user.login}</span>
        </a>

        <button
          className="icon-btn"
          onClick={onLogout}
          title="Déconnexion"
          aria-label="Déconnexion"
        >
          <SignOutIcon size={16} />
        </button>
      </div>
    </header>
  )
}
