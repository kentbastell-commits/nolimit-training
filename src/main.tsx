import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './nl-anim.css'
import './nl-anim'
import './i18n'
import App from './App.tsx'
import './visualSystem.css'
import SplashScreen from './SplashScreen.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import { applyPageMetadata } from './seo.ts'
import { initTelemetry } from './telemetry.ts'

applyPageMetadata()
initTelemetry()

// A deploy replaces the hashed chunk files, so a tab opened before the deploy
// fails its NEXT lazy import (changing pages, opening any add-modal) and
// white-screens. Vite fires vite:preloadError for exactly this case — reload
// once to pick up the new build. Guarded so a genuinely broken build can't
// reload-loop.
window.addEventListener('vite:preloadError', (event) => {
  const last = Number(sessionStorage.getItem('nl-chunk-reload') || 0)
  if (Date.now() - last < 60_000) return
  sessionStorage.setItem('nl-chunk-reload', String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

// The boot splash is a brand moment for the actual app experiences — the coach
// console (?view=coach) and the client portal (?portal=client) — which fetch
// data on entry. The public marketing landing, store, invite and enquiry pages
// skip it so their first paint stays instant. To show it everywhere, return
// true here.
function bootShowsSplash() {
  const params = new URLSearchParams(window.location.search)
  return params.get('view') === 'coach' || params.get('portal') === 'client'
}

function Root() {
  const wantsSplash = bootShowsSplash()
  // App mounts immediately and loads underneath the splash; `booted` flips when
  // App signals its real boot data is ready, which drives the bars to 100%.
  const [booted, setBooted] = useState(false)
  const [splashDone, setSplashDone] = useState(() => !wantsSplash)

  // Safety net: never trap the app behind the splash if the ready signal never
  // arrives (e.g. an unresolvable portal link shows its own error underneath).
  useEffect(() => {
    if (!wantsSplash) return
    const t = setTimeout(() => setBooted(true), 10000)
    return () => clearTimeout(t)
  }, [wantsSplash])

  return (
    <>
      {/* Outermost net: the coach console had no boundary at all, so any
          render throw white-screened the whole app. */}
      <ErrorBoundary label="app">
        <App onReady={() => setBooted(true)} />
      </ErrorBoundary>
      {!splashDone && (
        <SplashScreen done={booted} onFinish={() => setSplashDone(true)} />
      )}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
