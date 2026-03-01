// src/profile.js — Profilseite: Kurse, Abrechnungen, Angaben, Gefahrenbereich

import { state } from './state.js';
import { sb } from './config.js';
import { showToast, esc } from './utils.js';
import { getCourseAccess } from './data.js';
import { shouldShowProfileInstall, hasDeferredPrompt, isIOS } from './pwainstall.js';

// ══════════════════════════════════════
// RENDER
// ══════════════════════════════════════

export async function renderProfile() {
  const container = document.getElementById('profileContent');
  if (!container) return;

  const user = state.currentUser;

  // Load profile data (first_name, last_name, address)
  let profile = {};
  try {
    const { data } = await sb
      .from('profiles')
      .select('first_name, last_name, street, zip, city')
      .eq('id', user.id)
      .single();
    profile = data || {};
  } catch (_) { /* ignore */ }

  // ── 1. Meine Kurse ──
  const coursesHtml = renderMyCourses();

  // ── 2. Nachrichten ──
  const notificationsHtml = `
    <div class="profile-section">
      <h3>Nachrichten</h3>
      <div id="profileNotifications"></div>
    </div>`;

  // ── 3. Meine Abrechnungen ──
  const billingHtml = renderBilling();

  // ── 4. Meine Angaben ──
  const detailsHtml = renderMyDetails(user, profile);

  // ── 5. Einstellungen (inkl. PWA Install) ──
  const settingsHtml = renderSettings();

  // ── 5b. Datenschutz & Einwilligung ──
  const { renderConsentSection } = await import('./consent.js');
  const consentHtml = renderConsentSection();

  // ── 6. Gefahrenbereich ──
  const dangerHtml = renderDangerZone();

  container.innerHTML = `
    ${coursesHtml}
    ${notificationsHtml}
    ${billingHtml}
    ${detailsHtml}
    ${settingsHtml}
    ${consentHtml}

    <div class="profile-danger-zone">
      ${dangerHtml}
    </div>

    <div class="profile-logout-row">
      <button class="btn btn-ghost btn-sm" data-action="handleLogout">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Abmelden
      </button>
    </div>
  `;

  // Lazy-load notifications into the container
  import('./notifications.js').then(m => m.renderNotifications('profileNotifications'));
}

// ══════════════════════════════════════
// 1. MEINE KURSE
// ══════════════════════════════════════

function renderMyCourses() {
  const courses = state.cacheData.courses || [];
  const activeCourses = courses.filter(c => {
    const a = getCourseAccess(c.id);
    return a && (a.access_type === 'purchase' || a.access_type === 'subscription');
  });

  const cards = activeCourses.length
    ? activeCourses.map(c => {
        const chapters = (state.cacheData.chapters || []).filter(ch => ch.course_id === c.id);
        const exercises = (state.cacheData.exercises || []).filter(ex =>
          chapters.some(ch => ch.id === ex.chapter_id)
        );
        const answered = exercises.filter(ex => state.cacheAnswers[ex.id]).length;
        const total = exercises.length;
        const pct = total ? Math.round((answered / total) * 100) : 0;

        return `<div class="profile-course-card" data-action="navigateTo" data-args='["coursePlayer",{"courseId":"${c.id}"}]'>
          <div class="profile-course-name">${esc(c.name)}</div>
          <div class="profile-course-progress">
            <div class="profile-course-bar"><div class="profile-course-bar-fill" style="width:${pct}%"></div></div>
            <span class="profile-course-pct">${answered}/${total}</span>
          </div>
        </div>`;
      }).join('')
    : '<div class="profile-course-empty">Du hast noch keine aktiven Kurse.</div>';

  return `
    <div class="profile-section">
      <h3>Meine Kurse</h3>
      <div class="profile-courses-list">${cards}</div>
    </div>`;
}

// ══════════════════════════════════════
// 2. MEINE ABRECHNUNGEN
// ══════════════════════════════════════

function renderBilling() {
  const courses = state.cacheData.courses || [];
  const purchasedCourses = courses.filter(c => {
    const a = getCourseAccess(c.id);
    return a && (a.access_type === 'purchase' || a.access_type === 'subscription');
  });

  if (!purchasedCourses.length) return '';

  const hasSubscriptions = purchasedCourses.some(c => {
    const a = getCourseAccess(c.id);
    return a && a.access_type === 'subscription';
  });

  const rows = purchasedCourses.map(c => {
    const a = getCourseAccess(c.id);
    const typeLabel = a.access_type === 'subscription' ? 'Abo' : 'Einmalzahlung';
    const typeCls = a.access_type === 'subscription' ? 'profile-purchase-sub' : 'profile-purchase-onetime';
    return `<div class="profile-purchase-card">
      <div class="profile-purchase-name">${esc(c.name)}</div>
      <span class="profile-purchase-badge ${typeCls}">${typeLabel}</span>
    </div>`;
  }).join('');

  return `
    <div class="profile-section">
      <h3>Meine Abrechnungen</h3>
      <div class="profile-purchases-list">${rows}</div>
      <div class="profile-billing-actions">
        <button class="btn btn-secondary btn-sm" data-action="openStripePortal">
          <span class="btn-text">Rechnungen & Belege anzeigen</span>
        </button>
        ${hasSubscriptions ? `
          <button class="btn btn-secondary btn-sm" data-action="openStripePortal">
            <span class="btn-text">Abo verwalten</span>
          </button>
        ` : ''}
      </div>
    </div>`;
}

// ══════════════════════════════════════
// 3. MEINE ANGABEN
// ══════════════════════════════════════

function renderMyDetails(user, profile) {
  return `
    <div class="profile-section">
      <h3>Meine Angaben</h3>
      <div class="profile-form">
        <div class="profile-form-row">
          <label class="profile-form-label">E-Mail</label>
          <input type="email" class="form-input" value="${esc(user?.email || '')}" disabled>
        </div>
        <div class="profile-form-grid">
          <div class="profile-form-row">
            <label class="profile-form-label" for="profileFirstName">Vorname</label>
            <input type="text" id="profileFirstName" class="form-input" value="${esc(profile.first_name || '')}" placeholder="Vorname" maxlength="100">
          </div>
          <div class="profile-form-row">
            <label class="profile-form-label" for="profileLastName">Nachname</label>
            <input type="text" id="profileLastName" class="form-input" value="${esc(profile.last_name || '')}" placeholder="Nachname" maxlength="100">
          </div>
        </div>
        <div class="profile-form-row">
          <label class="profile-form-label" for="profileStreet">Strasse</label>
          <input type="text" id="profileStreet" class="form-input" value="${esc(profile.street || '')}" placeholder="Strasse und Hausnummer" maxlength="200">
        </div>
        <div class="profile-form-grid">
          <div class="profile-form-row">
            <label class="profile-form-label" for="profileZip">PLZ</label>
            <input type="text" id="profileZip" class="form-input" value="${esc(profile.zip || '')}" placeholder="PLZ" maxlength="10">
          </div>
          <div class="profile-form-row">
            <label class="profile-form-label" for="profileCity">Ort</label>
            <input type="text" id="profileCity" class="form-input" value="${esc(profile.city || '')}" placeholder="Ort" maxlength="100">
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="profileSaveDetailsBtn" data-action="saveProfileDetails">
          <span class="btn-text">Angaben speichern</span>
        </button>
      </div>

      <div class="profile-divider"></div>

      <h4 class="profile-sub-heading">Passwort ändern</h4>
      <div class="profile-form">
        <div class="password-wrap">
          <input type="password" id="profileNewPassword" class="form-input" placeholder="Neues Passwort" autocomplete="new-password">
          <button type="button" class="pw-toggle" data-action="togglePasswordVisibility" data-args='["profileNewPassword"]' data-el tabindex="-1" aria-label="Passwort anzeigen"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
        </div>
        <div class="password-wrap">
          <input type="password" id="profileConfirmPassword" class="form-input" placeholder="Passwort wiederholen" autocomplete="new-password">
          <button type="button" class="pw-toggle" data-action="togglePasswordVisibility" data-args='["profileConfirmPassword"]' data-el tabindex="-1" aria-label="Passwort anzeigen"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
        </div>
        <div id="profilePasswordError" class="auth-error"></div>
        <button class="btn btn-primary btn-sm" id="profileSavePasswordBtn" data-action="handleChangePassword">
          <span class="btn-text">Passwort speichern</span>
        </button>
      </div>
    </div>`;
}

// ══════════════════════════════════════
// 4. EINSTELLUNGEN
// ══════════════════════════════════════

function renderSettings() {
  const key = 'klarzeit_impulse_muted_' + (state.currentUser?.id || '');
  const until = parseInt(localStorage.getItem(key));
  const isMuted = until && Date.now() < until;

  // PWA Install card
  let installHtml = '';
  if (shouldShowProfileInstall()) {
    const iosDevice = isIOS();
    const label = iosDevice ? 'Zum Home-Bildschirm' : 'App installieren';
    const desc = iosDevice
      ? 'Über das Teilen-Menü hinzufügen'
      : (hasDeferredPrompt() ? 'Schnellzugriff vom Startbildschirm' : 'Über den Browser installieren');
    installHtml = `
      <div class="profile-install-card" data-action="triggerInstall">
        <div class="profile-install-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
        <div class="profile-install-text">
          <div class="profile-install-title">${label}</div>
          <div class="profile-install-desc">${desc}</div>
        </div>
      </div>`;
  }

  return `
    <div class="profile-section">
      <h3>Einstellungen</h3>
      <div class="profile-setting-row">
        <div class="profile-setting-info">
          <strong>Impuls der Woche</strong>
          <span>Zeigt nach dem Login den wöchentlichen Impuls an.</span>
        </div>
        <label class="profile-toggle">
          <input type="checkbox" id="impulseToggle" ${isMuted ? '' : 'checked'} data-change="toggleImpulseSetting">
          <span class="profile-toggle-slider"></span>
        </label>
      </div>
      ${installHtml}
    </div>`;
}

export function toggleImpulseSetting() {
  const checkbox = document.getElementById('impulseToggle');
  if (!checkbox) return;
  const key = 'klarzeit_impulse_muted_' + (state.currentUser?.id || '');
  if (checkbox.checked) {
    // Impuls aktivieren → Mute entfernen
    localStorage.removeItem(key);
    showToast('Impuls der Woche aktiviert.');
  } else {
    // Impuls deaktivieren → Mute setzen (10 Jahre = praktisch permanent)
    localStorage.setItem(key, String(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000));
    showToast('Impuls der Woche deaktiviert.');
  }
}

// ══════════════════════════════════════
// 5. GEFAHRENBEREICH
// ══════════════════════════════════════

function renderDangerZone() {
  return `
    <h3>Gefahrenbereich</h3>
    <p>Diese Aktionen können nicht rückgängig gemacht werden.</p>
    <div class="profile-danger-actions">
      <div class="profile-danger-item">
        <div>
          <strong>Alle Antworten löschen</strong>
          <span>Deine Übungsantworten werden gelöscht. Dein Account bleibt bestehen.</span>
        </div>
        <button class="btn btn-primary btn-sm" data-action="openDeleteAnswersModal">Antworten löschen</button>
      </div>
      <div class="profile-danger-item">
        <div>
          <strong>Account löschen</strong>
          <span>Dein gesamtes Konto und alle Daten werden unwiderruflich gelöscht.</span>
        </div>
        <button class="btn btn-primary btn-sm" data-action="openDeleteAccountModal">Account löschen</button>
      </div>
    </div>`;
}

// ══════════════════════════════════════
// SAVE PROFILE DETAILS
// ══════════════════════════════════════

export async function saveProfileDetails() {
  const btn = document.getElementById('profileSaveDetailsBtn');
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Wird gespeichert…';

  const updates = {
    first_name: document.getElementById('profileFirstName')?.value?.trim() || null,
    last_name: document.getElementById('profileLastName')?.value?.trim() || null,
    street: document.getElementById('profileStreet')?.value?.trim() || null,
    zip: document.getElementById('profileZip')?.value?.trim() || null,
    city: document.getElementById('profileCity')?.value?.trim() || null,
  };

  try {
    const { error } = await sb
      .from('profiles')
      .upsert({ id: state.currentUser.id, ...updates });
    if (error) throw error;
    showToast('Angaben gespeichert.');
  } catch (e) {
    console.error('Profile save error:', e);
    showToast('Fehler beim Speichern. Bitte versuche es erneut.', 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Angaben speichern';
  }
}

// ══════════════════════════════════════
// STRIPE CUSTOMER PORTAL
// ══════════════════════════════════════

export async function openStripePortal() {
  try {
    showToast('Weiterleitung zum Kundenportal...');
    const { data, error } = await sb.functions.invoke('create-portal-session');
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error('Keine Portal-URL erhalten.');
    }
  } catch (e) {
    console.error('Portal error:', e);
    showToast('Fehler beim Öffnen des Kundenportals. Bitte versuche es erneut.', 'error');
  }
}

// ══════════════════════════════════════
// PASSWORT ÄNDERN
// ══════════════════════════════════════

export async function handleChangePassword() {
  const pw = document.getElementById('profileNewPassword').value;
  const pw2 = document.getElementById('profileConfirmPassword').value;
  const err = document.getElementById('profilePasswordError');
  const btn = document.getElementById('profileSavePasswordBtn');

  err.classList.remove('visible');
  err.textContent = '';

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

  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Wird gespeichert…';

  try {
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) throw error;

    showToast('Passwort erfolgreich geändert!', 'success');
    document.getElementById('profileNewPassword').value = '';
    document.getElementById('profileConfirmPassword').value = '';
  } catch (e) {
    err.textContent = 'Fehler beim Ändern des Passworts. Bitte versuche es erneut.';
    err.classList.add('visible');
    console.error('Passwort-Fehler:', e);
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Passwort speichern';
  }
}

// ══════════════════════════════════════
// ANTWORTEN LÖSCHEN (Modal)
// ══════════════════════════════════════

export function openDeleteAnswersModal() {
  const modal = document.getElementById('deleteAnswersModal');
  if (!modal) return;

  const input = document.getElementById('deleteConfirmInput');
  const btn = document.getElementById('deleteConfirmBtn');

  if (input) { input.value = ''; }
  if (btn) { btn.disabled = true; btn.textContent = 'Endgültig löschen'; }

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('active');
    if (input) input.focus();
  });
}

export function closeDeleteAnswersModal() {
  const modal = document.getElementById('deleteAnswersModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
}

export function onDeleteConfirmInput() {
  const input = document.getElementById('deleteConfirmInput');
  const btn = document.getElementById('deleteConfirmBtn');
  if (!input || !btn) return;
  btn.disabled = input.value.trim() !== 'LÖSCHEN';
}

export async function confirmDeleteAllAnswers() {
  const input = document.getElementById('deleteConfirmInput');
  const btn = document.getElementById('deleteConfirmBtn');
  if (!input || input.value.trim() !== 'LÖSCHEN') return;

  btn.disabled = true;
  btn.textContent = 'Wird gelöscht…';

  try {
    const { error } = await sb
      .from('answers')
      .delete()
      .eq('user_id', state.currentUser.id);
    if (error) throw error;

    state.cacheAnswers = {};
    closeDeleteAnswersModal();
    showToast('Alle Antworten wurden gelöscht.', 'success');
    renderProfile();
  } catch (err) {
    console.error('Fehler beim Löschen:', err);
    showToast('Fehler beim Löschen. Bitte versuche es erneut.', 'error');
    btn.disabled = false;
    btn.textContent = 'Endgültig löschen';
  }
}

// ══════════════════════════════════════
// ACCOUNT LÖSCHEN (Modal)
// ══════════════════════════════════════

export function openDeleteAccountModal() {
  const modal = document.getElementById('deleteAccountModal');
  if (!modal) return;

  const input = document.getElementById('deleteAccountConfirmInput');
  const btn = document.getElementById('deleteAccountConfirmBtn');

  if (input) { input.value = ''; }
  if (btn) { btn.disabled = true; btn.textContent = 'Account endgültig löschen'; }

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('active');
    if (input) input.focus();
  });
}

export function closeDeleteAccountModal() {
  const modal = document.getElementById('deleteAccountModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
}

export function onDeleteAccountConfirmInput() {
  const input = document.getElementById('deleteAccountConfirmInput');
  const btn = document.getElementById('deleteAccountConfirmBtn');
  if (!input || !btn) return;

  const email = state.currentUser?.email || '';
  btn.disabled = input.value.trim().toLowerCase() !== email.toLowerCase();
}

export async function confirmDeleteAccount() {
  const input = document.getElementById('deleteAccountConfirmInput');
  const btn = document.getElementById('deleteAccountConfirmBtn');
  const email = state.currentUser?.email || '';

  if (!input || input.value.trim().toLowerCase() !== email.toLowerCase()) return;

  btn.disabled = true;
  btn.textContent = 'Wird gelöscht…';

  try {
    const { data, error } = await sb.functions.invoke('delete-account', {
      body: { confirmEmail: email },
    });

    if (error) throw new Error(error.message || 'Fehler beim Löschen');
    if (data?.error) throw new Error(data.error);

    closeDeleteAccountModal();

    state.currentUser = null;
    state.isAdmin = false;
    state.cacheAnswers = {};
    state.cacheAccess = [];
    state.chapterProgress = {};
    state.cacheData = { courses: [], chapters: [], exercises: [] };

    const { navigateTo } = await import('./navigation.js');
    navigateTo('auth');
    showToast('Dein Account wurde vollständig gelöscht.', 'success');

  } catch (err) {
    console.error('Fehler beim Account-Löschen:', err);
    showToast('Fehler beim Löschen. Bitte versuche es erneut.', 'error');
    btn.disabled = false;
    btn.textContent = 'Account endgültig löschen';
  }
}
