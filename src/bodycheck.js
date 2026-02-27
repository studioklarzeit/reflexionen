import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, trDataErr } from './utils.js';

// ── BODY ZONES ──

const BODY_ZONES = [
  { id: 'head', label: 'Kopf / Stirn' },
  { id: 'jaw', label: 'Kiefer' },
  { id: 'neck', label: 'Nacken' },
  { id: 'shoulders', label: 'Schultern' },
  { id: 'chest', label: 'Brust / Herz' },
  { id: 'belly', label: 'Magen / Bauch' },
  { id: 'back', label: 'Rücken' },
  { id: 'hands', label: 'Hände' },
  { id: 'legs', label: 'Beine' },
];

const FEELING_WORDS = ['schwer', 'eng', 'kribbelig', 'taub', 'warm', 'ruhig'];

const SPECIAL_OPTIONS = [
  { id: 'nowhere', label: 'Nirgends' },
  { id: 'nothing', label: 'Ich spüre gerade nichts' },
];

// ── SVG BODY ──

function bodySvg(selectedZones, isHeatmap, heatData) {
  // Zone positions (cx, cy) on a 200x460 viewBox — universal person icon
  const zonePositions = {
    head:      { cx: 100, cy: 42,  rx: 28, ry: 28 },
    jaw:       { cx: 100, cy: 72,  rx: 18, ry: 10 },
    neck:      { cx: 100, cy: 92,  rx: 14, ry: 14 },
    shoulders: { cx: 100, cy: 118, rx: 52, ry: 16 },
    chest:     { cx: 100, cy: 150, rx: 34, ry: 26 },
    belly:     { cx: 100, cy: 200, rx: 30, ry: 28 },
    back:      { cx: 100, cy: 175, rx: 38, ry: 50 },
    hands:     { cx: 100, cy: 268, rx: 12, ry: 16, split: true, lcx: 42, rcx: 158 },
    legs:      { cx: 100, cy: 370, rx: 22, ry: 60, split: true, lcx: 78, rcx: 122 },
  };

  let zonesHtml = '';

  for (const zone of BODY_ZONES) {
    const pos = zonePositions[zone.id];
    if (!pos) continue;

    const isSelected = selectedZones.includes(zone.id);
    let opacity = 0;
    let fillColor = 'var(--accent-warm)';

    if (isHeatmap && heatData) {
      const freq = heatData[zone.id] || 0;
      opacity = freq > 0 ? Math.min(0.2 + freq * 0.15, 0.9) : 0;
      fillColor = '#e05555';
    } else {
      opacity = isSelected ? 0.5 : 0;
    }

    const cls = isHeatmap ? '' : `body-zone ${isSelected ? 'active' : ''}`;
    const onclick = isHeatmap ? '' : `data-action="toggleBodyZone" data-args='["${zone.id}"]'`;
    const cursor = isHeatmap ? '' : 'cursor:pointer;';

    if (pos.split) {
      zonesHtml += `
        <ellipse class="${cls}" ${onclick} data-zone="${zone.id}"
          cx="${pos.lcx}" cy="${pos.cy}" rx="${pos.rx}" ry="${pos.ry}"
          fill="${fillColor}" fill-opacity="${opacity}" stroke="none" style="${cursor}" />
        <ellipse class="${cls}" ${onclick} data-zone="${zone.id}"
          cx="${pos.rcx}" cy="${pos.cy}" rx="${pos.rx}" ry="${pos.ry}"
          fill="${fillColor}" fill-opacity="${opacity}" stroke="none" style="${cursor}" />`;
    } else if (zone.id === 'back') {
      zonesHtml = `
        <ellipse class="${cls}" ${onclick} data-zone="${zone.id}"
          cx="${pos.cx}" cy="${pos.cy}" rx="${pos.rx}" ry="${pos.ry}"
          fill="${fillColor}" fill-opacity="${opacity}" stroke="none" style="${cursor}" />` + zonesHtml;
    } else {
      zonesHtml += `
        <ellipse class="${cls}" ${onclick} data-zone="${zone.id}"
          cx="${pos.cx}" cy="${pos.cy}" rx="${pos.rx}" ry="${pos.ry}"
          fill="${fillColor}" fill-opacity="${opacity}" stroke="none" style="${cursor}" />`;
    }
  }

  // Universal person icon — simple, rounded, gender-neutral
  const silhouette = `
    <!-- Head -->
    <circle cx="100" cy="40" r="30" fill="var(--border-light)" stroke="var(--border)" stroke-width="1"/>
    <!-- Body: torso + arms + legs as one rounded shape -->
    <path d="
      M60,80
      Q56,80 50,86
      L38,100 Q30,108 28,120
      L24,160 Q22,174 26,180
      L30,184 Q36,188 40,182
      L50,152 Q54,142 56,132
      L56,118
      L56,230
      Q56,244 64,254
      L66,300 Q68,320 68,340
      L66,380 Q64,400 66,420
      Q68,438 74,440
      L82,440 Q90,440 92,432
      Q94,420 92,400
      L90,340 Q90,320 92,300
      L100,260
      L108,300 Q110,320 110,340
      L108,400 Q106,420 108,432
      Q110,440 118,440
      L126,440 Q132,438 134,420
      Q136,400 134,380
      L132,340 Q132,320 134,300
      L136,254 Q144,244 144,230
      L144,118
      L144,132 Q146,142 150,152
      L160,182 Q164,188 170,184
      L174,180 Q178,174 176,160
      L172,120 Q170,108 162,100
      L150,86 Q144,80 140,80
      Z"
      fill="var(--border-light)" stroke="var(--border)" stroke-width="1" stroke-linejoin="round"/>
  `;

  return `<svg viewBox="0 0 200 460" class="body-svg" xmlns="http://www.w3.org/2000/svg">
    ${silhouette}
    ${zonesHtml}
  </svg>`;
}

// ── RENDER ──

export async function renderBodyCheck() {
  const container = document.getElementById('bodyCheckContent');
  if (!container) return;

  // Load entries
  let entries = [];
  try {
    const { data, error } = await sb
      .from('body_entries')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    entries = data || [];
  } catch (e) {
    console.error('BodyCheck load error:', e);
  }

  const heatmapHtml = entries.length > 0 ? renderHeatmap(entries) : '';

  container.innerHTML = `
    <div class="bodycheck-input-section">
      <div class="bodycheck-step-label">Schritt 1 — Wo spürst du etwas?</div>
      <div class="bodycheck-body-wrap">
        <div class="bodycheck-svg-container" id="bodySvgContainer">
          ${bodySvg([], false, null)}
        </div>
        <div class="bodycheck-zone-labels" id="bodyZoneLabels">
          ${BODY_ZONES.map(z => `
            <button class="bodycheck-label-btn" data-zone="${z.id}" data-action="toggleBodyZone" data-args='["${z.id}"]'>${esc(z.label)}</button>
          `).join('')}
          <div class="bodycheck-special">
            ${SPECIAL_OPTIONS.map(s => `
              <button class="bodycheck-label-btn bodycheck-special-btn" data-zone="${s.id}" data-action="toggleBodyZone" data-args='["${s.id}"]'>${esc(s.label)}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="bodycheck-step" id="bodyStep2">
        <div class="bodycheck-step-label">Schritt 2 (optional) — Wie fühlt es sich an?</div>
        <div class="bodycheck-feelings" id="bodyFeelings">
          ${FEELING_WORDS.map(w => `
            <button class="bodycheck-feeling-btn" data-feeling="${w}" data-action="toggleBodyFeeling" data-args='["${w}"]'>${esc(w)}</button>
          `).join('')}
        </div>
      </div>

      <div class="bodycheck-footer">
        <button class="btn btn-primary btn-sm" id="bodyCheckSaveBtn" data-action="saveBodyCheck">
          <span class="btn-text">Speichern</span>
        </button>
      </div>
    </div>
    ${heatmapHtml}
    ${renderRecentEntries(entries.slice(0, 7))}
  `;
}

// ── HEATMAP ──

function renderHeatmap(entries) {
  // Count zone frequencies
  const freq = {};
  entries.forEach(e => {
    (e.zones || []).forEach(z => {
      freq[z] = (freq[z] || 0) + 1;
    });
  });

  // Normalize to max
  const maxFreq = Math.max(...Object.values(freq), 1);
  const normalized = {};
  for (const [k, v] of Object.entries(freq)) {
    normalized[k] = v / maxFreq * 5; // Scale to ~5 for opacity calc
  }

  // Top zones text
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const topZones = sorted.slice(0, 3).map(([zoneId, count]) => {
    const zone = BODY_ZONES.find(z => z.id === zoneId);
    return zone ? zone.label : zoneId;
  });

  return `
    <div class="bodycheck-heatmap-section">
      <div class="bodycheck-heatmap-title">Deine Körperkarte</div>
      <div class="bodycheck-heatmap-subtitle">Das sind die Bereiche, die du am häufigsten spürst.</div>
      <div class="bodycheck-heatmap-wrap">
        <div class="bodycheck-heatmap-svg">
          ${bodySvg([], true, normalized)}
        </div>
        ${topZones.length ? `
          <div class="bodycheck-heatmap-legend">
            ${topZones.map((name, i) => `
              <div class="bodycheck-heatmap-zone">
                <span class="bodycheck-heatmap-rank">${i + 1}.</span>
                <span>${esc(name)}</span>
              </div>
            `).join('')}
            <div class="bodycheck-heatmap-count">${entries.length} Einträge</div>
          </div>
        ` : ''}
      </div>
    </div>`;
}

// ── RECENT ENTRIES ──

function renderRecentEntries(entries) {
  if (!entries.length) return '';

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const cards = entries.map(e => {
    const d = new Date(e.created_at);
    const dateStr = `${dayNames[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]}`;
    const zoneLabels = (e.zones || []).map(zid => {
      const z = BODY_ZONES.find(b => b.id === zid) || SPECIAL_OPTIONS.find(s => s.id === zid);
      return z ? z.label : zid;
    });
    const feelings = e.feelings || [];

    return `
      <div class="journal-entry-card" id="bodyEntry-${e.id}">
        <div class="journal-entry-header">
          <div class="journal-entry-date">${esc(dateStr)}</div>
          <div class="journal-entry-actions">
            <button class="icon-btn delete" data-action="deleteBodyEntry" data-args='["${e.id}"]' title="Löschen">✕</button>
          </div>
        </div>
        <div class="bodycheck-entry-zones">
          ${zoneLabels.map(l => `<span class="checkin-tag">${esc(l)}</span>`).join('')}
        </div>
        ${feelings.length ? `<div class="bodycheck-entry-feelings">${feelings.map(f => esc(f)).join(', ')}</div>` : ''}
      </div>`;
  }).join('');

  return `<div class="bodycheck-entries"><div class="bodycheck-entries-title">Letzte Einträge</div>${cards}</div>`;
}

// ── INTERACTION ──

let selectedZones = [];
let selectedFeelings = [];

export function toggleBodyZone(zoneId) {
  // Special options deselect all body zones and vice versa
  const isSpecial = SPECIAL_OPTIONS.some(s => s.id === zoneId);

  if (isSpecial) {
    // Deselect all body zones, toggle this special
    selectedZones = selectedZones.includes(zoneId)
      ? selectedZones.filter(z => z !== zoneId)
      : [zoneId];
  } else {
    // Deselect specials, toggle this zone
    selectedZones = selectedZones.filter(z => !SPECIAL_OPTIONS.some(s => s.id === z));
    if (selectedZones.includes(zoneId)) {
      selectedZones = selectedZones.filter(z => z !== zoneId);
    } else {
      selectedZones.push(zoneId);
    }
  }

  updateBodyUI();
}

export function toggleBodyFeeling(word) {
  if (selectedFeelings.includes(word)) {
    selectedFeelings = selectedFeelings.filter(w => w !== word);
  } else {
    selectedFeelings.push(word);
  }
  updateFeelingUI();
}

function updateBodyUI() {
  // Update SVG
  const svgContainer = document.getElementById('bodySvgContainer');
  if (svgContainer) {
    svgContainer.innerHTML = bodySvg(selectedZones, false, null);
  }

  // Update label buttons
  document.querySelectorAll('.bodycheck-label-btn').forEach(btn => {
    const zone = btn.dataset.zone;
    btn.classList.toggle('active', selectedZones.includes(zone));
  });
}

function updateFeelingUI() {
  document.querySelectorAll('.bodycheck-feeling-btn').forEach(btn => {
    btn.classList.toggle('active', selectedFeelings.includes(btn.dataset.feeling));
  });
}

// ── SAVE ──

export async function saveBodyCheck() {
  if (!selectedZones.length) {
    showToast('Tippe mindestens einen Bereich an — oder wähle «Ich spüre gerade nichts».', 'error');
    return;
  }

  const btn = document.getElementById('bodyCheckSaveBtn');
  if (btn) btn.disabled = true;

  try {
    const { error } = await sb.from('body_entries').insert({
      user_id: state.currentUser.id,
      zones: selectedZones,
      feelings: selectedFeelings.length ? selectedFeelings : null,
    });
    if (error) throw error;

    selectedZones = [];
    selectedFeelings = [];
    showToast('Körper-Check-In gespeichert.');
    await renderBodyCheck();
  } catch (e) {
    showToast(trDataErr(e, 'save'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── DELETE ──

export async function deleteBodyEntry(entryId) {
  if (!confirm('Eintrag wirklich löschen?')) return;
  try {
    const { error } = await sb.from('body_entries').delete()
      .eq('id', entryId).eq('user_id', state.currentUser.id);
    if (error) throw error;
    showToast('Eintrag gelöscht.');
    await renderBodyCheck();
  } catch (e) {
    showToast(trDataErr(e, 'delete'), 'error');
  }
}
