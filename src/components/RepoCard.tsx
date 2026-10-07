import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircleFillIcon,
  ClockIcon,
  CodeIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  IssueOpenedIcon,
  LockIcon,
  RepoForkedIcon,
  RocketIcon,
  StarIcon,
  SyncIcon,
  WorkflowIcon,
  XCircleFillIcon,
} from '@primer/octicons-react'
import { GitHubClient } from '../lib/github'
import {
  compactNumber,
  firstLine,
  formatRepoSize,
  languageColors,
  languagePercentages,
  shortSha,
  timeAgo,
} from '../lib/format'
import type { GitHubRepo, RepoDetails } from '../types'

interface RepoCardProps {
  repo: GitHubRepo
  client: GitHubClient
}

type DetailsTab = 'pr' | 'run' | 'dep' | 'info'

const panelTitles: Record<DetailsTab, string> = {
  pr: 'Pull Requests',
  run: 'Actions',
  dep: 'Déploiements',
  info: 'Repository',
}

function StatusIcon({ status, conclusion }: { status?: string | null; conclusion?: string | null }) {
  if (status && status !== 'completed' && status !== 'success' && status !== 'failure' && status !== 'error') {
    if (status === 'queued' || status === 'waiting' || status === 'pending' || status === 'inactive') {
      return <ClockIcon className="status-muted" size={16} />
    }
    return <SyncIcon className="spin status-progress" size={16} />
  }
  if (conclusion === 'success' || status === 'success') {
    return <CheckCircleFillIcon className="status-success" size={16} />
  }
  if (
    conclusion === 'failure' ||
    conclusion === 'cancelled' ||
    conclusion === 'timed_out' ||
    status === 'failure' ||
    status === 'error'
  ) {
    return <XCircleFillIcon className="status-danger" size={16} />
  }
  return <ClockIcon className="status-muted" size={16} />
}

export function RepoCard({ repo, client }: RepoCardProps) {
  const cardRef = useRef<HTMLElement | null>(null)
  const startedRef = useRef(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [details, setDetails] = useState<RepoDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [openTab, setOpenTab] = useState<DetailsTab | null>(null)

  useEffect(() => {
    const node = cardRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '320px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldLoad || startedRef.current) return
    startedRef.current = true
    setLoading(true)

    client
      .getRepoDetails(repo.full_name)
      .then(setDetails)
      .catch((error: unknown) => {
        setDetailsError(error instanceof Error ? error.message : 'Impossible de charger les détails')
      })
      .finally(() => setLoading(false))
  }, [client, repo.full_name, shouldLoad])

  const languages = useMemo(
    () => languagePercentages(details?.languages ?? {}).slice(0, 5),
    [details?.languages],
  )

  const deploymentUrl = details?.deployments.find((item) => item.latestStatus?.environment_url)
    ?.latestStatus?.environment_url
  const appUrl = deploymentUrl || details?.pages?.html_url || repo.homepage || null

  const tabs = details
    ? [
        {
          key: 'pr' as const,
          Icon: GitPullRequestIcon,
          count: `${details.openPullCount}${details.openPullCount === 100 ? '+' : ''}`,
          label: 'PR',
          title: 'Pull Requests ouvertes',
        },
        {
          key: 'run' as const,
          Icon: WorkflowIcon,
          count: compactNumber(details.workflowRunTotal),
          label: 'Actions',
          title: 'Runs GitHub Actions',
        },
        {
          key: 'dep' as const,
          Icon: RocketIcon,
          count: String(details.deployments.length),
          label: 'Déploi.',
          title: 'Déploiements récents',
        },
        {
          key: 'info' as const,
          Icon: CodeIcon,
          count: String(languages.length),
          label: 'Détails',
          title: 'Commit, release, licence et langages',
        },
      ]
    : []

  const panelLinks: Record<DetailsTab, string> = {
    pr: `${repo.html_url}/pulls`,
    run: `${repo.html_url}/actions`,
    dep: `${repo.html_url}/deployments`,
    info: repo.html_url,
  }

  return (
    <article className="repo-card" ref={cardRef}>
      <div className="repo-card-head">
        <div className="repo-identity">
          <img className="repo-avatar" src={repo.owner.avatar_url} alt="" />
          <div className="repo-title-wrap">
            <div className="repo-title-row">
              <a className="repo-name" href={repo.html_url} target="_blank" rel="noreferrer">
                {repo.name}
              </a>
              <span className="visibility-badge">
                {repo.private ? <LockIcon size={10} /> : null}
                {repo.private ? 'Private' : 'Public'}
              </span>
              {repo.archived && <span className="state-badge state-muted">Archived</span>}
              {repo.fork && <span className="state-badge state-muted">Fork</span>}
            </div>
            <span className="repo-owner">{repo.owner.login}</span>
          </div>
        </div>

        <a className="btn btn-small btn-secondary" href={repo.html_url} target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </div>

      <p className="repo-description">{repo.description || 'Aucune description pour ce repository.'}</p>

      <div className="topic-row">
        {repo.topics.slice(0, 6).map((topic) => (
          <span className="topic" key={topic}>{topic}</span>
        ))}
        {repo.topics.length > 6 && <span className="topic">+{repo.topics.length - 6}</span>}
      </div>

      <div className="repo-metrics">
        <span title="Langage principal">
          <CodeIcon size={14} /> {repo.language || '—'}
        </span>
        <span title="Stars">
          <StarIcon size={14} /> {compactNumber(repo.stargazers_count)}
        </span>
        <span title="Forks">
          <RepoForkedIcon size={14} /> {compactNumber(repo.forks_count)}
        </span>
        <span title="Issues et Pull Requests ouverts">
          <IssueOpenedIcon size={14} /> {compactNumber(repo.open_issues_count)}
        </span>
        <span title="Branche par défaut">
          <GitBranchIcon size={14} /> {repo.default_branch}
        </span>
        <span title="Taille du repository">{formatRepoSize(repo.size)}</span>
      </div>

      <div className="repo-foot-row">
        <span>Push {timeAgo(repo.pushed_at)}</span>
        <div className="repo-links">
          {appUrl && (
            <a className="btn btn-small btn-primary" href={appUrl} target="_blank" rel="noreferrer">
              Application
            </a>
          )}
        </div>
      </div>

      <div className="rich-details">
        {loading && (
          <div className="details-loading">
            <SyncIcon className="spin" size={16} />
            Chargement de l'activité GitHub…
          </div>
        )}

        {detailsError && (
          <div className="details-error">
            Certaines informations n'ont pas pu être chargées : {detailsError}
          </div>
        )}

        {details && (
          <>
            <div className="details-tabs" role="tablist" aria-label="Activité du repository">
              {tabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  key={tab.key}
                  className={`details-tab${openTab === tab.key ? ' active' : ''}`}
                  aria-selected={openTab === tab.key}
                  aria-expanded={openTab === tab.key}
                  title={tab.title}
                  onClick={() => setOpenTab((value) => (value === tab.key ? null : tab.key))}
                >
                  <tab.Icon size={15} />
                  <strong>{tab.count}</strong>
                  <span>{tab.label}</span>
                  <i aria-hidden="true">{openTab === tab.key ? '▴' : '▾'}</i>
                </button>
              ))}
            </div>

            {openTab && (
              <section className="details-panel" role="tabpanel">
                <div className="panel-title">
                  <h3>{panelTitles[openTab]}</h3>
                  <a href={panelLinks[openTab]} target="_blank" rel="noreferrer">Voir tout</a>
                </div>

                {openTab === 'pr' && (
                  details.recentPulls.length === 0 ? (
                    <p className="empty-state">Aucune Pull Request récente.</p>
                  ) : (
                    <div className="activity-list">
                      {details.recentPulls.slice(0, 4).map((pr) => (
                        <a className="activity-item" href={pr.html_url} target="_blank" rel="noreferrer" key={pr.id}>
                          <span className={`pr-dot ${pr.draft ? 'draft' : pr.merged_at ? 'merged' : pr.state}`} />
                          <span className="activity-main">
                            <strong>{pr.title}</strong>
                            <small>
                              #{pr.number} · {pr.head.ref} → {pr.base.ref} · {timeAgo(pr.updated_at)}
                            </small>
                          </span>
                          <span className="activity-state">
                            {pr.draft ? 'Draft' : pr.merged_at ? 'Merged' : pr.state}
                          </span>
                        </a>
                      ))}
                    </div>
                  )
                )}

                {openTab === 'run' && (
                  details.workflowRuns.length === 0 ? (
                    <p className="empty-state">Aucun workflow récent ou permission Actions absente.</p>
                  ) : (
                    <div className="activity-list">
                      {details.workflowRuns.slice(0, 4).map((run) => (
                        <a className="activity-item" href={run.html_url} target="_blank" rel="noreferrer" key={run.id}>
                          <StatusIcon status={run.status} conclusion={run.conclusion} />
                          <span className="activity-main">
                            <strong>{run.name}</strong>
                            <small>
                              #{run.run_number} · {run.head_branch || '—'} · {run.event} · {timeAgo(run.updated_at)}
                            </small>
                          </span>
                          <span className="activity-state">{run.conclusion || run.status || '—'}</span>
                        </a>
                      ))}
                    </div>
                  )
                )}

                {openTab === 'dep' && (
                  details.deployments.length === 0 ? (
                    <p className="empty-state">Aucun déploiement GitHub récent.</p>
                  ) : (
                    <div className="activity-list">
                      {details.deployments.slice(0, 4).map((deployment) => (
                        <div className="activity-item" key={deployment.id}>
                          <StatusIcon status={deployment.latestStatus?.state} />
                          <span className="activity-main">
                            <strong>{deployment.environment || 'deployment'}</strong>
                            <small>
                              {deployment.ref} · {shortSha(deployment.sha)} · {timeAgo(deployment.updated_at)}
                            </small>
                          </span>
                          {deployment.latestStatus?.environment_url ? (
                            <a
                              className="activity-link"
                              href={deployment.latestStatus.environment_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ouvrir
                            </a>
                          ) : (
                            <span className="activity-state">{deployment.latestStatus?.state || '—'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {openTab === 'info' && (
                  <>
                    <dl className="repo-info-list">
                      <div>
                        <dt>Dernier commit</dt>
                        <dd>
                          {details.latestCommit ? (
                            <a href={details.latestCommit.html_url} target="_blank" rel="noreferrer">
                              {shortSha(details.latestCommit.sha)} · {firstLine(details.latestCommit.commit.message)}
                            </a>
                          ) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Release</dt>
                        <dd>
                          {details.release ? (
                            <a href={details.release.html_url} target="_blank" rel="noreferrer">
                              {details.release.name || details.release.tag_name}
                            </a>
                          ) : 'Aucune'}
                        </dd>
                      </div>
                      <div>
                        <dt>Licence</dt>
                        <dd>{repo.license?.spdx_id || 'Non définie'}</dd>
                      </div>
                      <div>
                        <dt>Environnements</dt>
                        <dd>
                          {details.environments.length
                            ? details.environments.map((environment) => environment.name).join(', ')
                            : '—'}
                        </dd>
                      </div>
                    </dl>

                    {languages.length > 0 && (
                      <div className="language-panel" aria-label="Langages">
                        <div className="language-bar">
                          {languages.map((language) => (
                            <span
                              key={language.name}
                              style={{
                                width: `${language.percent}%`,
                                backgroundColor: languageColors[language.name] || '#8c959f',
                              }}
                            />
                          ))}
                        </div>
                        <div className="language-legend">
                          {languages.map((language) => (
                            <span key={language.name}>
                              {language.name} <b>{Math.round(language.percent)}%</b>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </article>
  )
}
