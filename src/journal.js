import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, showConfirm, trDataErr } from './utils.js';
import { hasHealthDataConsent, renderConsentGate } from './consent.js';

// ── DEFAULT IMPULSES ──

const DEFAULT_IMPULSES = [
  { fromChapter: 1, toChapter: 4, phase: 'Verstehen', text: 'Was habe ich heute bemerkt?' },
  { fromChapter: 5, toChapter: 7, phase: 'Vertiefen', text: 'Gab es heute einen Moment, in dem mein Körper etwas gezeigt hat?' },
  { fromChapter: 8, toChapter: 9, phase: 'Muster', text: 'Habe ich heute ein altes Muster erkannt — ohne es sofort ändern zu wollen?' },
  { fromChapter: 10, toChapter: 99, phase: 'Integration', text: 'Was habe ich mir heute erlaubt?' },
];

let cachedImpulses = null;

// ── LOAD IMPULSES FROM SETTINGS ──

async function loadImpulses() {
  if (cachedImpulses) return cachedImpulses;
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'journal_impulses').single();
    if (data?.value) {
      cachedImpulses = JSON.parse(data.value);
      return cachedImpulses;
    }
  } catch (e) { /* defaults */ }
  cachedImpulses = DEFAULT_IMPULSES;
  return cachedImpulses;
}

/** Clear cached impulses (call after admin saves) */
export function clearImpulseCache() {
  cachedImpulses = null;
}

// ── GET CURRENT IMPULSE BASED ON COURSE PROGRESS ──

async function getCurrentImpulse() {
  const impulses = await loadImpulses();

  // Find last opened course
  const courseId = state.currentCourseId || getLastOpenedCourseId();
  if (!courseId) return impulses[0] || DEFAULT_IMPULSES[0];

  // Find furthest chapter with answers in this course
  const courseChapters = state.cacheData.chapters
    .filter(ch => ch.course_id === courseId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (!courseChapters.length) return impulses[0] || DEFAULT_IMPULSES[0];

  // Find the last chapter that has at least one answered exercise
  let furthestChapterPos = 1;
  for (let i = 0; i < courseChapters.length; i++) {
    const ch = courseChapters[i];
    const exercises = state.cacheData.exercises.filter(ex => ex.chapter_id === ch.id);
    const hasAnswer = exercises.some(ex => state.cacheAnswers[ex.id]);
    if (hasAnswer) furthestChapterPos = i + 1; // 1-based position
  }

  // Find matching impulse
  const match = impulses.find(imp =>
    furthestChapterPos >= imp.fromChapter && furthestChapterPos <= imp.toChapter
  );

  return match || impulses[impulses.length - 1] || DEFAULT_IMPULSES[0];
}

function getLastOpenedCourseId() {
  // If user has visited a course this session, use that
  if (state.currentCourseId) return state.currentCourseId;
  // Otherwise use the first course the user has access to
  const courses = state.cacheData.courses;
  if (!courses.length) return null;
  // Prefer first non-restricted or accessible course
  const accessible = courses.find(c => !c.restricted || state.cacheAccess.includes(c.id));
  return accessible?.id || courses[0].id;
}

// ── RENDER JOURNAL VIEW ──

export async function renderJournal() {
  const container = document.getElementById('journalContent');
  if (!container) return;
  if (renderConsentGate(container)) return;

  const impulse = await getCurrentImpulse();
  const courseId = state.currentCourseId || getLastOpenedCourseId();

  // Load entries
  let entries = [];
  try {
    const { data, error } = await sb
      .from('journal_entries')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    entries = data || [];
  } catch (e) {
    console.error('Journal load error:', e);
  }

  const entriesHtml = entries.length
    ? entries.map(e => renderEntryCard(e)).join('')
    : '<div class="empty-state" style="margin-top:24px;">Noch keine Einträge. Schreib deinen ersten Gedanken auf.</div>';

  container.innerHTML = `
    <div class="journal-input-section">
      <div class="journal-impulse">${esc(impulse.text)}</div>
      <div class="journal-phase-badge">${esc(impulse.phase || '')}</div>
      <textarea class="journal-textarea" id="journalTextarea" maxlength="300" placeholder="Ein Satz reicht …" data-input="updateJournalCounter"></textarea>
      <div class="journal-input-footer">
        <span class="journal-counter"><span id="journalCharCount">0</span> / 300</span>
        <button class="btn btn-primary btn-sm" id="journalSaveBtn" data-action="saveJournalEntry"><span class="btn-text">Speichern</span></button>
      </div>
      <div class="save-hint">Nicht vergessen zu speichern</div>
    </div>
    <div class="journal-entries" id="journalEntries">
      ${entriesHtml}
    </div>
  `;

  // Store current impulse + course for saving
  container.dataset.impulse = impulse.text;
  container.dataset.courseId = courseId || '';
}

function renderEntryCard(entry) {
  const date = new Date(entry.created_at);
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const dayName = dayNames[date.getDay()];
  const dateStr = `${dayName}, ${date.getDate()}. ${months[date.getMonth()]}`;

  // Find course name if available
  let courseName = '';
  if (entry.course_id) {
    const course = state.cacheData.courses.find(c => c.id === entry.course_id);
    if (course) courseName = course.name;
  }

  return `
    <div class="journal-entry-card" id="journalEntry-${entry.id}">
      <div class="journal-entry-header">
        <div class="journal-entry-date">${esc(dateStr)}</div>
        ${courseName ? `<div class="journal-entry-course">${esc(courseName)}</div>` : ''}
        <div class="journal-entry-actions">
          <button class="icon-btn" data-action="editJournalEntry" data-args='["${entry.id}"]' title="Bearbeiten">✎</button>
          <button class="icon-btn delete" data-action="deleteJournalEntry" data-args='["${entry.id}"]' title="Löschen">✕</button>
        </div>
      </div>
      ${entry.impulse_text ? `<div class="journal-entry-impulse">${esc(entry.impulse_text)}</div>` : ''}
      <div class="journal-entry-text" id="journalEntryText-${entry.id}">${esc(entry.entry_text)}</div>
    </div>
  `;
}

// ── SAVE NEW ENTRY ──

export async function saveJournalEntry() {
  const textarea = document.getElementById('journalTextarea');
  const text = textarea?.value?.trim();
  if (!text) { showToast('Bitte schreib zuerst etwas.', 'error'); return; }

  const container = document.getElementById('journalContent');
  const impulseText = container?.dataset.impulse || '';
  const courseId = container?.dataset.courseId || null;

  const btn = document.getElementById('journalSaveBtn');
  if (btn) btn.disabled = true;

  try {
    const { error } = await sb.from('journal_entries').insert({
      user_id: state.currentUser.id,
      course_id: courseId || null,
      impulse_text: impulseText,
      entry_text: text,
    });
    if (error) throw error;

    textarea.value = '';
    window._journalUnsaved = false;
    document.getElementById('journalCharCount').textContent = '0';
    showToast('Eintrag gespeichert.');
    await renderJournal();
  } catch (e) {
    showToast(trDataErr(e, 'save'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── EDIT ENTRY ──

export function editJournalEntry(entryId) {
  const textEl = document.getElementById(`journalEntryText-${entryId}`);
  const card = document.getElementById(`journalEntry-${entryId}`);
  if (!textEl || !card) return;

  const currentText = textEl.textContent;

  // Replace text with edit form
  textEl.outerHTML = `
    <textarea class="journal-edit-textarea" id="journalEdit-${entryId}" maxlength="300">${esc(currentText)}</textarea>
    <div class="journal-edit-actions">
      <button class="btn btn-primary btn-sm" data-action="saveJournalEdit" data-args='["${entryId}"]'><span class="btn-text">Speichern</span></button>
      <button class="btn btn-ghost btn-sm" data-action="cancelJournalEdit" data-args='["${entryId}","${currentText.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/'/g,'&#39;')}"]'>Abbrechen</button>
    </div>
  `;

  // Focus textarea
  const editArea = document.getElementById(`journalEdit-${entryId}`);
  if (editArea) {
    editArea.focus();
    editArea.selectionStart = editArea.value.length;
  }
}

export async function saveJournalEdit(entryId) {
  const editArea = document.getElementById(`journalEdit-${entryId}`);
  if (!editArea) return;

  const newText = editArea.value.trim();
  if (!newText) { showToast('Eintrag darf nicht leer sein.', 'error'); return; }

  try {
    const { error } = await sb
      .from('journal_entries')
      .update({ entry_text: newText })
      .eq('id', entryId)
      .eq('user_id', state.currentUser.id);
    if (error) throw error;

    showToast('Eintrag aktualisiert.');
    await renderJournal();
  } catch (e) {
    showToast(trDataErr(e, 'save'), 'error');
  }
}

export function cancelJournalEdit(entryId, originalText) {
  const card = document.getElementById(`journalEntry-${entryId}`);
  if (!card) return;

  // Remove edit textarea and actions, restore original text
  const editArea = document.getElementById(`journalEdit-${entryId}`);
  const editActions = editArea?.nextElementSibling;
  if (editActions?.classList.contains('journal-edit-actions')) editActions.remove();

  if (editArea) {
    const div = document.createElement('div');
    div.className = 'journal-entry-text';
    div.id = `journalEntryText-${entryId}`;
    div.textContent = originalText;
    editArea.replaceWith(div);
  }
}

// ── DELETE ENTRY ──

export async function deleteJournalEntry(entryId) {
  const ok = await showConfirm('Eintrag löschen', 'Möchtest du diesen Eintrag wirklich löschen?');
  if (!ok) return;

  try {
    const { error } = await sb
      .from('journal_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', state.currentUser.id);
    if (error) throw error;

    showToast('Eintrag gelöscht.');
    const card = document.getElementById(`journalEntry-${entryId}`);
    if (card) card.remove();

    // Check if entries are empty
    const entriesContainer = document.getElementById('journalEntries');
    if (entriesContainer && !entriesContainer.querySelector('.journal-entry-card')) {
      entriesContainer.innerHTML = '<div class="empty-state" style="margin-top:24px;">Noch keine Einträge. Schreib deinen ersten Gedanken auf.</div>';
    }
  } catch (e) {
    showToast(trDataErr(e, 'delete'), 'error');
  }
}

// ── CHAR COUNTER ──

export function updateJournalCounter() {
  const textarea = document.getElementById('journalTextarea');
  const counter = document.getElementById('journalCharCount');
  if (textarea && counter) counter.textContent = textarea.value.length;

  // Unsaved warning: warn before leaving if journal has unsaved text
  if (textarea && textarea.value.trim()) {
    window._journalUnsaved = true;
  } else {
    window._journalUnsaved = false;
  }
}

// Warn before page close if journal has unsaved content
window.addEventListener('beforeunload', (e) => {
  if (window._journalUnsaved) {
    e.preventDefault();
    e.returnValue = '';
  }
});
