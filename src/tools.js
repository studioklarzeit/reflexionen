// src/tools.js — Tools-Übersicht mit dynamischen Titelbildern

import { state } from './state.js';
import { esc, imgTransform } from './utils.js';

const TOOLS = [
  { key: 'journal', route: 'journal', title: 'Schutzmuster-Tagebuch', desc: 'Halte fest, was dir heute aufgefallen ist. Ein Satz reicht.', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><line x1="8" y1="7" x2="15" y2="7"/><line x1="8" y1="11" x2="13" y2="11"/></svg>' },
  { key: 'friendView', route: 'friendView', title: 'Freundinnen-Blick', desc: 'Was würdest du einer Freundin über deinen Tag sagen?', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
  { key: 'checkin', route: 'checkin', title: 'Stimmungs-Check-In', desc: '3 kurze Fragen. Unter 30 Sekunden. Muster erkennen.', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>' },
  { key: 'bodycheck', route: 'bodycheck', title: 'Körper-Check-In', desc: 'Wo spürst du gerade Spannung? Tippe auf deinen Körper.', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v4"/><path d="M8 12l4 4 4-4"/><path d="M9 22v-5l3-3 3 3v5"/></svg>' },
  { key: 'energy', route: 'energy', title: 'Energie-Bilanz', desc: 'Was hat heute Energie gegeben? Was hat Energie gekostet?', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 7l-5-5-5 5"/><path d="M7 17l5 5 5-5"/></svg>' },
  { key: 'impulse', route: 'impulse', title: 'Impuls der Woche', desc: 'Jede Woche ein neuer Gedanke, der dich durch den Alltag begleitet.', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' },
];

export function renderTools() {
  const el = document.getElementById('toolsList');
  if (!el) return;

  const images = state.toolImages || {};

  el.innerHTML = TOOLS.map(t => {
    const url = images[t.key];
    const img = url
      ? `<div class="card-image"><img src="${esc(imgTransform(url, 800, 75))}" alt="${esc(t.title)}" loading="lazy"></div>`
      : `<div class="card-image card-image-placeholder"><span>${t.icon}</span></div>`;

    return `<div class="image-card" data-action="navigateTo" data-args='["${t.route}"]'>
      ${img}
      <div class="image-card-body">
        <div class="image-card-title">${esc(t.title)}</div>
        <div class="image-card-desc">${esc(t.desc)}</div>
      </div>
    </div>`;
  }).join('');
}
