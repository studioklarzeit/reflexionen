// src/pwainstall.js — PWA Install Prompt (Banner + Profil-Button)

import { state } from './state.js';
import { esc } from './utils.js';

const DISMISS_KEY = 'klarzeit_pwa_dismissed';
let deferredPrompt = null;

// ── Detect environment ──

export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isDismissed() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() < Number(ts);
  } catch (_) { return false; }
}

// ── Capture beforeinstallprompt ──

export function initPWAInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallBanner();
  });
}

// ── Banner Logic ──

const HOME_VIEWS = ['courses', 'tools', 'meditation', 'pro', 'contact', 'profile'];

export function canShowInstallBanner() {
  if (isInstalled()) return false;
  if (isDismissed()) return false;
  if (!state.currentUser) return false;
  // On Chrome/Android: need the deferred prompt
  // On iOS: always show (with manual instructions)
  return !!deferredPrompt || isIOS();
}

export function updateInstallBanner(currentView) {
  const banner = document.getElementById('installBanner');
  if (!banner) return;

  // Don't show if resume bar is visible (it has priority)
  const resumeBar = document.getElementById('resumeBar');
  if (resumeBar && resumeBar.style.display === 'flex') {
    banner.style.display = 'none';
    return;
  }

  if (!HOME_VIEWS.includes(currentView) || !canShowInstallBanner()) {
    banner.style.display = 'none';
    return;
  }

  const iosHint = isIOS();
  const label = iosHint ? 'Zum Home-Bildschirm' : 'App installieren';

  banner.innerHTML = `
    <button class="install-banner-main" data-action="triggerInstall">
      <span class="install-banner-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </span>
      <span class="install-banner-text">
        <span class="install-banner-label">${label}</span>
        <span class="install-banner-desc">${iosHint ? 'Tippe auf Teilen und dann „Zum Home-Bildschirm"' : 'Schneller Zugriff von deinem Startbildschirm'}</span>
      </span>
    </button>
    <button class="install-banner-close" data-action="dismissInstallBanner" aria-label="Schliessen">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  banner.style.display = 'flex';
}

function hideInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'none';
}

// ── Actions ──

export async function triggerInstall() {
  if (isIOS()) {
    showIOSGuide();
    return;
  }

  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        deferredPrompt = null;
        hideInstallBanner();
      }
    } catch (e) {
      console.warn('PWA install prompt error:', e);
    }
  }
}

export function dismissInstallBanner() {
  try {
    // Dismiss for 30 days
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
  } catch (_) {}
  hideInstallBanner();
}

// ── iOS Guide Overlay ──

function showIOSGuide() {
  const existing = document.getElementById('iosInstallGuide');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'iosInstallGuide';
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog ios-install-guide">
      <h3>App installieren</h3>
      <div class="ios-guide-steps">
        <div class="ios-guide-step">
          <span class="ios-guide-num">1</span>
          <span>Tippe unten auf das <strong>Teilen-Symbol</strong>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin:0 2px;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </span>
        </div>
        <div class="ios-guide-step">
          <span class="ios-guide-num">2</span>
          <span>Scrolle nach unten und tippe auf <strong>„Zum Home-Bildschirm"</strong></span>
        </div>
        <div class="ios-guide-step">
          <span class="ios-guide-num">3</span>
          <span>Tippe auf <strong>„Hinzufügen"</strong></span>
        </div>
      </div>
      <div class="confirm-dialog-actions">
        <button class="confirm-ok" id="iosGuideClose">Verstanden</button>
      </div>
    </div>
  `;
  overlay.querySelector('#iosGuideClose').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── Profile: Install Status for rendering ──

export function shouldShowProfileInstall() {
  return !isInstalled();
}

export function hasDeferredPrompt() {
  return !!deferredPrompt;
}
