import { sb, SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { state } from './state.js';
import { btnLoading, showToast, trAuthErr } from './utils.js';
import { navigateTo } from './navigation.js';
import { loadAllData, loadAdminStatus, loadCourseAccess, loadUserAnswers } from './data.js';
import { redeemInvite } from './admin.js';
import { updateMobileDarkLabel } from './mobile.js';

// ── AUTH MODE ──

let authMode = 'register';

export function getAuthMode() { return authMode; }

// ── REMEMBER ME ──

function isRememberMe() {
  return document.getElementById('rememberMe')?.checked !== false;
}

// If user unchecked "Eingeloggt bleiben", clear session on tab/browser close
window.addEventListener('beforeunload', () => {
  if (localStorage.getItem('klarzeit_remember') === '0') {
    sb.auth.signOut();
  }
});

// ── PASSKEY / FACE ID ──

let _appUnlocked = false;
let _lastHidden = 0;

function isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && window.innerWidth <= 1024;
}

function supportsPasskey() {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

function hasPasskeyRegistered() {
  return isMobileDevice() && supportsPasskey() && !!localStorage.getItem('klarzeit_passkey_id');
}

function showLockScreen() {
  const el = document.getElementById('lockScreen');
  if (el) el.classList.add('visible');
}

function hideLockScreen() {
  const el = document.getElementById('lockScreen');
  if (el) el.classList.remove('visible');
  _appUnlocked = true;
}

async function verifyBiometric() {
  const credIdB64 = localStorage.getItem('klarzeit_passkey_id');
  if (!credIdB64) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credId = Uint8Array.from(atob(credIdB64), c => c.charCodeAt(0));
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: credId, type: 'public-key', transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return true;
  } catch (e) {
    console.log('Biometric verification cancelled:', e.message);
    return false;
  }
}

// Called on app start: if user has session + passkey → lock until Face ID
export async function checkBiometricLock() {
  if (!hasPasskeyRegistered()) { _appUnlocked = true; return; }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { _appUnlocked = true; return; }
  // Show lock screen and auto-trigger Face ID
  showLockScreen();
  const ok = await verifyBiometric();
  if (ok) {
    hideLockScreen();
  }
  // If cancelled, lock screen stays visible with manual "Entsperren" button
}

// Manual unlock button
export async function unlockApp() {
  const ok = await verifyBiometric();
  if (ok) {
    hideLockScreen();
  } else {
    showToast('Entsperren fehlgeschlagen.', 'error');
  }
}

// Visibility change: re-lock when app comes back from background
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    _lastHidden = Date.now();
  }
  if (document.visibilityState === 'visible') {
    // Only lock if was hidden for at least 3 seconds (avoid brief tab switches)
    const elapsed = Date.now() - _lastHidden;
    if (elapsed < 3000) return;
    if (!state.currentUser) return;
    if (!hasPasskeyRegistered()) return;
    _appUnlocked = false;
    showLockScreen();
    verifyBiometric().then(ok => {
      if (ok) hideLockScreen();
    });
  }
});

export async function offerPasskeySetup() {
  if (!isMobileDevice() || !supportsPasskey()) return;
  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return;
  }
  if (localStorage.getItem('klarzeit_passkey_id')) return;
  try {
    await registerPasskey();
  } catch (e) {
    console.log('Passkey setup skipped:', e.message);
  }
}

async function registerPasskey() {
  const user = state.currentUser;
  if (!user) return;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Studio Klarzeit', id: location.hostname },
      user: {
        id: new TextEncoder().encode(user.id),
        name: user.email,
        displayName: 'Studio Klarzeit',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  });
  const rawId = new Uint8Array(credential.rawId);
  localStorage.setItem('klarzeit_passkey_id', btoa(String.fromCharCode(...rawId)));
  localStorage.setItem('klarzeit_passkey_email', user.email);
}

export async function loginWithPasskey() {
  const credIdB64 = localStorage.getItem('klarzeit_passkey_id');
  if (!credIdB64) { showToast('Kein Passkey gespeichert.', 'error'); return; }
  btnLoading('passkeyBtn', true);
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credId = Uint8Array.from(atob(credIdB64), c => c.charCodeAt(0));
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: credId, type: 'public-key', transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    // Biometric succeeded → use existing Supabase session
    const { data: { session } } = await sb.auth.getSession();
    if (session && session.user) {
      state.currentUser = session.user;
      navigateTo('loading');
      document.getElementById('loadingText').textContent = 'Daten werden geladen …';
      await postLogin();
      showToast('Willkommen zurück!');
    } else {
      showToast('Sitzung abgelaufen. Bitte mit Passwort anmelden.', 'error');
      btnLoading('passkeyBtn', false);
    }
  } catch (e) {
    console.log('Passkey login cancelled:', e.message);
    btnLoading('passkeyBtn', false);
  }
}

export function initAuthUI() {
  const rememberWrap = document.getElementById('rememberMeWrap');
  const passkeyBtn = document.getElementById('passkeyBtn');
  if (rememberWrap) {
    rememberWrap.style.display = authMode === 'login' ? 'flex' : 'none';
    const saved = localStorage.getItem('klarzeit_remember');
    document.getElementById('rememberMe').checked = saved === '1';
  }
  if (passkeyBtn && isMobileDevice() && supportsPasskey() && localStorage.getItem('klarzeit_passkey_id')) {
    passkeyBtn.style.display = authMode === 'login' ? 'flex' : 'none';
  } else if (passkeyBtn) {
    passkeyBtn.style.display = 'none';
  }
}

export function toggleAuthMode() {
  document.getElementById('authError').classList.remove('visible');
  document.getElementById('authSuccess').classList.remove('visible');

  const cfWrap = document.getElementById('passwordConfirm').closest('.password-wrap');
  const pwWrap = document.getElementById('passwordInput').closest('.password-wrap');
  const btn = document.getElementById('authBtn');
  const t = document.getElementById('authTitle');
  const s = document.getElementById('authSubtitle');
  const tog = document.getElementById('authToggleText');
  const pw = document.getElementById('passwordInput');
  const fl = document.getElementById('forgotPasswordLink');

  if (authMode === 'register') {
    authMode = 'login';
    t.textContent = 'Einloggen';
    s.textContent = 'Gib deine E-Mail und dein Passwort ein.';
    btn.querySelector('.btn-text').textContent = 'Einloggen';
    tog.textContent = 'Noch kein Konto? Hier registrieren';
    cfWrap.style.display = 'none';
    pw.placeholder = 'Dein Passwort';
    pwWrap.style.display = 'block';
    fl.style.display = 'inline-block';
  } else if (authMode === 'login') {
    authMode = 'register';
    t.textContent = 'Willkommen';
    s.textContent = 'Erstelle dein persönliches Konto für die Übungsplattform.';
    btn.querySelector('.btn-text').textContent = 'Konto erstellen & starten';
    tog.textContent = 'Bereits registriert? Hier einloggen';
    cfWrap.style.display = 'block';
    pw.placeholder = 'Passwort wählen';
    pwWrap.style.display = 'block';
    fl.style.display = 'none';
  } else {
    authMode = 'login';
    t.textContent = 'Einloggen';
    s.textContent = 'Gib deine E-Mail und dein Passwort ein.';
    btn.querySelector('.btn-text').textContent = 'Einloggen';
    tog.textContent = 'Noch kein Konto? Hier registrieren';
    cfWrap.style.display = 'none';
    pwWrap.style.display = 'block';
    pw.placeholder = 'Dein Passwort';
    fl.style.display = 'inline-block';
  }
  initAuthUI();
}

export function handleForgotPassword() {
  authMode = 'forgot';
  document.getElementById('authError').classList.remove('visible');
  document.getElementById('authSuccess').classList.remove('visible');
  document.getElementById('authTitle').textContent = 'Passwort zurücksetzen';
  document.getElementById('authSubtitle').textContent = 'Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.';
  document.getElementById('authBtn').querySelector('.btn-text').textContent = 'Link senden';
  document.getElementById('authToggleText').textContent = 'Zurück zum Login';
  document.getElementById('passwordConfirm').closest('.password-wrap').style.display = 'none';
  document.getElementById('passwordInput').closest('.password-wrap').style.display = 'none';
  document.getElementById('forgotPasswordLink').style.display = 'none';
  initAuthUI();
}

function showAuthError(m) {
  const e = document.getElementById('authError');
  e.textContent = m;
  e.classList.add('visible');
  document.getElementById('authSuccess').classList.remove('visible');
}

function showAuthSuccess(m) {
  const e = document.getElementById('authSuccess');
  e.textContent = m;
  e.classList.add('visible');
  document.getElementById('authError').classList.remove('visible');
}

export async function handleAuth() {
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  if (!email || !email.includes('@') || !email.includes('.')) {
    showAuthError('Bitte gib eine gültige E-Mail-Adresse ein.');
    return;
  }

  if (authMode === 'forgot') {
    btnLoading('authBtn', true);
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname,
      });
      if (error) throw error;
      showAuthSuccess('Falls ein Konto existiert, erhältst du in Kürze einen Link.');
    } catch (e) {
      showAuthError(trAuthErr(e));
    } finally {
      btnLoading('authBtn', false);
    }
    return;
  }

  const pw = document.getElementById('passwordInput').value;
  if (!pw || pw.length < 8) {
    showAuthError('Das Passwort muss mindestens 8 Zeichen lang sein.');
    return;
  }

  btnLoading('authBtn', true);
  try {
    if (authMode === 'register') {
      if (pw !== document.getElementById('passwordConfirm').value) {
        showAuthError('Die Passwörter stimmen nicht überein.');
        btnLoading('authBtn', false);
        return;
      }
      const { data, error } = await sb.auth.signUp({ email, password: pw });
      if (error) throw error;
      if (data.user && !data.session) {
        showAuthSuccess('Konto erstellt! Bitte prüfe deine E-Mails.');
        btnLoading('authBtn', false);
        return;
      }
      state.currentUser = data.user;
      await postLogin();
      showToast('Willkommen! Dein Konto wurde erstellt.');
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      // Save remember-me preference
      localStorage.setItem('klarzeit_remember', isRememberMe() ? '1' : '0');
      state.currentUser = data.user;
      navigateTo('loading');
      document.getElementById('loadingText').textContent = 'Daten werden geladen …';
      await postLogin();
      showToast('Willkommen zurück!');
      // Offer passkey setup (non-blocking)
      offerPasskeySetup();
    }
  } catch (e) {
    showAuthError(trAuthErr(e));
    btnLoading('authBtn', false);
  }
}

export async function postLogin() {
  await loadAllData();
  await loadAdminStatus();
  await loadCourseAccess();
  await loadUserAnswers();

  // Load notification count (non-blocking)
  import('./notifications.js').then(m => m.loadNotificationCount()).catch(() => {});

  // Payment Link: Pending Käufe von Squarespace dem User zuweisen
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/claim-purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_KEY,
        },
      });
      const respData = await res.json().catch(() => ({}));
      if (respData?.claimed > 0) {
        await loadCourseAccess();
        console.log(`Claimed ${respData.claimed} pending purchase(s)`);
      }
    }
  } catch (e) {
    console.error('claim-purchases error:', e);
  }

  if (state.pendingInvite) {
    await redeemInvite(state.pendingInvite);
    state.pendingInvite = null;
  }

  setupHeader();

  // Check for pending purchase (user was redirected to login during checkout)
  const { checkPendingPurchase } = await import('./sales.js');
  const hadPending = await checkPendingPurchase();
  if (hadPending) return; // redirecting to Stripe checkout

  // Check for Stripe success redirect
  if (state.pendingStripeSuccess) {
    const courseId = state.pendingStripeSuccess;
    state.pendingStripeSuccess = null;
    // Clean URL params
    const url = new URL(location.href);
    url.searchParams.delete('purchase_success');
    url.searchParams.delete('course_id');
    history.replaceState({}, '', url.pathname);
    showToast('Kauf erfolgreich! Du hast jetzt Zugriff auf den Kurs.');
    navigateTo('coursePlayer', { courseId });
    return;
  }

  const onboardKey = 'klarzeit_onboarded_' + state.currentUser.id;
  if (!localStorage.getItem(onboardKey)) {
    navigateTo('onboarding');
  } else {
    const { isImpulseMuted } = await import('./weeklyimpulse.js');
    navigateTo(isImpulseMuted() ? 'courses' : 'impulseSplash');
  }
}

export async function handleResetPassword() {
  const pw = document.getElementById('resetPasswordInput').value;
  const pw2 = document.getElementById('resetPasswordConfirm').value;
  const err = document.getElementById('resetError');
  err.classList.remove('visible');

  if (!pw || pw.length < 8) {
    err.textContent = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
    err.classList.add('visible');
    return;
  }
  if (pw !== pw2) {
    err.textContent = 'Die Passwörter stimmen nicht überein.';
    err.classList.add('visible');
    return;
  }

  btnLoading('resetBtn', true);
  try {
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) throw error;
    showToast('Passwort erfolgreich geändert!');
    const { data: { user } } = await sb.auth.getUser();
    state.currentUser = user;
    await postLogin();
  } catch (e) {
    err.textContent = trAuthErr(e);
    err.classList.add('visible');
    btnLoading('resetBtn', false);
  }
}

export async function handleLogout() {
  localStorage.removeItem('klarzeit_remember');
  try { await sb.auth.signOut(); } catch (_) { /* ignore */ }
  state.currentUser = null;
  state.isAdmin = false;
  state.cacheAnswers = {};
  state.cacheAccess = [];
  state.cacheData = { courses: [], chapters: [], exercises: [] };
  navigateTo('auth');
}

export async function setupHeader() {
  if (!state.currentUser) return;
  document.getElementById('userEmailDisplay').textContent = state.currentUser.email;
  document.getElementById('adminBadge').style.display = state.isAdmin ? 'inline' : 'none';
  document.getElementById('mobileEmailDisplay').textContent = state.currentUser.email;
  document.getElementById('mobileAdminBadge').style.display = state.isAdmin ? 'inline' : 'none';
  document.getElementById('mobileAdminLink').style.display = state.isAdmin ? 'flex' : 'none';
  // Pro link visibility
  import('./pro.js').then(({ isProMember }) => {
    const show = isProMember();
    const proMobile = document.getElementById('mobileProLink');
    if (proMobile) proMobile.style.display = show ? 'flex' : 'none';
  });
  updateMobileDarkLabel();

  // Greeting: Vorname laden
  try {
    const { data: profile } = await sb.from('profiles')
      .select('first_name')
      .eq('id', state.currentUser.id)
      .single();
    const name = profile?.first_name?.trim();
    const greetingEl = document.getElementById('headerGreeting');
    const subtitleEl = document.getElementById('headerSubtitle');
    if (greetingEl) {
      greetingEl.textContent = name ? `Hallo, ${name}` : 'Studio Klarzeit';
    }
    if (subtitleEl) {
      subtitleEl.textContent = name ? 'Schön, dass du da bist.' : '';
    }
  } catch (e) {
    // Fallback: Logo-Text bleibt
  }
}

export function togglePasswordVisibility(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  } else {
    inp.type = 'password';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}
