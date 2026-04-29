import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  buildCapabilityReport,
  categoryOrder,
  collectRuntimeSnapshot,
  type ApiActionId,
  type CapabilityCard,
  type RuntimeSnapshot,
} from './lib/browserSupport'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const actionLabels: Record<ApiActionId, string> = {
  clipboard: 'Copy page URL',
  install: 'Install app',
  notification: 'Request permission',
  share: 'Share page',
  vibrate: 'Vibrate device',
}

function App() {
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const snapshot = useMemo<RuntimeSnapshot>(() => {
    void refreshVersion
    return collectRuntimeSnapshot(window, installPromptAvailable)
  }, [installPromptAvailable, refreshVersion])

  const refreshSnapshot = useCallback(() => {
    setRefreshVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent
      promptEvent.preventDefault()
      installPromptRef.current = promptEvent
      setInstallPromptAvailable(true)
    }

    const onInstalled = () => {
      installPromptRef.current = null
      setInstallPromptAvailable(false)
      setActionMessage('App installed. Open it from your launcher to test standalone mode.')
      refreshSnapshot()
    }

    const onConnectivityChange = () => {
      refreshSnapshot()
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('online', onConnectivityChange)
    window.addEventListener('offline', onConnectivityChange)

    navigator.serviceWorker?.ready
      .then(() => {
        refreshSnapshot()
      })
      .catch((error: unknown) => {
        console.error('Service worker readiness check failed.', error)
      })

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', onConnectivityChange)
      window.removeEventListener('offline', onConnectivityChange)
    }
  }, [refreshSnapshot])

  const capabilityReport = useMemo(() => buildCapabilityReport(snapshot), [snapshot])

  const groupedCapabilities = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          items: capabilityReport.cards.filter((card) => card.category === category),
        }))
        .filter((group) => group.items.length > 0),
    [capabilityReport.cards],
  )

  const handleAction = useCallback(
    async (card: CapabilityCard) => {
      try {
        switch (card.action) {
          case 'install': {
            if (snapshot.standaloneDisplay) {
              setActionMessage('This app is already running in standalone mode.')
              return
            }

            if (!installPromptRef.current) {
              setActionMessage(
                'Install prompt not available yet. On some browsers you need to revisit the site after the service worker activates.',
              )
              return
            }

            await installPromptRef.current.prompt()
            const choice = await installPromptRef.current.userChoice
            setActionMessage(
              choice.outcome === 'accepted'
                ? 'Install prompt accepted.'
                : 'Install prompt dismissed.',
            )
            if (choice.outcome === 'accepted') {
              installPromptRef.current = null
              setInstallPromptAvailable(false)
            }
            refreshSnapshot()
            return
          }
          case 'share': {
            if (!navigator.share) {
              setActionMessage('Web Share is not available in this browser.')
              return
            }

            await navigator.share({
              title: 'PWA API Showcase',
              text: 'Inspect browser support for installable web app APIs.',
              url: window.location.href,
            })
            setActionMessage('Share sheet opened.')
            return
          }
          case 'clipboard': {
            if (!navigator.clipboard?.writeText) {
              setActionMessage('Clipboard write access is unavailable here.')
              return
            }

            await navigator.clipboard.writeText(window.location.href)
            setActionMessage('Page URL copied to the clipboard.')
            return
          }
          case 'vibrate': {
            if (!navigator.vibrate) {
              setActionMessage('Vibration API is unavailable on this device.')
              return
            }

            const didVibrate = navigator.vibrate([80, 40, 80])
            setActionMessage(
              didVibrate ? 'Vibration pattern sent.' : 'Browser ignored the vibration request.',
            )
            return
          }
          case 'notification': {
            if (!('Notification' in window)) {
              setActionMessage('Notifications are not supported in this browser.')
              return
            }

            const permission = await window.Notification.requestPermission()
            setActionMessage(`Notification permission is now "${permission}".`)
            refreshSnapshot()
            return
          }
          default:
            return
        }
      } catch (error) {
        setActionMessage(error instanceof Error ? error.message : 'Action failed unexpectedly.')
      }
    },
    [refreshSnapshot, snapshot.standaloneDisplay],
  )

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Installable web app diagnostics</p>
          <h1>PWA API Showcase</h1>
          <p className="hero-text">
            Open this page on Android, Windows, macOS, or iOS to compare which modern PWA and
            device APIs are available in the current browser.
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="primary-button"
            onClick={refreshSnapshot}
          >
            Refresh checks
          </button>
          <a
            className="secondary-link"
            href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps"
            target="_blank"
            rel="noreferrer"
          >
            PWA docs
          </a>
        </div>
      </section>

      <section className="summary-grid" aria-label="Environment summary">
        <article className="stat-card">
          <span className="stat-value">{capabilityReport.supportedCount}</span>
          <span className="stat-label">Supported APIs</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{capabilityReport.partialCount}</span>
          <span className="stat-label">Partial support</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{capabilityReport.unsupportedCount}</span>
          <span className="stat-label">Unavailable APIs</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{snapshot.standaloneDisplay ? 'Yes' : 'No'}</span>
          <span className="stat-label">Standalone mode</span>
        </article>
      </section>

      <section className="info-grid" aria-label="Browser details">
        <article className="panel-card">
          <h2>Browser profile</h2>
          <dl className="detail-list">
            <div>
              <dt>Browser</dt>
              <dd>{snapshot.browserLabel}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>{snapshot.platformLabel}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{snapshot.language}</dd>
            </div>
            <div>
              <dt>Viewport</dt>
              <dd>{snapshot.viewportLabel}</dd>
            </div>
          </dl>
        </article>
        <article className="panel-card">
          <h2>PWA state</h2>
          <dl className="detail-list">
            <div>
              <dt>Secure context</dt>
              <dd>{snapshot.isSecureContext ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Online</dt>
              <dd>{snapshot.online ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Service worker</dt>
              <dd>{snapshot.serviceWorker ? 'Available' : 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Controlling page</dt>
              <dd>{snapshot.serviceWorkerController ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </article>
        <article className="panel-card">
          <h2>Signals</h2>
          <dl className="detail-list">
            <div>
              <dt>Connection</dt>
              <dd>{snapshot.connectionLabel}</dd>
            </div>
            <div>
              <dt>Device memory</dt>
              <dd>{snapshot.deviceMemoryLabel}</dd>
            </div>
            <div>
              <dt>Screen</dt>
              <dd>{snapshot.screenLabel}</dd>
            </div>
            <div>
              <dt>Notifications</dt>
              <dd>{snapshot.notificationPermissionLabel}</dd>
            </div>
          </dl>
        </article>
      </section>

      {actionMessage ? (
        <p className="action-banner" role="status">
          {actionMessage}
        </p>
      ) : null}

      <section className="capability-sections" aria-label="Capability matrix">
        {groupedCapabilities.map((group) => (
          <section key={group.category} className="capability-group">
            <div className="group-header">
              <h2>{group.category}</h2>
              <p>{group.items.length} checks</p>
            </div>
            <div className="capability-grid">
              {group.items.map((card) => (
                <article className="capability-card" key={card.id}>
                  <div className="card-header">
                    <div>
                      <h3>{card.name}</h3>
                      <p>{card.description}</p>
                    </div>
                    <span className={`status-pill status-${card.support}`} data-testid={`status-${card.id}`}>
                      {card.support}
                    </span>
                  </div>
                  <p className="card-detail">{card.detail}</p>
                  <div className="card-footer">
                    {card.requiresSecureContext ? (
                      <span className="card-meta">Secure context recommended</span>
                    ) : (
                      <span className="card-meta">Ready for this context</span>
                    )}
                    {card.action ? (
                      <button
                        type="button"
                        className="mini-button"
                        onClick={() => void handleAction(card)}
                        disabled={card.action === 'install' ? false : card.support === 'unsupported'}
                      >
                        {actionLabels[card.action]}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  )
}

export default App
