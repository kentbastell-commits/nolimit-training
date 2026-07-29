export async function prepareOfflinePack() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return false

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const worker = registration.active ?? registration.waiting ?? registration.installing
    if (!worker) return false

    if (!navigator.serviceWorker.controller) {
      const controlled = await new Promise<boolean>((resolve) => {
        const timeout = window.setTimeout(() => resolve(false), 5000)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.clearTimeout(timeout)
          resolve(Boolean(navigator.serviceWorker.controller))
        }, { once: true })
      })
      if (!controlled) return false
    }

    const urls = [
      window.location.origin + '/',
      ...performance.getEntriesByType('resource').map((entry) => entry.name),
    ]

    const ready = await new Promise<boolean>((resolve) => {
      const channel = new MessageChannel()
      const timeout = window.setTimeout(() => resolve(false), 8000)
      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout)
        resolve(Boolean(event.data?.ready))
      }
      worker.postMessage({ type: 'CACHE_URLS', urls }, [channel.port2])
    })

    if (ready) {
      localStorage.setItem('mandarin-field-offline-ready', 'true')
      window.dispatchEvent(new Event('mandarin-field-offline-ready'))
    }
    return ready
  } catch {
    return false
  }
}
