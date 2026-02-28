// ── ERROR TRANSLATIONS ──

export function trAuthErr(e) {
  if (!e) return 'Ein unbekannter Fehler ist aufgetreten.';
  const m = (e.message || '') + ' ' + (e.code || '');
  const p = [
    [/Invalid login|invalid_cred/i, 'E-Mail oder Passwort ist falsch.'],
    [/Email not confirmed/i, 'Bitte bestätige zuerst deine E-Mail-Adresse.'],
    [/already registered|already_exists/i, 'Diese E-Mail ist bereits registriert. Bitte einloggen.'],
    [/at least|weak_pass/i, 'Das Passwort muss mindestens 8 Zeichen lang sein.'],
    [/signup_disabled/i, 'Die Registrierung ist derzeit deaktiviert.'],
    [/email_address_invalid/i, 'Bitte gib eine gültige E-Mail-Adresse ein.'],
    [/rate_limit|too many|429/i, 'Zu viele Anfragen. Bitte warte einen Moment.'],
    [/same_password/i, 'Das neue Passwort muss sich vom alten unterscheiden.'],
    [/fetch|network|Failed to fetch/i, 'Verbindungsfehler. Bitte prüfe deine Internetverbindung.'],
    [/timeout/i, 'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.'],
  ];
  for (const [r, msg] of p) if (r.test(m)) return msg;
  console.error('Auth error:', e);
  return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
}

export function trDataErr(e, ctx) {
  if (!e) return 'Ein unbekannter Fehler ist aufgetreten.';
  const m = e.message || '';
  if (/fetch|network/i.test(m)) return 'Verbindungsfehler. Bitte prüfe deine Internetverbindung.';
  if (/JWT|token|expired/i.test(m)) return 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.';
  if (/permission|row-level/i.test(m)) return 'Du hast keine Berechtigung für diese Aktion.';
  if (/duplicate|unique/i.test(m)) return 'Dieser Eintrag existiert bereits.';
  const cm = {
    load: 'Fehler beim Laden der Daten.',
    save: 'Fehler beim Speichern.',
    delete: 'Fehler beim Löschen.',
    course: 'Fehler beim Verarbeiten des Kurses.',
    chapter: 'Fehler beim Verarbeiten des Kapitels.',
    exercise: 'Fehler beim Verarbeiten der Übung.',
    answers: 'Fehler beim Speichern deiner Antworten.',
  };
  return cm[ctx] || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
}

// ── HELPERS ──

export function btnLoading(id, on) {
  const b = document.getElementById(id);
  if (!b) return;
  b.classList.toggle('btn-loading', on);
  b.disabled = on;
}

export function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(window._tt);
  window._tt = setTimeout(() => { t.className = 'toast'; }, 4000);
}

export function esc(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/`/g, '&#96;');
}

// ── IMAGE TRANSFORM ──

export function imgTransform(url, width, quality = 80) {
  if (!url || !url.includes('/storage/v1/object/public/images/')) return url;
  return url.replace('/storage/v1/object/public/images/', '/storage/v1/render/image/public/images/')
    + `?width=${width}&quality=${quality}&resize=contain`;
}

// ── SAVE STATUS INDICATORS ──

export function showSaving() {
  const e = document.getElementById('saveStatus');
  const t = document.getElementById('saveStatusText');
  if (e) e.className = 'save-status visible saving';
  if (t) t.textContent = 'Speichert …';
}

export function showSaved() {
  const e = document.getElementById('saveStatus');
  const t = document.getElementById('saveStatusText');
  if (e) e.className = 'save-status visible';
  if (t) t.textContent = 'Gespeichert';
  clearTimeout(window._sh);
  window._sh = setTimeout(() => { if (e) e.classList.remove('visible'); }, 2500);
}

export function showSaveErr() {
  const e = document.getElementById('saveStatus');
  const t = document.getElementById('saveStatusText');
  if (e) e.className = 'save-status visible error';
  if (t) t.textContent = 'Fehler';
  clearTimeout(window._sh);
  window._sh = setTimeout(() => { if (e) e.className = 'save-status'; }, 5000);
}
