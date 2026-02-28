import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast } from './utils.js';
import { navigateTo } from './navigation.js';

// ── DEFAULT IMPULSES (52 — one per week for a year) ──

export const DEFAULT_IMPULSES = [
  // Phase 1: Verstehen (Kapitel 1–7) — Impulse 1–20
  { text: 'Funktionieren ist kein Charakterzug. Es ist ein Zustand.', phase: 1 },
  { text: 'Was hat dir heute Energie gekostet — und hat es jemand gesehen?', phase: 1 },
  { text: 'Erschöpfung beginnt nicht mit dem Zusammenbruch. Sie beginnt mit «ich schaff das schon».', phase: 1 },
  { text: 'Was wäre, wenn du heute nicht funktionieren müsstest?', phase: 1 },
  { text: 'Die unsichtbaren Aufgaben zählen. Auch wenn niemand sie sieht.', phase: 1 },
  { text: 'Nicht jede Müdigkeit lässt sich wegschlafen.', phase: 1 },
  { text: 'Was spürst du gerade in deinem Körper — ohne es verändern zu wollen?', phase: 1 },
  { text: 'Dein Nervensystem merkt sich, was dein Kopf längst vergessen hat.', phase: 1 },
  { text: 'Vielleicht brauchst du keine Lösung. Sondern jemanden, der fragt, wie es dir geht.', phase: 1 },
  { text: 'Pausen sind nicht das Gegenteil von Leistung. Sie sind Teil davon.', phase: 1 },
  { text: 'Du darfst müde sein, ohne einen Grund dafür zu nennen.', phase: 1 },
  { text: 'Manchmal ist «es geht schon» der anstrengendste Satz des Tages.', phase: 1 },
  { text: 'Wer hat heute für dich mitgedacht — und wer nicht?', phase: 1 },
  { text: 'Dein Körper spricht. Die Frage ist, ob du zuhörst.', phase: 1 },
  { text: 'Es ist okay, wenn heute nichts Grosses passiert ist.', phase: 1 },
  { text: 'Was würdest du einer Freundin sagen, die deinen Tag gelebt hat?', phase: 1 },
  { text: 'Nicht alles, was du trägst, ist sichtbar.', phase: 1 },
  { text: 'Du musst nicht alles alleine schaffen. Auch das ist eine Erkenntnis.', phase: 1 },
  { text: 'Welche Aufgabe hast du heute übernommen, die nicht deine war?', phase: 1 },
  { text: 'Wahrnehmung ist der erste Schritt. Nicht Veränderung.', phase: 1 },
  // Phase 2: Vertiefen & Muster (Kapitel 8–9) — Impulse 21–36
  { text: 'Ein Muster zu erkennen heisst nicht, es sofort ändern zu müssen.', phase: 2 },
  { text: 'Was hast du heute automatisch getan, ohne es bewusst zu entscheiden?', phase: 2 },
  { text: 'Deine innere Kritikerin ist laut. Aber sie ist nicht die Wahrheit.', phase: 2 },
  { text: 'Welches Muster wiederholt sich — und seit wann?', phase: 2 },
  { text: 'Du darfst etwas erkennen, ohne es sofort zu lösen.', phase: 2 },
  { text: 'Manchmal ist das Muster nicht das Problem. Sondern dass du es alleine trägst.', phase: 2 },
  { text: 'Was würde sich ändern, wenn du dir erlaubst, langsamer zu sein?', phase: 2 },
  { text: 'Nicht jede Gewohnheit, die funktioniert, tut dir auch gut.', phase: 2 },
  { text: 'Deine Schutzmuster hatten einen guten Grund. Frag dich, ob du sie noch brauchst.', phase: 2 },
  { text: 'Was passiert, wenn du heute mal nichts reparierst?', phase: 2 },
  { text: 'Erkenntnis braucht keine Eile.', phase: 2 },
  { text: 'Du bist mehr als die Summe deiner To-Do-Listen.', phase: 2 },
  { text: 'Welchen Satz sagst du dir am häufigsten — und stimmt er noch?', phase: 2 },
  { text: 'Auch Stärke kann ein Muster sein, das erschöpft.', phase: 2 },
  { text: 'Was brauchst du gerade — nicht was du solltest?', phase: 2 },
  { text: 'Muster sehen ist Mut. Nicht Schwäche.', phase: 2 },
  // Phase 3: Integration & Selbstfürsorge (Kapitel 10–13) — Impulse 37–52
  { text: 'Was hast du dir heute erlaubt?', phase: 3 },
  { text: 'Selbstfürsorge ist nicht egoistisch. Sie ist notwendig.', phase: 3 },
  { text: 'Du darfst Grenzen setzen, ohne dich dafür zu rechtfertigen.', phase: 3 },
  { text: 'Was nährt dich — und wie oft kommt es vor?', phase: 3 },
  { text: 'Heute ist ein guter Tag, um sanft mit dir zu sein.', phase: 3 },
  { text: 'Du musst nicht perfekt heilen. Du darfst einfach weitergehen.', phase: 3 },
  { text: 'Was hat dir heute gut getan — auch wenn es klein war?', phase: 3 },
  { text: 'Veränderung passiert nicht in grossen Sprüngen. Sondern in kleinen Momenten.', phase: 3 },
  { text: 'Du darfst Hilfe annehmen. Das ist kein Versagen.', phase: 3 },
  { text: 'Welche Entscheidung hast du heute für dich getroffen?', phase: 3 },
  { text: 'Es reicht, wenn du heute einfach da bist.', phase: 3 },
  { text: 'Dein Wert hängt nicht davon ab, wie viel du schaffst.', phase: 3 },
  { text: 'Was möchtest du loslassen — und was festhalten?', phase: 3 },
  { text: 'Du hast schon so viel getragen. Du darfst auch mal ablegen.', phase: 3 },
  { text: 'Nicht jeder Tag muss produktiv sein. Manche dürfen einfach sein.', phase: 3 },
  { text: 'Du bist genug. Genau so.', phase: 3 },
];

let cachedImpulses = null;

async function loadImpulses() {
  if (cachedImpulses) return cachedImpulses;
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'weekly_impulses').single();
    if (data?.value) {
      cachedImpulses = JSON.parse(data.value);
      return cachedImpulses;
    }
  } catch (e) { /* defaults */ }
  cachedImpulses = DEFAULT_IMPULSES;
  return cachedImpulses;
}

export function clearWeeklyImpulseCache() { cachedImpulses = null; }

// ── GET CURRENT WEEK'S IMPULSE ──

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function getUserPhase() {
  // Determine phase from course progress (same logic as journal)
  const courseId = state.currentCourseId || getFirstCourseId();
  if (!courseId) return 1;

  const courseChapters = state.cacheData.chapters
    .filter(ch => ch.course_id === courseId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (!courseChapters.length) return 1;

  let furthestPos = 1;
  for (let i = 0; i < courseChapters.length; i++) {
    const ch = courseChapters[i];
    const exercises = state.cacheData.exercises.filter(ex => ex.chapter_id === ch.id);
    const hasAnswer = exercises.some(ex => state.cacheAnswers[ex.id]);
    if (hasAnswer) furthestPos = i + 1;
  }

  if (furthestPos <= 7) return 1;
  if (furthestPos <= 9) return 2;
  return 3;
}

function getFirstCourseId() {
  const courses = state.cacheData.courses;
  if (!courses.length) return null;
  const accessible = courses.find(c => !c.restricted || state.cacheAccess.includes(c.id));
  return accessible?.id || courses[0].id;
}

// ── RENDER IMPULSE CARD ──

let currentImpulseText = '';

export async function renderWeeklyImpulse() {
  const container = document.getElementById('weeklyImpulseCard');
  if (!container) return;

  const impulses = await loadImpulses();
  const phase = getUserPhase();

  // Filter impulses for user's phase (include current + all earlier phases)
  const available = impulses.filter(imp => imp.phase <= phase);
  if (!available.length) { container.innerHTML = ''; return; }

  // Pick based on week number
  const week = getWeekNumber();
  const impulse = available[week % available.length];
  currentImpulseText = impulse.text;

  container.innerHTML = `
    <div class="weekly-impulse">
      <div class="weekly-impulse-label">Impuls der Woche</div>
      <div class="weekly-impulse-text">«${esc(impulse.text)}»</div>
      <div class="weekly-impulse-divider"></div>
      <div class="weekly-impulse-actions">
        <button class="impulse-action-btn" data-action="shareImpulse" title="Impuls teilen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span>Teilen</span>
        </button>
        <button class="impulse-action-btn" data-action="exportImpulsePDF" title="Als PDF-Plakat speichern">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>PDF</span>
        </button>
      </div>
    </div>
  `;
}

// ── IMPULSE STANDALONE VIEW (Tool page) ──

export async function renderImpulseView() {
  const container = document.getElementById('impulseViewContent');
  if (!container) return;

  const impulses = await loadImpulses();
  const phase = getUserPhase();
  const available = impulses.filter(imp => imp.phase <= phase);

  if (!available.length) {
    container.innerHTML = '<div class="state-screen visible" style="display:block;"><div class="state-title">Noch keine Impulse</div><div class="state-text">Impulse werden freigeschaltet, sobald du mit einem Kurs beginnst.</div></div>';
    return;
  }

  const week = getWeekNumber();
  const impulse = available[week % available.length];
  currentImpulseText = impulse.text;

  // Phase labels
  const phaseLabels = { 1: 'Verstehen', 2: 'Vertiefen & Muster', 3: 'Integration & Selbstfürsorge' };

  // Build upcoming impulses (next 3 weeks)
  let upcomingHtml = '';
  for (let i = 1; i <= 3; i++) {
    const nextImpulse = available[(week + i) % available.length];
    upcomingHtml += `
      <div class="impulse-upcoming-item">
        <div class="impulse-upcoming-week">In ${i} ${i === 1 ? 'Woche' : 'Wochen'}</div>
        <div class="impulse-upcoming-text">«${esc(nextImpulse.text)}»</div>
      </div>`;
  }

  container.innerHTML = `
    <div class="impulse-view-current">
      <div class="impulse-view-phase">${phaseLabels[phase] || 'Phase ' + phase}</div>
      <div class="impulse-view-quote">«${esc(impulse.text)}»</div>
      <div class="impulse-view-label">Impuls der Woche · KW ${week + 1}</div>
      <div class="impulse-view-actions">
        <button class="btn btn-primary btn-sm" data-action="shareImpulse">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span class="btn-text">Teilen</span>
        </button>
        <button class="btn btn-secondary btn-sm" data-action="exportImpulsePDF">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span class="btn-text">Als PDF</span>
        </button>
      </div>
    </div>

    <div class="section-header" style="margin-top:40px;">
      <span class="section-title">Kommende Impulse</span>
    </div>
    <div class="impulse-upcoming-list">
      ${upcomingHtml}
    </div>

    <div class="impulse-view-info">
      <p>Jede Woche ein neuer Impuls — passend zu deiner Phase im Kurs. Insgesamt ${available.length} Impulse für Phase 1–${phase}.</p>
    </div>
  `;
}

// ── GET CURRENT IMPULSE TEXT (for loading splash) ──

export async function getCurrentImpulseText() {
  const impulses = await loadImpulses();
  const phase = getUserPhase();
  const available = impulses.filter(imp => imp.phase <= phase);
  if (!available.length) return null;
  const week = getWeekNumber();
  const impulse = available[week % available.length];
  currentImpulseText = impulse.text;
  return impulse.text;
}

// ── IMPULSE SPLASH PAGE (legacy stub — loading splash handles this now) ──

export async function renderImpulseSplash() {
  // No longer used — loading splash shows the impulse
}

export function dismissImpulse() {
  navigateTo('courses');
}

export function dismissImpulse30() {
  const key = 'klarzeit_impulse_muted_' + (state.currentUser?.id || '');
  localStorage.setItem(key, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
  navigateTo('courses');
}

export function isImpulseMuted() {
  const key = 'klarzeit_impulse_muted_' + (state.currentUser?.id || '');
  const until = parseInt(localStorage.getItem(key));
  return until && Date.now() < until;
}

// ── POSTER DESIGN ──

const POSTER_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Marcellus&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap');
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'PT Serif', Georgia, serif;
    background: #F5F0EB;
    width: 210mm; height: 297mm;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .poster-bg {
    position: absolute; inset: 0;
    background: #F5F0EB;
  }
  .poster-accent-top { display: none; }
  .poster-content {
    position: relative; z-index: 1;
    text-align: center; padding: 60px 56px;
    max-width: 100%;
  }
  .poster-logo {
    font-family: 'Marcellus', serif;
    font-size: 13pt; letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8C7B6B;
    margin-bottom: 28px;
  }
  .poster-quote {
    font-family: 'Marcellus', serif;
    font-size: 44pt; line-height: 1.45;
    color: #3B3937;
    letter-spacing: -0.01em;
    max-width: 600px; margin: 0 auto;
    font-weight: 400;
  }
  .poster-divider {
    width: 60px; height: 1px;
    background: #C9A96E;
    margin: 28px auto;
    opacity: 0.6;
  }
  .poster-label {
    font-family: 'PT Serif', serif;
    font-size: 9pt; letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #A89888;
    font-style: italic;
  }
  .poster-footer {
    position: absolute; bottom: 40px;
    left: 0; right: 0; text-align: center;
  }
  .poster-url {
    font-family: 'PT Serif', serif;
    font-size: 8pt; letter-spacing: 0.08em;
    color: #B8A898; opacity: 0.7;
  }
`;

function buildPosterHtml(text) {
  return `
    <div class="poster-bg"></div>
    <div class="poster-accent-top"></div>
    <div class="poster-content">
      <div class="poster-logo">Studio Klarzeit</div>
      <div class="poster-quote">«${esc(text)}»</div>
      <div class="poster-divider"></div>
      <div class="poster-label">Impuls der Woche</div>
    </div>
    <div class="poster-footer">
      <div class="poster-url">studioklarzeit.ch</div>
    </div>
  `;
}

// ── PDF EXPORT ──

export async function exportImpulsePDF() {
  if (!currentImpulseText) { showToast('Kein Impuls vorhanden.', 'error'); return; }

  showToast('PDF wird erstellt …');

  try {
    // Render poster as high-quality JPG (A4 canvas) and share as image
    const canvas = await renderPosterCanvas();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    const file = new File([blob], 'Impuls-der-Woche-Plakat.jpg', { type: 'image/jpeg' });

    // Try native Web Share API
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Impuls der Woche — Plakat',
        files: [file],
      });
    } else {
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Impuls-der-Woche-Plakat.jpg';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Plakat als JPG heruntergeladen.');
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    console.error('PDF export error:', e);
    showToast('Export fehlgeschlagen.', 'error');
  }
}

// ── CANVAS POSTER (for PNG share) ──

async function ensureFontsLoaded() {
  // Inject Google Fonts stylesheet into main document if not already present
  if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Marcellus"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Marcellus&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap';
    document.head.appendChild(link);
  }
  // Wait until all fonts are ready
  await document.fonts.ready;
  // Explicitly request the sizes we need
  await Promise.all([
    document.fonts.load('400 100px Marcellus'),
    document.fonts.load('400 38px Marcellus'),
    document.fonts.load('italic 400 26px "PT Serif"'),
    document.fonts.load('400 22px "PT Serif"'),
  ]);
}

async function renderPosterCanvas() {
  const W = 1240, H = 1754; // A4 at ~150 DPI
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#F5F0EB';
  ctx.fillRect(0, 0, W, H);

  // Load fonts into main document
  await ensureFontsLoaded();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure quote lines
  ctx.font = '400 100px Marcellus';
  const quoteText = `«${currentImpulseText}»`;
  const maxWidth = W - 160;
  const lineHeight = 140;
  const lines = wrapText(ctx, quoteText, maxWidth);
  const quoteHeight = lines.length * lineHeight;

  // Element heights (visual)
  const logoH = 38, labelH = 26;
  const gap = 50;
  // Total: logo + gap + quote + gap + divider-area(with label)
  const bottomSection = 1 + gap + labelH; // divider + gap + label
  const totalBlock = logoH + gap + quoteHeight + gap + bottomSection;
  const startY = (H - totalBlock) / 2;

  // ── Logo ──
  ctx.fillStyle = '#8C7B6B';
  ctx.font = '400 38px Marcellus';
  // Manual letter spacing by drawing char by char
  drawSpacedText(ctx, 'STUDIO KLARZEIT', W / 2, startY + logoH / 2, 5);

  // ── Quote ──
  ctx.fillStyle = '#3B3937';
  ctx.font = '400 100px Marcellus';
  const quoteY = startY + logoH + gap;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, quoteY + i * lineHeight + lineHeight / 2);
  }

  // ── Divider line ──
  const divY = quoteY + quoteHeight + gap;
  ctx.strokeStyle = '#C9A96E';
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 50, divY);
  ctx.lineTo(W / 2 + 50, divY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── Label ──
  ctx.fillStyle = '#A89888';
  ctx.font = 'italic 400 26px "PT Serif"';
  drawSpacedText(ctx, 'IMPULS DER WOCHE', W / 2, divY + gap + labelH / 2, 3);

  // ── Footer URL ──
  ctx.fillStyle = '#B8A898';
  ctx.globalAlpha = 0.7;
  ctx.font = '400 22px "PT Serif"';
  drawSpacedText(ctx, 'studioklarzeit.ch', W / 2, H - 70, 2);
  ctx.globalAlpha = 1;

  return canvas;
}

// Manual letter-spacing (ctx.letterSpacing not widely supported)
function drawSpacedText(ctx, text, x, y, spacing) {
  const chars = text.split('');
  let totalWidth = 0;
  for (const ch of chars) totalWidth += ctx.measureText(ch).width;
  totalWidth += (chars.length - 1) * spacing;
  let curX = x - totalWidth / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of chars) {
    ctx.fillText(ch, curX, y);
    curX += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prevAlign;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ── SHARE ──

export async function shareImpulse() {
  if (!currentImpulseText) { showToast('Kein Impuls vorhanden.', 'error'); return; }

  showToast('Plakat wird erstellt …');

  try {
    const canvas = await renderPosterCanvas();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    const file = new File([blob], 'Impuls-der-Woche.jpg', { type: 'image/jpeg' });

    // Try native Web Share API (mobile + modern desktop)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Impuls der Woche — Studio Klarzeit',
        text: currentImpulseText,
        files: [file],
      });
    } else {
      // Fallback: download the JPG
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Impuls-der-Woche.jpg';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Plakat als JPG heruntergeladen.');
    }
  } catch (e) {
    if (e.name === 'AbortError') return; // user cancelled share dialog
    console.error('Share error:', e);
    showToast('Teilen fehlgeschlagen.', 'error');
  }
}
