import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, trDataErr } from './utils.js';

// ── DEFAULT QUESTIONS ──

const DEFAULT_QUESTIONS = [
  {
    id: 'q1',
    text: 'Heute habe ich …',
    type: 'single',
    options: [
      { label: '… spüren können, wie es mir geht', color: '#4caf50' },
      { label: '… funktioniert, ohne viel zu spüren', color: '#f0c431' },
      { label: '… vor allem für andere gesorgt', color: '#ef8c2f' },
      { label: '… gar nicht bei mir sein können', color: '#e05555' },
    ],
  },
  {
    id: 'q2',
    text: 'Meine Energie war heute …',
    type: 'single',
    options: [
      { label: '… da', color: '#4caf50' },
      { label: '… knapp, aber es ging', color: '#f0c431' },
      { label: '… weniger als ich gebraucht hätte', color: '#ef8c2f' },
      { label: '… seit dem Aufwachen aufgebraucht', color: '#e05555' },
    ],
  },
  {
    id: 'q3',
    text: 'Was hat heute am meisten Energie gekostet?',
    type: 'multi',
    options: [
      { label: 'Arbeit' },
      { label: 'Entscheidungen' },
      { label: 'Emotionale Arbeit' },
      { label: 'Körper' },
      { label: 'Alles' },
      { label: 'Nichts Bestimmtes' },
    ],
  },
];

let cachedQuestions = null;

async function loadQuestions() {
  if (cachedQuestions) return cachedQuestions;
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'checkin_questions').single();
    if (data?.value) {
      cachedQuestions = JSON.parse(data.value);
      return cachedQuestions;
    }
  } catch (e) { /* defaults */ }
  cachedQuestions = DEFAULT_QUESTIONS;
  return cachedQuestions;
}

export function clearCheckinCache() { cachedQuestions = null; }

// ── COLOR HELPERS ──

const FALLBACK_COLORS = ['#4caf50', '#f0c431', '#ef8c2f', '#e05555'];

function getOptionColor(question, index) {
  return question?.options?.[index]?.color || FALLBACK_COLORS[index] || '#999';
}

function avgColor(q1Idx, q2Idx, questions) {
  // Average of two indices → pick the worse (higher index = more red)
  const avg = Math.round((q1Idx + q2Idx) / 2);
  // Use q1 colors as reference
  return getOptionColor(questions[0], avg);
}

// ── DATE HELPERS ──

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return dayNames[d.getDay()];
}

// ── RENDER CHECK-IN VIEW ──

export async function renderCheckin() {
  const container = document.getElementById('checkinContent');
  if (!container) return;

  const questions = await loadQuestions();

  // Check if already answered today
  let todayEntry = null;
  let entries = [];
  try {
    const { data, error } = await sb
      .from('checkin_entries')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('entry_date', { ascending: false });
    if (error) throw error;
    entries = data || [];
    todayEntry = entries.find(e => e.entry_date === todayStr());
  } catch (e) {
    console.error('Check-in load error:', e);
  }

  const inputHtml = todayEntry
    ? renderAlreadyDone(todayEntry, questions)
    : renderCheckinForm(questions);

  const patternHtml = renderPatternView(entries, questions);

  container.innerHTML = `
    <div class="checkin-input-section" id="checkinFormSection">
      ${inputHtml}
    </div>
    ${patternHtml}
  `;
}

function renderCheckinForm(questions) {
  let html = '';

  questions.forEach((q, qi) => {
    const isMulti = q.type === 'multi';
    html += `<div class="checkin-question">
      <div class="checkin-question-text">${esc(q.text)}</div>
      <div class="checkin-options ${isMulti ? 'checkin-options-multi' : ''}">`;

    q.options.forEach((opt, oi) => {
      const colorDot = opt.color ? `<span class="checkin-dot" style="background:${opt.color};"></span>` : '';
      const inputType = isMulti ? 'checkbox' : 'radio';
      html += `
        <label class="checkin-option" data-q="${qi}" data-o="${oi}">
          <input type="${inputType}" name="checkin_q${qi}" value="${oi}" data-change="onCheckinSelect" style="display:none;">
          ${colorDot}<span class="checkin-option-label">${esc(opt.label)}</span>
        </label>`;
    });

    html += '</div></div>';
  });

  html += `
    <div class="checkin-footer">
      <button class="btn btn-primary btn-sm" id="checkinSaveBtn" data-action="saveCheckin" disabled>
        <span class="btn-text">Speichern</span>
      </button>
    </div>`;

  return html;
}

function renderAlreadyDone(entry, questions) {
  const q1 = questions[0];
  const q2 = questions[1];
  const q3 = questions[2];

  const q1Label = q1?.options?.[entry.q1_answer]?.label || '';
  const q2Label = q2?.options?.[entry.q2_answer]?.label || '';
  const q1Color = getOptionColor(q1, entry.q1_answer);
  const q2Color = getOptionColor(q2, entry.q2_answer);
  const q3Labels = (entry.q3_answers || []).map(i => q3?.options?.[i]?.label || '').filter(Boolean);

  return `
    <div class="checkin-done">
      <div class="checkin-done-icon">✓</div>
      <div class="checkin-done-title">Heute schon eingecheckt</div>
      <div class="checkin-done-summary">
        <div class="checkin-done-row"><span class="checkin-dot" style="background:${q1Color};"></span>${esc(q1Label)}</div>
        <div class="checkin-done-row"><span class="checkin-dot" style="background:${q2Color};"></span>${esc(q2Label)}</div>
        ${q3Labels.length ? `<div class="checkin-done-row checkin-done-tags">${q3Labels.map(l => `<span class="checkin-tag">${esc(l)}</span>`).join('')}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" data-action="redoCheckin" style="margin-top:12px;">Nochmal beantworten</button>
    </div>`;
}

// ── PATTERN VIEW ──

let currentPatternRange = '4w'; // '4w' | '3m' | 'all'
let cachedEntries = [];
let cachedPatternQuestions = [];

function renderPatternView(entries, questions) {
  if (!entries.length) return '';
  cachedEntries = entries;
  cachedPatternQuestions = questions;
  return buildPatternHtml(entries, questions, currentPatternRange);
}

function buildPatternHtml(entries, questions, range) {
  const map = {};
  entries.forEach(e => { map[e.entry_date] = e; });

  const today = new Date();
  const startDate = new Date(today);

  // Determine range
  let rangeLabel = '';
  if (range === '3m') {
    startDate.setDate(startDate.getDate() - 89); // ~3 months
    rangeLabel = 'Letzte 3 Monate';
  } else if (range === 'all') {
    // Find earliest entry
    const dates = entries.map(e => new Date(e.entry_date)).sort((a, b) => a - b);
    if (dates.length) {
      startDate.setTime(dates[0].getTime());
    } else {
      startDate.setDate(startDate.getDate() - 27);
    }
    rangeLabel = 'Gesamter Zeitraum';
  } else {
    startDate.setDate(startDate.getDate() - 27); // 4 weeks
    rangeLabel = 'Letzte 4 Wochen';
  }

  // Adjust to start on Monday
  const startDay = startDate.getDay();
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const weeks = [];
  let current = new Date(startDate);

  while (current <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const entry = map[dateStr];
      const isFuture = current > today;
      let color = null;

      if (entry && entry.q1_answer !== null && entry.q2_answer !== null) {
        color = avgColor(entry.q1_answer, entry.q2_answer, questions);
      }

      week.push({ dateStr, color, isFuture });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  // Count recent reds (last 14 days)
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recentEntries = entries.filter(e => new Date(e.entry_date) >= twoWeeksAgo);
  const redCount = recentEntries.filter(e => {
    const avg = Math.round(((e.q1_answer || 0) + (e.q2_answer || 0)) / 2);
    return avg >= 3;
  }).length;

  let hintHtml = '';
  if (redCount >= 5) {
    hintHtml = `<div class="checkin-hint">In Kapitel 7 findest du Impulse zum Thema professionelle Begleitung — falls du magst.</div>`;
  }

  // Month labels for longer views
  let monthLabels = '';
  if (range !== '4w' && weeks.length > 5) {
    // Add month markers on the left
    monthLabels = weeks.map((week, wi) => {
      const firstDay = week[0]?.dateStr;
      if (!firstDay) return '';
      const d = new Date(firstDay);
      if (d.getDate() <= 7) {
        const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        return months[d.getMonth()];
      }
      return '';
    });
  }

  const dayHeaders = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const isActive = (r) => r === range ? 'active' : '';

  return `
    <div class="checkin-pattern-section" id="checkinPatternSection">
      <div class="checkin-pattern-header">
        <div>
          <div class="checkin-pattern-title">Dein Muster</div>
          <div class="checkin-pattern-subtitle">${rangeLabel} — keine Bewertung, nur ein Bild.</div>
        </div>
        <div class="checkin-range-toggle">
          <button class="checkin-range-btn ${isActive('4w')}" data-action="switchCheckinRange" data-args='["4w"]'>4 W</button>
          <button class="checkin-range-btn ${isActive('3m')}" data-action="switchCheckinRange" data-args='["3m"]'>3 M</button>
          <button class="checkin-range-btn ${isActive('all')}" data-action="switchCheckinRange" data-args='["all"]'>Alles</button>
        </div>
      </div>
      <div class="checkin-pattern-grid ${range !== '4w' ? 'checkin-pattern-compact' : ''}">
        <div class="checkin-grid-header">
          ${dayHeaders.map(d => `<div class="checkin-grid-day">${d}</div>`).join('')}
        </div>
        ${weeks.map((week, wi) => {
          const label = monthLabels && monthLabels[wi] ? `<div class="checkin-grid-month">${monthLabels[wi]}</div>` : '';
          return `
          ${label}
          <div class="checkin-grid-row">
            ${week.map(day => {
              if (day.isFuture) return '<div class="checkin-grid-cell"></div>';
              if (day.color) return `<div class="checkin-grid-cell"><div class="checkin-grid-dot" style="background:${day.color};" title="${day.dateStr}"></div></div>`;
              return `<div class="checkin-grid-cell"><div class="checkin-grid-dot checkin-grid-empty" title="${day.dateStr}"></div></div>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>
      <div class="checkin-pattern-legend">
        <span class="checkin-legend-item"><span class="checkin-dot" style="background:#4caf50;"></span>Gut</span>
        <span class="checkin-legend-item"><span class="checkin-dot" style="background:#f0c431;"></span>Okay</span>
        <span class="checkin-legend-item"><span class="checkin-dot" style="background:#ef8c2f;"></span>Wenig</span>
        <span class="checkin-legend-item"><span class="checkin-dot" style="background:#e05555;"></span>Leer</span>
      </div>
      ${hintHtml}
    </div>`;
}

export function switchCheckinRange(range) {
  currentPatternRange = range;
  const section = document.getElementById('checkinPatternSection');
  if (section && cachedEntries.length) {
    section.outerHTML = buildPatternHtml(cachedEntries, cachedPatternQuestions, range);
  }
}

// ── INTERACTION ──

export function onCheckinSelect() {
  // Toggle active state on labels
  document.querySelectorAll('.checkin-option').forEach(label => {
    const input = label.querySelector('input');
    label.classList.toggle('active', input.checked);
  });

  // Enable save button when q1 and q2 are answered
  const q1 = document.querySelector('input[name="checkin_q0"]:checked');
  const q2 = document.querySelector('input[name="checkin_q1"]:checked');
  const btn = document.getElementById('checkinSaveBtn');
  if (btn) btn.disabled = !(q1 && q2);
}

export async function saveCheckin() {
  const questions = await loadQuestions();
  const q1Val = document.querySelector('input[name="checkin_q0"]:checked')?.value;
  const q2Val = document.querySelector('input[name="checkin_q1"]:checked')?.value;

  if (q1Val === undefined || q2Val === undefined) {
    showToast('Bitte beantworte mindestens die ersten zwei Fragen.', 'error');
    return;
  }

  // Q3: gather all checked
  const q3Checked = Array.from(document.querySelectorAll('input[name="checkin_q2"]:checked')).map(i => parseInt(i.value, 10));

  const btn = document.getElementById('checkinSaveBtn');
  if (btn) btn.disabled = true;

  try {
    // Upsert: one entry per day
    const { error } = await sb.from('checkin_entries').upsert(
      {
        user_id: state.currentUser.id,
        entry_date: todayStr(),
        q1_answer: parseInt(q1Val, 10),
        q2_answer: parseInt(q2Val, 10),
        q3_answers: q3Checked,
      },
      { onConflict: 'user_id,entry_date' }
    );
    if (error) throw error;

    showToast('Check-In gespeichert.');
    await renderCheckin();
  } catch (e) {
    showToast(trDataErr(e, 'save'), 'error');
    if (btn) btn.disabled = false;
  }
}

export async function redoCheckin() {
  // Delete today's entry and re-render form
  try {
    await sb.from('checkin_entries')
      .delete()
      .eq('user_id', state.currentUser.id)
      .eq('entry_date', todayStr());
  } catch (e) { /* ignore */ }
  await renderCheckin();
}
