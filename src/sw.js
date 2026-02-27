export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => {
      console.log('SW registration skipped:', e);
    });
  }
}

export function updateOnlineStatus() {
  document.getElementById('offlineBar').classList.toggle('visible', !navigator.onLine);
}
