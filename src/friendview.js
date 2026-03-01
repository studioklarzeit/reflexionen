import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, trDataErr } from './utils.js';
import { hasHealthDataConsent, renderConsentGate } from './consent.js';

// ── RENDER FRIEND VIEW ──

export async function renderFriendView() {
  const container = document.getElementById('friendViewContent');
  if (!container) return;
  if (renderConsentGate(container)) return;

  // Load entries
  let entries = [];
  try {
    const { data, error } = await sb
      .from('friend_entries')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    entries = data || [];
  } catch (e) {
    console.error('FriendView load error:', e);
  }

  const entriesHtml = entries.length
    ? entries.map(e => renderFriendCard(e)).join('')
    : '';

  container.innerHTML = `
    <div class="friend-input-section">
      <div class="friend-step">
        <div class="friend-step-label">Einstimmung</div>
        <div class="friend-intro">Stell dir vor, eine gute Freundin hätte genau deinen Tag gelebt. Sie erzählt dir davon. Was würdest du ihr sagen?</div>
      </div>

      <div class="friend-step">
        <div class="friend-step-label">Deine Worte</div>
        <textarea class="friend-textarea" id="friendTextarea" maxlength="1000" placeholder="Liebe Freundin, …" data-input="updateFriendCounter"></textarea>
        <div class="friend-helper">Wenn dir nichts einfällt, ist das auch eine Information. Vielleicht hast du diese Stimme lange nicht gehört.</div>
        <div class="friend-input-footer">
          <span class="friend-counter"><span id="friendCharCount">0</span> / 1000</span>
          <button class="btn btn-primary btn-sm" id="friendSaveBtn" data-action="saveFriendEntry"><span class="btn-text">Speichern</span></button>
        </div>
      </div>

      <div class="friend-reflection" id="friendReflection" style="display:none;">
        <div class="friend-reflection-text">Und was, wenn du dir das auch selbst sagen dürftest?</div>
      </div>
    </div>

    <div class="friend-entries" id="friendEntries">
      ${entriesHtml}
    </div>
  `;
}

function renderFriendCard(entry) {
  const date = new Date(entry.created_at);
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const dayName = dayNames[date.getDay()];
  const dateStr = `${dayName}, ${date.getDate()}. ${months[date.getMonth()]}`;

  return `
    <div class="journal-entry-card" id="friendEntry-${entry.id}">
      <div class="journal-entry-header">
        <div class="journal-entry-date">${esc(dateStr)}</div>
        <div class="journal-entry-actions">
          <button class="icon-btn" data-action="editFriendEntry" data-args='["${entry.id}"]' title="Bearbeiten">✎</button>
          <button class="icon-btn delete" data-action="deleteFriendEntry" data-args='["${entry.id}"]' title="Löschen">✕</button>
        </div>
      </div>
      <div class="journal-entry-text" id="friendEntryText-${entry.id}">${esc(entry.entry_text)}</div>
    </div>
  `;
}

// ── SAVE NEW ENTRY ──

export async function saveFriendEntry() {
  const textarea = document.getElementById('friendTextarea');
  const text = textarea?.value?.trim();

  // No error if empty — by design. Just silently do nothing.
  if (!text) return;

  const btn = document.getElementById('friendSaveBtn');
  if (btn) btn.disabled = true;

  try {
    const { error } = await sb.from('friend_entries').insert({
      user_id: state.currentUser.id,
      entry_text: text,
    });
    if (error) throw error;

    // Show reflection step
    const reflection = document.getElementById('friendReflection');
    if (reflection) {
      reflection.style.display = 'block';
      reflection.classList.add('friend-reflection-enter');
    }

    // Disable textarea to mark "done" for this session
    textarea.value = '';
    textarea.disabled = true;
    textarea.placeholder = 'Gespeichert ✓';
    document.getElementById('friendCharCount').textContent = '0';

    showToast('Eintrag gespeichert.');

    // Re-enable after a moment so user can write again
    setTimeout(() => {
      textarea.disabled = false;
      textarea.placeholder = 'Liebe Freundin, …';
      if (reflection) {
        reflection.style.display = 'none';
        reflection.classList.remove('friend-reflection-enter');
      }
      // Reload entries
      reloadFriendEntries();
    }, 5000);

  } catch (e) {
    showToast(trDataErr(e, 'save'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function reloadFriendEntries() {
  try {
    const { data, error } = await sb
      .from('friend_entries')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const container = document.getElementById('friendEntries');
    if (container) {
      container.innerHTML = (data || []).map(e => renderFriendCard(e)).join('');
    }
  } catch (e) { /* silent */ }
}

// ── EDIT ENTRY ──

export function editFriendEntry(entryId) {
  const textEl = document.getElementById(`friendEntryText-${entryId}`);
  if (!textEl) return;

  const currentText = textEl.textContent;

  textEl.outerHTML = `
    <textarea class="journal-edit-textarea" id="friendEdit-${entryId}" maxlength="1000">${esc(currentText)}</textarea>
    <div class="journal-edit-actions">
      <button class="btn btn-primary btn-sm" data-action="saveFriendEdit" data-args='["${entryId}"]'><span class="btn-text">Speichern</span></button>
      <button class="btn btn-ghost btn-sm" data-action="cancelFriendEdit" data-args='["${entryId}","${currentText.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/'/g,'&#39;')}"]'>Abbrechen</button>
    </div>
  `;

  const editArea = document.getElementById(`friendEdit-${entryId}`);
  if (editArea) {
    editArea.focus();
    editArea.selectionStart = editArea.value.length;
  }
}

export async function saveFriendEdit(entryId) {
  const editArea = document.getElementById(`friendEdit-${entryId}`);
  if (!editArea) return;

  const newText = editArea.value.trim();
  if (!newText) { showToast('Eintrag darf nicht leer sein.', 'error'); return; }

  try {
    const { error } = await sb
      .from('friend_entries')
      .update({ entry_text: newText })
      .eq('id', entryId)
      .eq('user_id', state.currentUser.id);
    if (error) throw error;

    showToast('Eintrag aktualisiert.');
    await reloadFriendEntries();
  } catch (e) {
    showToast(trDataErr(e, 'save'), 'error');
  }
}

export function cancelFriendEdit(entryId, originalText) {
  const editArea = document.getElementById(`friendEdit-${entryId}`);
  const editActions = editArea?.nextElementSibling;
  if (editActions?.classList.contains('journal-edit-actions')) editActions.remove();

  if (editArea) {
    const div = document.createElement('div');
    div.className = 'journal-entry-text';
    div.id = `friendEntryText-${entryId}`;
    div.textContent = originalText;
    editArea.replaceWith(div);
  }
}

// ── DELETE ENTRY ──

export async function deleteFriendEntry(entryId) {
  if (!confirm('Eintrag wirklich löschen?')) return;

  try {
    const { error } = await sb
      .from('friend_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', state.currentUser.id);
    if (error) throw error;

    showToast('Eintrag gelöscht.');
    const card = document.getElementById(`friendEntry-${entryId}`);
    if (card) card.remove();
  } catch (e) {
    showToast(trDataErr(e, 'delete'), 'error');
  }
}

// ── CHAR COUNTER ──

export function updateFriendCounter() {
  const textarea = document.getElementById('friendTextarea');
  const counter = document.getElementById('friendCharCount');
  if (textarea && counter) counter.textContent = textarea.value.length;
}
