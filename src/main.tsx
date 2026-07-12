import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './nl-anim.css'
import './nl-anim'
import './i18n'
import App from './App.tsx'
import SplashScreen from './SplashScreen.tsx'
import { applyPageMetadata } from './seo.ts'

applyPageMetadata()

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
      <App onReady={() => setBooted(true)} />
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
