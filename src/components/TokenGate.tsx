import { FormEvent, useState } from 'react'
import { KeyIcon, MarkGithubIcon, ShieldLockIcon } from '@primer/octicons-react'

interface TokenGateProps {
  loading: boolean
  error: string | null
  onTokenConnect: (token: string) => void
  onPublicConnect: () => void
}

export function TokenGate({
  loading,
  error,
  onTokenConnect,
  onPublicConnect,
}: TokenGateProps) {
  const [token, setToken] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (token.trim()) onTokenConnect(token.trim())
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-logo">
          <MarkGithubIcon size={44} />
        </div>
        <p className="eyebrow">GitHome</p>
        <h1 id="auth-title">Tous tes projets GitHub, au même endroit.</h1>
        <p className="auth-lead">
          Repositories, Pull Requests, Actions, déploiements, Pages, commits et
          activité récente dans un dashboard inspiré de GitHub.
        </p>

        <form className="token-form" onSubmit={submit}>
          <label htmlFor="github-token">Fine-grained personal access token</label>
          <div className="input-with-icon">
            <KeyIcon size={16} />
            <input
              id="github-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="github_pat_••••••••••••••••"
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading || !token.trim()}>
            {loading ? 'Connexion…' : 'Connecter GitHub'}
          </button>
        </form>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-separator"><span>ou</span></div>

        <button className="btn btn-secondary btn-block" onClick={onPublicConnect} disabled={loading}>
          Voir uniquement les repos publics
        </button>

        <div className="security-note">
          <ShieldLockIcon size={18} />
          <div>
            <strong>Aucun backend.</strong>
            <span>
              Le token reste uniquement dans <code>sessionStorage</code> et est
              supprimé quand tu te déconnectes ou fermes la session du navigateur.
            </span>
          </div>
        </div>

        <a
          className="auth-link"
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noreferrer"
        >
          Créer un fine-grained token sur GitHub
        </a>
      </section>
    </main>
  )
}
