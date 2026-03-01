import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, trDataErr } from './utils.js';
import { hasHealthDataConsent, renderConsentGate } from './consent.js';

// ── DATE HELPERS ──

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── STATE ──

let allEntries = [];
let todayEntry = null;

// ── RENDER ──

export async function renderEnergyBalance() {
  const container = document.getElementById('energyContent');
  if (!container) return;
  if (renderConsentGate(container)) return;

  try {
    const { data, error } = await sb
      .from('energy_entries')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('entry_date', { ascending: false });
    if (error) throw error;
    allEntries = data || [];
  } catch (e) {
    console.error('Energy load error:', e);
    allEntries = [];
  }

  todayEntry = allEntries.find(e => e.entry_date === todayStr()) || null;

  container.innerHTML = `
    <div class="energy-intro">Das hier ist keine Aufgabe. Nur ein Blick auf deinen Tag.</div>
    <div class="energy-clouds">
      <div class="energy-cloud-col">
        <div class="energy-cloud-header">
          <span class="energy-col-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></span>
          <span class="energy-col-title">Energie gegeben</span>
        </div>
        <div class="energy-cloud" id="energyCloudGiven">
          ${renderCloud('given')}
        </div>
        <div class="energy-cloud-add">
          <input class="energy-cloud-input" id="energyGivenInput" type="text" placeholder="Neues Wort hinzufügen …" maxlength="60"
            data-keyaction="addEnergyItem" data-key="Enter" data-args='["given"]'>
          <button class="energy-cloud-add-btn" data-action="addEnergyItem" data-args='["given"]'>+</button>
        </div>
      </div>

      <div class="energy-cloud-col">
        <div class="energy-cloud-header">
          <span class="energy-col-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
          <span class="energy-col-title">Energie gekostet</span>
        </div>
        <div class="energy-cloud" id="energyCloudCost">
          ${renderCloud('cost')}
        </div>
        <div class="energy-cloud-add">
          <input class="energy-cloud-input" id="energyCostInput" type="text" placeholder="Neues Wort hinzufügen …" maxlength="60"
            data-keyaction="addEnergyItem" data-key="Enter" data-args='["cost"]'>
          <button class="energy-cloud-add-btn" data-action="addEnergyItem" data-args='["cost"]'>+</button>
        </div>
      </div>
    </div>
  `;
}

// ── CLOUD RENDERING ──

function renderCloud(side) {
  const key = side === 'given' ? 'given_items' : 'cost_items';
  const today = todayStr();

  // Count frequencies across past entries (exclude today so toggling doesn't change size)
  const freq = {};
  allEntries.forEach(e => {
    if (e.entry_date === today) return;
    (e[key] || []).forEach(word => {
      const w = word.trim();
      if (w) freq[w] = (freq[w] || 0) + 1;
    });
  });

  // Today's active words
  const todayWords = todayEntry
    ? (todayEntry[key] || []).map(w => w.trim())
    : [];

  // Also include today-only words with freq 0
  todayWords.forEach(w => {
    if (!(w in freq)) freq[w] = 0;
  });

  const words = Object.keys(freq);
  if (!words.length) {
    return `<div class="energy-cloud-empty">Noch keine Einträge — füge dein erstes Wort hinzu.</div>`;
  }

  // Sort: most frequent first, then alphabetical
  words.sort((a, b) => freq[b] - freq[a] || a.localeCompare(b));

  // Calculate font sizes (min 13px, max 28px) based on past frequency
  const maxFreq = Math.max(1, ...Object.values(freq));
  const minSize = 13;
  const maxSize = 28;

  return words.map(word => {
    const count = freq[word];
    const size = maxFreq <= 1
      ? 15
      : minSize + (count / maxFreq) * (maxSize - minSize);
    const isActive = todayWords.includes(word);
    const activeClass = isActive ? 'active' : '';
    const sideClass = side === 'given' ? 'energy-word-given' : 'energy-word-cost';
    const escaped = esc(word).replace(/'/g, '&#39;');
    const totalCount = count + (isActive ? 1 : 0);

    return `<button class="energy-word ${sideClass} ${activeClass}"
      style="font-size:${Math.round(size)}px;"
      data-action="toggleEnergyWord" data-args='["${side}","${escaped}"]'
      title="${totalCount}×">${esc(word)}</button>`;
  }).join('');
}

function refreshCloud(side) {
  const id = side === 'given' ? 'energyCloudGiven' : 'energyCloudCost';
  const el = document.getElementById(id);
  if (el) el.innerHTML = renderCloud(side);
}

// ── TOGGLE WORD ──

export async function toggleEnergyWord(side, word) {
  // Decode HTML entities back
  const decoded = word.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

  const key = side === 'given' ? 'given_items' : 'cost_items';

  let givenItems = todayEntry?.given_items ? [...todayEntry.given_items] : [];
  let costItems = todayEntry?.cost_items ? [...todayEntry.cost_items] : [];
  let items = side === 'given' ? givenItems : costItems;

  const idx = items.indexOf(decoded);
  if (idx >= 0) {
    items.splice(idx, 1);
  } else {
    items.push(decoded);
  }

  if (side === 'given') givenItems = items;
  else costItems = items;

  try {
    const { data, error } = await sb.from('energy_entries').upsert(
      {
        user_id: state.currentUser.id,
        entry_date: todayStr(),
        given_items: givenItems,
        cost_items: costItems,
      },
      { onConflict: 'user_id,entry_date' }
    ).select().single();
    if (error) throw error;

    if (todayEntry) {
      todayEntry.given_items = givenItems;
      todayEntry.cost_items = costItems;
    } else {
      todayEntry = data;
      allEntries.unshift(todayEntry);
    }

    refreshCloud(side);
  } catch (e) {
    showToast(trDataErr(e, 'save'), 'error');
  }
}

// ── ADD NEW WORD ──

export async function addEnergyItem(side) {
  const inputId = side === 'given' ? 'energyGivenInput' : 'energyCostInput';
  const input = document.getElementById(inputId);
  const text = input?.value?.trim();
  if (!text) return;

  let givenItems = todayEntry?.given_items ? [...todayEntry.given_items] : [];
  let costItems = todayEntry?.cost_items ? [...todayEntry.cost_items] : [];
  let items = side === 'given' ? givenItems : costItems;

  if (!items.includes(text)) {
    items.push(text);
  }

  if (side === 'given') givenItems = items;
  else costItems = items;

  try {
    const { data, error } = await sb.from('energy_entries').upsert(
      {
        user_id: state.currentUser.id,
        entry_date: todayStr(),
        given_items: givenItems,
        cost_items: costItems,
      },
      { onConflict: 'user_id,entry_date' }
    ).select().single();
    if (error) throw error;

    if (todayEntry) {
      todayEntry.given_items = givenItems;
      todayEntry.cost_items = costItems;
    } else {
      todayEntry = data;
      allEntries.unshift(todayEntry);
    }

    input.value = '';
    refreshCloud(side);
    input.focus();
  } catch (e) {
    showToast(trDataErr(e, 'save'), 'error');
  }
}

// ── KEPT FOR COMPAT ──
export async function removeEnergyItem() {}
