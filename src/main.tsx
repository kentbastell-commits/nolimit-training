import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import SplashScreen from './SplashScreen.tsx'

// The boot splash is a brand moment for the actual app experiences — the coach
// console (?view=coach) and the client portal (?portal=client) — which fetch
// data on entry. The public marketing landing, store, invite and enquiry pages
// skip it so their first paint stays instant and the lean public bundle isn't
// gated behind a loader. To show the splash everywhere, return true here.
function bootShowsSplash() {
  const params = new URLSearchParams(window.location.search)
  return params.get('view') === 'coach' || params.get('portal') === 'client'
}

function Root() {
  const [ready, setReady] = useState(() => !bootShowsSplash())
  return ready ? <App /> : <SplashScreen onFinish={() => setReady(true)} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
