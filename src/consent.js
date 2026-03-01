// src/consent.js — Datenschutz-Einwilligung, Cookie-Banner, Datenexport
// nDSG-konformes Consent-System fuer besonders schuetzenswerte Personendaten

import { sb } from './config.js';
import { state } from './state.js';
import { showToast, esc } from './utils.js';

// ══════════════════════════════════════
// KONSTANTEN
// ══════════════════════════════════════

export const CURRENT_CONSENT_VERSION = 'v1.0';

// Supabase-Tabellen mit Gesundheitsdaten (bei Widerruf loeschen)
const HEALTH_TABLES = [
  'checkin_entries',
  'body_entries',
  'journal_entries',
  'friend_entries',
  'energy_entries',
  'answers',
];

// ══════════════════════════════════════
// CONSENT LADEN & PRUEFEN
// ══════════════════════════════════════

export async function loadUserConsent() {
  if (!state.currentUser) { state.userConsent = null; return; }
  try {
    const { data, error } = await sb
      .from('user_consents')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .is('revoked_at', null)
      .order('consented_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.warn('loadUserConsent error:', error.message);
    state.userConsent = data || null;
  } catch (e) {
    console.error('loadUserConsent exception:', e);
    state.userConsent = null;
  }
}

/** Synchroner Schnell-Check: hat User aktiven Health-Data-Consent? */
export function hasHealthDataConsent() {
  return !!(
    state.userConsent &&
    state.userConsent.consent_health_data === true &&
    state.userConsent.consent_version === CURRENT_CONSENT_VERSION &&
    !state.userConsent.revoked_at
  );
}

/** Prueft ob der Consent-Screen angezeigt werden muss */
export function needsConsentScreen() {
  if (!state.userConsent) return true;
  if (state.userConsent.consent_version !== CURRENT_CONSENT_VERSION) return true;
  return false;
}

// ══════════════════════════════════════
// CONSENT SCREEN (Onboarding-Gate)
// ══════════════════════════════════════

export function renderConsentScreen(isUpdate) {
  const el = document.getElementById('consentContent');
  if (!el) return;

  const updateHint = isUpdate
    ? `<div class="consent-info-box" style="background:rgba(196,169,155,0.15);border:1px solid var(--accent-warm);">
        <strong>Unsere Datenschutzerklaerung wurde aktualisiert.</strong><br>
        Bitte lies die Aenderungen und bestaetige erneut.
       </div>`
    : '';

  el.innerHTML = `
    <div class="onboarding-hero">
      <span class="onboarding-hero-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </span>
      <h1>Deine Daten bei Studio Klarzeit</h1>
      <p>Studio Klarzeit bietet dir Uebungen zur Selbstreflexion und persoenlichen Entwicklung. Einige Features erfassen Angaben, die dein persoenliches Befinden betreffen. Hier erfaehrst du, welche Daten erhoben werden und wie wir damit umgehen.</p>
    </div>

    ${updateHint}

    <div class="consent-categories">
      <div class="consent-category">
        <strong>Konto-Daten</strong>
        <span>E-Mail-Adresse, Name — fuer Login und Kommunikation</span>
      </div>
      <div class="consent-category">
        <strong>Kursfortschritt</strong>
        <span>Abgeschlossene Lektionen und Kapitel — um deinen Fortschritt zu speichern</span>
      </div>
      <div class="consent-category">
        <strong>Selbstreflexionsdaten</strong>
        <span>Deine Antworten auf Uebungsfragen in Kursen — nur fuer dich sichtbar</span>
      </div>
      <div class="consent-category">
        <strong>Stimmungs- und Koerper-Check-Ins</strong>
        <span>Deine Angaben zu Befinden, Stimmung und koerperlichem Empfinden — nur fuer dich sichtbar</span>
      </div>
      <div class="consent-category">
        <strong>Schutzmuster-Tagebuch</strong>
        <span>Deine persoenlichen Tagebucheintraege — nur fuer dich sichtbar</span>
      </div>
      <div class="consent-category">
        <strong>Energie-Bilanz &amp; Freundinnen-Blick</strong>
        <span>Deine Reflexionsantworten — nur fuer dich sichtbar</span>
      </div>
    </div>

    <div class="consent-info-box">
      Deine Selbstreflexionsdaten (Check-Ins, Tagebuch, Uebungsantworten) betreffen dein persoenliches Befinden und gelten als besonders schuetzenswerte Daten. Sie werden ausschliesslich fuer dich gespeichert, nicht an Dritte weitergegeben und nicht fuer Werbezwecke verwendet. Dein Arbeitgeber (bei B2B-Zugang) hat keinen Einblick in deine Daten.
    </div>

    <div class="consent-checkboxes">
      <div class="consent-checkbox-row">
        <input type="checkbox" id="consentPrivacy" data-change="toggleConsentCheckbox">
        <label for="consentPrivacy">Ich habe die <a data-action="navigateTo" data-args='["privacyPolicy"]' style="text-decoration:underline;cursor:pointer;">Datenschutzerklaerung</a> gelesen und stimme der Verarbeitung meiner Daten gemaess der Datenschutzerklaerung zu.</label>
      </div>
      <div class="consent-checkbox-row">
        <input type="checkbox" id="consentHealth" data-change="toggleConsentCheckbox">
        <label for="consentHealth">Ich willige ausdruecklich in die Verarbeitung meiner Selbstreflexionsdaten (Stimmungs-Check-Ins, Koerper-Check-Ins, Tagebuch, Uebungsantworten) ein.</label>
      </div>
    </div>

    <p class="consent-hint">Du kannst deine Einwilligung jederzeit in den Einstellungen widerrufen. In diesem Fall werden die entsprechenden Daten geloescht.</p>

    <div class="onboarding-start">
      <button class="btn btn-primary" id="consentSubmitBtn" data-action="submitConsent" disabled>
        <span class="btn-text">Verstanden — Los geht's</span>
      </button>
    </div>
  `;
}

/** Checkbox-Toggle: Button nur aktiv wenn beide Checkboxen gesetzt */
export function toggleConsentCheckbox() {
  const p = document.getElementById('consentPrivacy');
  const h = document.getElementById('consentHealth');
  const btn = document.getElementById('consentSubmitBtn');
  if (btn) btn.disabled = !(p?.checked && h?.checked);
}

/** Einwilligung speichern und weiterleiten */
export async function submitConsent() {
  const btn = document.getElementById('consentSubmitBtn');
  if (btn) btn.disabled = true;

  try {
    const { data, error } = await sb
      .from('user_consents')
      .insert({
        user_id: state.currentUser.id,
        consent_privacy_policy: true,
        consent_health_data: true,
        consent_version: CURRENT_CONSENT_VERSION,
      })
      .select()
      .single();

    if (error) throw error;
    state.userConsent = data;

    // Weiterleiten: Onboarding oder Kurse
    const { navigateTo } = await import('./navigation.js');
    const onboardKey = 'klarzeit_onboarded_' + state.currentUser.id;
    if (!localStorage.getItem(onboardKey)) {
      navigateTo('onboarding');
    } else {
      const { isImpulseMuted } = await import('./weeklyimpulse.js');
      window.finishLoading?.(!isImpulseMuted());
    }
  } catch (e) {
    console.error('submitConsent error:', e);
    showToast('Fehler beim Speichern der Einwilligung.', 'error');
    if (btn) btn.disabled = false;
  }
}

// ══════════════════════════════════════
// CONSENT GATE (fuer gesperrte Features)
// ══════════════════════════════════════

/**
 * Rendert Hinweis in Container wenn kein Health-Data-Consent.
 * Returns true wenn Feature gesperrt (kein Consent).
 */
export function renderConsentGate(container) {
  if (hasHealthDataConsent()) return false;

  if (typeof container === 'string') {
    container = document.getElementById(container);
  }
  if (!container) return true;

  container.innerHTML = `
    <div class="consent-gate">
      <div class="consent-gate-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <p>Um dieses Feature zu nutzen, benoetigen wir deine Einwilligung zur Verarbeitung deiner Selbstreflexionsdaten.</p>
      <button class="btn btn-primary" data-action="reGrantConsent">
        <span class="btn-text">Einwilligung erteilen</span>
      </button>
    </div>
  `;
  return true;
}

// ══════════════════════════════════════
// PROFIL: DATENSCHUTZ-SEKTION
// ══════════════════════════════════════

/** Returns HTML-String fuer die Profil-Seite */
export function renderConsentSection() {
  const c = state.userConsent;

  if (!c) {
    // Kein Consent vorhanden (widerrufen oder nie erteilt)
    return `
      <div class="profile-section">
        <h3>Datenschutz &amp; Einwilligung</h3>
        <p style="color:var(--text-muted);font-size:14px;">Du hast noch keine Einwilligung zur Verarbeitung deiner Selbstreflexionsdaten erteilt oder sie wurde widerrufen.</p>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" data-action="reGrantConsent">Einwilligung erteilen</button>
          <a class="btn btn-ghost btn-sm" data-action="navigateTo" data-args='["privacyPolicy"]'>Datenschutzerklaerung</a>
        </div>
        <div style="margin-top:16px;">
          <button class="btn btn-ghost btn-sm" data-action="exportUserData">Meine Daten exportieren</button>
        </div>
      </div>`;
  }

  const date = new Date(c.consented_at).toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return `
    <div class="profile-section">
      <h3>Datenschutz &amp; Einwilligung</h3>
      <div class="consent-status-row">
        <span class="consent-status-check">&#x2713;</span>
        <span>Datenschutzerklaerung akzeptiert am ${esc(date)}</span>
      </div>
      <div class="consent-status-row">
        <span class="consent-status-check">&#x2713;</span>
        <span>Einwilligung Selbstreflexionsdaten erteilt am ${esc(date)}</span>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <a class="btn btn-ghost btn-sm" data-action="navigateTo" data-args='["privacyPolicy"]'>Datenschutzerklaerung</a>
        <button class="btn btn-ghost btn-sm" data-action="exportUserData">Meine Daten exportieren</button>
      </div>
      <div style="margin-top:16px;">
        <button class="btn btn-primary btn-sm" style="background:var(--accent-rose);border-color:var(--accent-rose);" data-action="revokeHealthDataConsent">Einwilligung fuer Selbstreflexionsdaten widerrufen</button>
      </div>
    </div>`;
}

// ══════════════════════════════════════
// WIDERRUF
// ══════════════════════════════════════

export async function revokeHealthDataConsent() {
  const ok = confirm(
    'Wenn du deine Einwilligung widerrufst, werden alle deine Selbstreflexionsdaten ' +
    '(Check-Ins, Tagebuch, Uebungsantworten) unwiderruflich geloescht.\n\n' +
    'Dein Konto und dein Kursfortschritt bleiben erhalten, aber du kannst die ' +
    'entsprechenden Features nicht mehr nutzen.\n\nMoechtest du fortfahren?'
  );
  if (!ok) return;

  try {
    // 1. Consent als widerrufen markieren
    if (state.userConsent?.id) {
      await sb
        .from('user_consents')
        .update({ revoked_at: new Date().toISOString(), revoked_reason: 'Nutzer-Widerruf' })
        .eq('id', state.userConsent.id);
    }

    // 2. Gesundheitsdaten loeschen
    for (const table of HEALTH_TABLES) {
      const { error } = await sb.from(table).delete().eq('user_id', state.currentUser.id);
      if (error) console.warn(`Delete ${table}:`, error.message);
    }

    // 3. State bereinigen
    state.userConsent = null;
    state.cacheAnswers = {};
    state.cacheAnswerDates = {};

    showToast('Einwilligung widerrufen. Deine Selbstreflexionsdaten wurden geloescht.');

    // 4. Profil neu rendern
    const { renderProfile } = await import('./profile.js');
    renderProfile();
  } catch (e) {
    console.error('revokeHealthDataConsent error:', e);
    showToast('Fehler beim Widerrufen.', 'error');
  }
}

/** Erneute Einwilligung erteilen (nach Widerruf) */
export async function reGrantConsent() {
  const { navigateTo } = await import('./navigation.js');
  navigateTo('consent');
}

// ══════════════════════════════════════
// DATENEXPORT (Art. 28 nDSG)
// ══════════════════════════════════════

export async function exportUserData() {
  showToast('Daten werden exportiert...');

  try {
    const uid = state.currentUser.id;
    const [profile, answers, checkins, body, journal, friend, energy, progress, access, consents] =
      await Promise.all([
        sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
        sb.from('answers').select('*').eq('user_id', uid),
        sb.from('checkin_entries').select('*').eq('user_id', uid),
        sb.from('body_entries').select('*').eq('user_id', uid),
        sb.from('journal_entries').select('*').eq('user_id', uid),
        sb.from('friend_entries').select('*').eq('user_id', uid),
        sb.from('energy_entries').select('*').eq('user_id', uid),
        sb.from('chapter_progress').select('*').eq('user_id', uid),
        sb.from('course_access').select('*').eq('user_id', uid),
        sb.from('user_consents').select('*').eq('user_id', uid).order('consented_at'),
      ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      format: 'Studio Klarzeit Datenexport v1.0',
      account: {
        email: state.currentUser.email,
        profile: profile.data || null,
      },
      consents: consents.data || [],
      courseAccess: access.data || [],
      chapterProgress: progress.data || [],
      answers: answers.data || [],
      checkinEntries: checkins.data || [],
      bodyEntries: body.data || [],
      journalEntries: journal.data || [],
      friendEntries: friend.data || [],
      energyEntries: energy.data || [],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `studio-klarzeit-export-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Datenexport heruntergeladen.');
  } catch (e) {
    console.error('exportUserData error:', e);
    showToast('Fehler beim Exportieren.', 'error');
  }
}

// ══════════════════════════════════════
// DATENSCHUTZERKLAERUNG
// ══════════════════════════════════════

export function renderPrivacyPolicy() {
  const el = document.getElementById('privacyPolicyContent');
  if (!el) return;

  el.innerHTML = `
    <h1>Datenschutzerklaerung</h1>
    <p style="color:var(--text-muted);font-size:13px;">Stand: Maerz 2026 | Version ${esc(CURRENT_CONSENT_VERSION)}</p>

    <h2>1. Verantwortliche Stelle</h2>
    <p>
      Studio Klarzeit / Praxis f\u00fcr Psychotherapie Graf GmbH<br>
      Sternenriedplatz 2<br>
      CH-6048 Horw, LU<br>
      Schweiz<br><br>
      E-Mail: <a href="mailto:info@studioklarzeit.ch">info@studioklarzeit.ch</a>
    </p>

    <h2>2. Welche Daten wir erheben</h2>
    <table>
      <thead>
        <tr><th>Datenkategorie</th><th>Beispiele</th><th>Zweck</th><th>Rechtsgrundlage</th></tr>
      </thead>
      <tbody>
        <tr><td>Konto-Daten</td><td>E-Mail, Name</td><td>Registrierung, Login, Kommunikation</td><td>Vertragserfu\u0308llung</td></tr>
        <tr><td>Kursfortschritt</td><td>Abgeschlossene Lektionen</td><td>Fortschritt speichern</td><td>Vertragserfu\u0308llung</td></tr>
        <tr><td>Selbstreflexionsdaten</td><td>Check-In-Antworten, Tagebuch, Uebungsantworten</td><td>Persoenliche Reflexion</td><td>Ausdrueckliche Einwilligung</td></tr>
        <tr><td>Zahlungsdaten</td><td>Abwicklung ueber Stripe</td><td>Kaufabwicklung</td><td>Vertragserfu\u0308llung</td></tr>
        <tr><td>Technische Daten</td><td>IP-Adresse, Browser, Geraet</td><td>Sicherheit, Fehlerbehebung</td><td>Berechtigtes Interesse</td></tr>
        <tr><td>B2B-Zuordnung</td><td>Organisation, Jahrescode</td><td>Lizenzverwaltung</td><td>Vertragserfu\u0308llung</td></tr>
      </tbody>
    </table>

    <h2>3. Besonders schuetzenswerte Daten</h2>
    <p>Stimmungs-Check-Ins, Koerper-Check-Ins, das Schutzmuster-Tagebuch und deine Uebungsantworten betreffen dein persoenliches Befinden und gelten gemaess dem Schweizer Datenschutzgesetz (nDSG) als <strong>besonders schuetzenswerte Personendaten</strong>.</p>
    <ul>
      <li>Diese Daten werden nur mit deiner <strong>ausdruecklichen Einwilligung</strong> verarbeitet.</li>
      <li>Sie werden ausschliesslich fuer dich gespeichert und sind nur fuer dich sichtbar.</li>
      <li>Kein Zugriff durch Dritte, Arbeitgeber oder andere Nutzerinnen.</li>
      <li>Keine Verwendung fuer Werbezwecke.</li>
    </ul>

    <h2>4. Datenweitergabe an Dritte</h2>
    <p>Wir geben deine Daten nur an folgende Auftragsverarbeiter weiter, die fuer den Betrieb der App notwendig sind:</p>
    <table>
      <thead>
        <tr><th>Dienst</th><th>Zweck</th><th>Standort</th></tr>
      </thead>
      <tbody>
        <tr><td>Supabase (supabase.com)</td><td>Datenbank, Authentifizierung</td><td>EU (Frankfurt)</td></tr>
        <tr><td>GitHub Pages</td><td>Hosting der Web-App</td><td>USA</td></tr>
        <tr><td>Stripe (stripe.com)</td><td>Zahlungsabwicklung</td><td>USA / EU</td></tr>
        <tr><td>Google Analytics 4 (optional)</td><td>Website-Analyse</td><td>USA</td></tr>
        <tr><td>Meta Pixel (optional)</td><td>Marketing-Analyse</td><td>USA</td></tr>
      </tbody>
    </table>
    <p>Es erfolgt <strong>keine Weitergabe an Werbetreibende</strong>. Bei B2B-Zugang hat dein <strong>Arbeitgeber keinen Einblick</strong> in deine persoenlichen Daten.</p>

    <h2>5. Datenspeicherung und Loeschung</h2>
    <ul>
      <li><strong>Konto-Daten:</strong> So lange das Konto besteht.</li>
      <li><strong>Selbstreflexionsdaten:</strong> So lange das Konto besteht oder bis die Einwilligung widerrufen wird.</li>
      <li><strong>Nach Kontolöschung:</strong> Endgueltige Loeschung innerhalb von 30 Tagen.</li>
      <li><strong>Nach Einwilligungs-Widerruf:</strong> Sofortige Loeschung der Selbstreflexionsdaten.</li>
    </ul>

    <h2>6. Deine Rechte</h2>
    <p>Du hast folgende Rechte gemaess dem Schweizer Datenschutzgesetz (nDSG):</p>
    <ul>
      <li><strong>Recht auf Auskunft</strong> (Art. 25 nDSG) — Du kannst jederzeit erfahren, welche Daten wir ueber dich speichern.</li>
      <li><strong>Recht auf Berichtigung</strong> — Du kannst unrichtige Daten korrigieren lassen.</li>
      <li><strong>Recht auf Loeschung</strong> — Du kannst die Loeschung deiner Daten verlangen.</li>
      <li><strong>Recht auf Datenherausgabe</strong> (Art. 28 nDSG) — Du kannst deine Daten in einem gaengigen elektronischen Format exportieren. Nutze dazu die Export-Funktion in deinem Profil.</li>
      <li><strong>Recht auf Widerruf der Einwilligung</strong> — Du kannst deine Einwilligung jederzeit in den Einstellungen widerrufen.</li>
    </ul>
    <p>Fuer Anfragen wende dich an: <a href="mailto:info@studioklarzeit.ch">info@studioklarzeit.ch</a></p>

    <h2>7. Cookies und Tracking</h2>
    <p>Studio Klarzeit verwendet folgende Cookies:</p>
    <table>
      <thead>
        <tr><th>Cookie / Dienst</th><th>Zweck</th><th>Typ</th></tr>
      </thead>
      <tbody>
        <tr><td>Supabase Auth Token</td><td>Login-Session aufrechterhalten</td><td>Notwendig</td></tr>
        <tr><td>localStorage Einstellungen</td><td>App-Einstellungen (z.B. Dark Mode, Impulse)</td><td>Notwendig</td></tr>
        <tr><td>Google Analytics 4</td><td>Website-Analyse (anonymisiert)</td><td>Analyse (nur mit Zustimmung)</td></tr>
        <tr><td>Meta Pixel</td><td>Marketing-Analyse</td><td>Marketing (nur mit Zustimmung)</td></tr>
      </tbody>
    </table>
    <p>Analyse- und Marketing-Cookies werden <strong>nur nach ausdruecklicher Zustimmung</strong> ueber den Cookie-Banner geladen (Opt-In).</p>

    <h2>8. Aenderungen</h2>
    <p>Wir koennen diese Datenschutzerklaerung von Zeit zu Zeit aktualisieren. Bei wesentlichen Aenderungen, die deine Rechte betreffen, wirst du bei der naechsten Anmeldung um erneute Einwilligung gebeten.</p>
    <p>Die aktuelle Version ist: <strong>${esc(CURRENT_CONSENT_VERSION)}</strong></p>

    <h2>9. Kontakt</h2>
    <p>Bei Fragen zum Datenschutz erreichst du uns unter:<br>
    <a href="mailto:info@studioklarzeit.ch">info@studioklarzeit.ch</a></p>

    <div style="margin-top:40px;padding-top:20px;border-top:1px solid var(--border-light);">
      <button class="btn btn-ghost btn-sm" data-action="navigateTo" data-args='["profile"]'>Zurueck zum Profil</button>
    </div>
  `;
}

// ══════════════════════════════════════
// COOKIE-BANNER
// ══════════════════════════════════════

const COOKIE_KEY = 'klarzeit_cookie_consent';

/** Liest Cookie-Consent aus localStorage */
export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

/** Zeigt Cookie-Banner wenn noch kein Consent */
export function initCookieBanner() {
  if (getCookieConsent()) return; // Bereits entschieden
  const banner = document.getElementById('cookieBanner');
  if (banner) banner.style.display = 'block';
}

/** Alle Cookies akzeptieren */
export async function acceptAllCookies() {
  const consent = { analytics: true, marketing: true, at: Date.now() };
  localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
  hideBanner();

  // Optional: in DB speichern fuer Audit
  saveCookieConsent(consent);

  // Tracking initialisieren
  const seo = await import('./seo.js');
  await seo.loadSeoSettings();
  seo.initGA4();
  seo.initMetaPixel();
}

/** Nur notwendige Cookies */
export function acceptNecessaryCookies() {
  const consent = { analytics: false, marketing: false, at: Date.now() };
  localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
  hideBanner();
  saveCookieConsent(consent);
}

function hideBanner() {
  const banner = document.getElementById('cookieBanner');
  if (banner) banner.style.display = 'none';
}

async function saveCookieConsent(consent) {
  try {
    const sessionId = crypto.randomUUID?.() || String(Date.now());
    await sb.from('cookie_consents').insert({
      user_id: state.currentUser?.id || null,
      session_id: sessionId,
      analytics_accepted: consent.analytics,
      marketing_accepted: consent.marketing,
    });
  } catch (_) { /* non-critical */ }
}
