import * as XLSX from 'xlsx';
import { sb } from './config.js';
import { state } from './state.js';
import { esc, btnLoading, showToast, trDataErr } from './utils.js';
import { loadAllData } from './data.js';
import { renderAdminExercises } from './admin.js';

// ── State ──
let bulkParsed = null;   // parsed data ready for import
let bulkErrors = [];      // validation errors

// ══════════════════════════════════════
// RENDER
// ══════════════════════════════════════

export function renderBulkUpload() {
  const el = document.getElementById('bulkUploadSection');
  if (!el) return;

  const courses = state.cacheData.courses || [];
  const courseOpts = courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

  el.innerHTML = `
    <div class="bulk-upload-wrap">
      <button class="bulk-toggle" data-action="toggleBulkUpload">
        <span class="bulk-toggle-icon" id="bulkToggleIcon">▸</span>
        <span>Bulk Upload (Excel)</span>
      </button>
      <div class="bulk-content" id="bulkContent" style="display:none;">
        <p class="bulk-hint">Lade alle Übungen und Fragen eines Kapitels auf einmal hoch.
          <button class="btn btn-ghost btn-sm" data-action="downloadBulkTemplate" style="margin-left:8px;">↓ Vorlage herunterladen</button>
        </p>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Kurs</label>
            <select class="form-select" id="bulkCourseSelect" data-change="updateBulkChapterSelect">
              <option value="">— Kurs wählen —</option>
              ${courseOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Kapitel</label>
            <select class="form-select" id="bulkChapterSelect" disabled>
              <option value="">— Zuerst Kurs wählen —</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Modus</label>
          <select class="form-select" id="bulkModeSelect" style="max-width:300px;">
            <option value="append">Anhängen (bestehende Übungen behalten)</option>
            <option value="replace">Ersetzen (alle Übungen des Kapitels löschen)</option>
          </select>
        </div>

        <div class="bulk-dropzone" id="bulkDropzone" data-action="triggerClickOn" data-args='["bulkFileInput"]'>
          <input type="file" id="bulkFileInput" accept=".xlsx,.xls" style="display:none;" data-change="handleBulkFileSelect" data-ev>
          <div class="bulk-dropzone-text">
            <span style="font-size:24px;">📄</span><br>
            Excel-Datei hierher ziehen<br>
            <span style="font-size:13px;color:var(--text-muted);">oder klicken zum Auswählen (.xlsx)</span>
          </div>
        </div>

        <div id="bulkPreview"></div>
        <div id="bulkActions" style="display:none;">
          <div class="actions" style="margin-top:16px;">
            <button class="btn btn-primary" id="bulkImportBtn" data-action="executeBulkImport"><span class="btn-text">Importieren</span></button>
            <button class="btn btn-ghost" data-action="clearBulkUpload">Abbrechen</button>
          </div>
        </div>
      </div>
    </div>`;

  // Drag & drop events
  setTimeout(() => {
    const dz = document.getElementById('bulkDropzone');
    if (!dz) return;
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleBulkFile(file);
    });
  }, 0);
}

export function toggleBulkUpload() {
  const content = document.getElementById('bulkContent');
  const icon = document.getElementById('bulkToggleIcon');
  if (!content) return;
  const open = content.style.display !== 'none';
  content.style.display = open ? 'none' : '';
  if (icon) icon.textContent = open ? '▸' : '▾';
}

export function updateBulkChapterSelect() {
  const courseId = document.getElementById('bulkCourseSelect').value;
  const sel = document.getElementById('bulkChapterSelect');
  if (!courseId) {
    sel.innerHTML = '<option value="">— Zuerst Kurs wählen —</option>';
    sel.disabled = true;
    return;
  }
  const chapters = (state.cacheData.chapters || []).filter(ch => ch.course_id === courseId);
  sel.innerHTML = '<option value="">— Kapitel wählen —</option>' +
    chapters.map(ch => `<option value="${ch.id}">${esc(ch.name)}</option>`).join('');
  sel.disabled = false;
}

// ══════════════════════════════════════
// TEMPLATE DOWNLOAD
// ══════════════════════════════════════

export function downloadBulkTemplate() {
  const headers = ['Übung', 'Beschreibung', 'Typ', 'Fragetyp', 'Inhalt', 'Label', 'Hinweis', 'Platzhalter', 'Optionen', 'Skala', 'Breit'];
  const example = [
    ['Innere Wahrnehmung', 'Erste Übung zur Selbstreflexion', 'titel', '', 'Achtsame Selbstbeobachtung', '', '', '', '', '', ''],
    ['', '', 'text', '', 'Nimm dir einen Moment Zeit und spüre in dich hinein.', '', '', '', '', '', ''],
    ['', '', 'frage', 'text', 'Was nimmst du gerade wahr?', 'Reflexion · 01', 'Beschreibe deine aktuelle Wahrnehmung.', 'Ich nehme wahr, dass …', '', '', 'ja'],
    ['', '', 'frage', 'choice', 'Wie fühlst du dich gerade?', 'Reflexion · 02', '', '', 'Gut|Neutral|Schlecht', '', ''],
    ['', '', 'trennlinie', '', '', '', '', '', '', '', ''],
    ['', '', 'frage', 'scale', 'Wie intensiv ist das Gefühl?', 'Reflexion · 03', '', '', '', '1-10,1,Gar nicht,Sehr stark', ''],
    ['', '', 'frage', 'multichoice', 'Welche Bereiche sind betroffen?', 'Reflexion · 04', '', '', 'Körper|Geist|Emotionen|Beziehungen', '', ''],
    ['Körperwahrnehmung', 'Zweite Übung zum Körperbewusstsein', 'frage', 'text', 'Wo spürst du Spannung im Körper?', 'Körper · 01', '', '', '', '', 'ja'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);

  // Column widths
  ws['!cols'] = [
    { wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
    { wch: 40 }, { wch: 16 }, { wch: 30 }, { wch: 25 },
    { wch: 30 }, { wch: 30 }, { wch: 6 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Übungen');
  XLSX.writeFile(wb, 'Vorlage_Bulk_Upload.xlsx');
}

// ══════════════════════════════════════
// FILE HANDLING & PARSING
// ══════════════════════════════════════

export function handleBulkFileSelect(e) {
  const file = e.target.files[0];
  if (file) handleBulkFile(file);
}

export async function handleBulkFile(file) {
  if (!file.name.match(/\.xlsx?$/i)) {
    showToast('Bitte eine Excel-Datei (.xlsx) auswählen.', 'error');
    return;
  }

  const data = await file.arrayBuffer();
  let wb;
  try {
    wb = XLSX.read(data, { type: 'array' });
  } catch (e) {
    showToast('Datei konnte nicht gelesen werden: ' + e.message, 'error');
    return;
  }

  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) { showToast('Kein Sheet in der Datei gefunden.', 'error'); return; }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) { showToast('Die Datei enthält keine Daten (nur Header?).', 'error'); return; }

  const parsed = parseBulkRows(rows);
  const { valid, errors } = validateBulkData(parsed);
  bulkParsed = parsed;
  bulkErrors = errors;

  renderBulkPreview(parsed, errors);

  const actionsEl = document.getElementById('bulkActions');
  if (actionsEl) actionsEl.style.display = valid ? '' : 'none';

  // Update dropzone to show filename
  const dz = document.getElementById('bulkDropzone');
  if (dz) {
    dz.innerHTML = `<div class="bulk-dropzone-text"><span style="font-size:18px;">✓</span> <strong>${esc(file.name)}</strong><br><span style="font-size:13px;color:var(--text-muted);">Klicke um eine andere Datei zu wählen</span></div>`;
  }
}

const COL_MAP = {
  'übung': 0, 'beschreibung': 1, 'typ': 2, 'fragetyp': 3,
  'inhalt': 4, 'label': 5, 'hinweis': 6, 'platzhalter': 7,
  'optionen': 8, 'skala': 9, 'breit': 10,
};

function normalizeHeader(h) {
  return String(h).toLowerCase().trim()
    .replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ß/g, 'ss');
}

function parseBulkRows(rows) {
  // Detect header row — map column names to indices
  const headerRow = rows[0].map(c => String(c).toLowerCase().trim());
  const colIdx = {};
  for (const [key, defaultIdx] of Object.entries(COL_MAP)) {
    // Try exact match first, then normalized
    let idx = headerRow.indexOf(key);
    if (idx === -1) idx = headerRow.findIndex(h => normalizeHeader(h) === normalizeHeader(key));
    colIdx[key] = idx !== -1 ? idx : defaultIdx;
  }

  const exercises = [];
  let currentExercise = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (key) => String(row[colIdx[key]] ?? '').trim();

    // Skip completely empty rows
    if (row.every(c => String(c).trim() === '')) continue;

    const exerciseName = get('übung');
    const description = get('beschreibung');
    const typ = get('typ').toLowerCase();

    // New exercise starts when "Übung" column is filled
    if (exerciseName) {
      currentExercise = { name: exerciseName, description, elements: [], _row: i + 1 };
      exercises.push(currentExercise);
    }

    if (!typ) continue; // Skip rows without type

    if (!currentExercise) {
      // No exercise defined yet — will be caught by validation
      exercises.push({ name: '', description: '', elements: [], _row: i + 1, _orphan: true });
      currentExercise = exercises[exercises.length - 1];
    }

    const element = { _row: i + 1 };

    if (typ === 'frage') {
      element.kind = 'question';
      element.type = get('fragetyp').toLowerCase() || 'text';
      element.question = get('inhalt');
      element.label = get('label');
      element.hint = get('hinweis');
      element.placeholder = get('platzhalter');
      element.wide = get('breit').toLowerCase() === 'ja';

      if (element.type === 'choice' || element.type === 'multichoice') {
        const optsRaw = get('optionen');
        element.options = optsRaw ? optsRaw.split('|').map(o => o.trim()).filter(Boolean) : [];
      } else if (element.type === 'scale') {
        element.options = parseScaleString(get('skala'));
      } else {
        element.options = [];
      }
    } else {
      element.kind = 'content';
      const typeMap = { 'titel': 'heading', 'text': 'text', 'zitat': 'quote', 'trennlinie': 'divider' };
      element.contentType = typeMap[typ] || typ;
      element.content = get('inhalt');
    }

    currentExercise.elements.push(element);
  }

  return exercises;
}

function parseScaleString(s) {
  if (!s) return { min: 1, max: 10, step: 1, labelMin: '', labelMax: '' };
  // Format: "1-10,1,Label links,Label rechts"
  const parts = s.split(',').map(p => p.trim());
  const range = (parts[0] || '1-10').split('-');
  return {
    min: Number(range[0]) || 1,
    max: Number(range[1]) || 10,
    step: Number(parts[1]) || 1,
    labelMin: parts[2] || '',
    labelMax: parts[3] || '',
  };
}

// ══════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════

function validateBulkData(exercises) {
  const errors = [];

  if (!exercises.length) {
    errors.push({ row: '-', msg: 'Keine Übungen in der Datei gefunden.' });
    return { valid: false, errors };
  }

  // Check first row defines an exercise
  if (exercises[0]._orphan || !exercises[0].name) {
    errors.push({ row: exercises[0]._row, msg: 'Die erste Datenzeile muss einen Übungsnamen enthalten.' });
  }

  for (const ex of exercises) {
    if (!ex.name && !ex._orphan) {
      errors.push({ row: ex._row, msg: 'Übungsname fehlt.' });
    }

    if (!ex.elements.length && ex.name) {
      errors.push({ row: ex._row, msg: `Übung "${ex.name}" hat keine Elemente (Fragen/Inhalte).` });
    }

    for (const el of ex.elements) {
      if (el.kind === 'question') {
        if (!el.question) {
          errors.push({ row: el._row, msg: 'Fragetext fehlt.' });
        }
        const validTypes = ['text', 'choice', 'multichoice', 'scale'];
        if (!validTypes.includes(el.type)) {
          errors.push({ row: el._row, msg: `Ungültiger Fragetyp "${el.type}". Erlaubt: ${validTypes.join(', ')}` });
        }
        if ((el.type === 'choice' || el.type === 'multichoice') && (!el.options || el.options.length < 2)) {
          errors.push({ row: el._row, msg: `${el.type === 'choice' ? 'Single' : 'Multi'} Choice braucht mindestens 2 Optionen (getrennt mit |).` });
        }
      } else if (el.kind === 'content') {
        const validTypes = ['heading', 'text', 'quote', 'divider'];
        if (!validTypes.includes(el.contentType)) {
          errors.push({ row: el._row, msg: `Ungültiger Inhaltstyp "${el.contentType}".` });
        }
        if (el.contentType !== 'divider' && !el.content) {
          errors.push({ row: el._row, msg: 'Inhalt fehlt für diesen Block.' });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ══════════════════════════════════════
// PREVIEW
// ══════════════════════════════════════

function renderBulkPreview(exercises, errors) {
  const el = document.getElementById('bulkPreview');
  if (!el) return;

  const errorRows = new Set(errors.map(e => e.row));

  let html = '';

  // Error list
  if (errors.length) {
    html += `<div class="bulk-errors"><strong>Fehler gefunden (${errors.length}):</strong><ul>` +
      errors.map(e => `<li>Zeile ${e.row}: ${esc(e.msg)}</li>`).join('') +
      '</ul></div>';
  }

  // Stats
  let totalQuestions = 0, totalContent = 0;
  for (const ex of exercises) {
    for (const el of ex.elements) {
      if (el.kind === 'question') totalQuestions++;
      else totalContent++;
    }
  }

  html += `<div class="bulk-stats">${exercises.filter(e => e.name).length} Übungen · ${totalQuestions} Fragen · ${totalContent} Inhaltsblöcke</div>`;

  // Preview table
  html += '<div class="admin-table-wrap" style="margin-top:12px;"><table class="admin-table bulk-preview-table"><thead><tr><th>Zeile</th><th>Übung</th><th>Typ</th><th>Inhalt</th></tr></thead><tbody>';

  for (const ex of exercises) {
    // Exercise header row
    if (ex.name) {
      html += `<tr class="bulk-exercise-row"><td>${ex._row}</td><td colspan="3"><strong>${esc(ex.name)}</strong>${ex.description ? ` — <em>${esc(ex.description)}</em>` : ''}</td></tr>`;
    }

    for (const elem of ex.elements) {
      const hasErr = errorRows.has(elem._row);
      const errClass = hasErr ? ' class="bulk-row-error"' : '';

      if (elem.kind === 'question') {
        const typeLabels = { text: 'Textfrage', choice: 'Single Choice', multichoice: 'Multi Choice', scale: 'Skala' };
        const preview = esc((elem.question || '').substring(0, 80));
        const optsInfo = (elem.type === 'choice' || elem.type === 'multichoice')
          ? ` <span class="bulk-opts">[${(elem.options || []).length} Optionen]</span>` : '';
        html += `<tr${errClass}><td>${elem._row}</td><td></td><td><span class="content-type-badge" style="background:var(--accent-warm);color:white;">${typeLabels[elem.type] || elem.type}</span></td><td>${preview}${optsInfo}</td></tr>`;
      } else {
        const typeLabels = { heading: 'Titel', text: 'Text', quote: 'Zitat', divider: 'Trennlinie' };
        const preview = elem.contentType === 'divider' ? '· · ·' : esc((elem.content || '').substring(0, 80));
        html += `<tr${errClass}><td>${elem._row}</td><td></td><td><span class="content-type-badge content-type-${elem.contentType}">${typeLabels[elem.contentType] || elem.contentType}</span></td><td>${preview}</td></tr>`;
      }
    }
  }

  html += '</tbody></table></div>';
  el.innerHTML = html;
}

// ══════════════════════════════════════
// IMPORT
// ══════════════════════════════════════

export async function executeBulkImport() {
  const chapterId = document.getElementById('bulkChapterSelect').value;
  if (!chapterId) { showToast('Bitte ein Kapitel auswählen.', 'error'); return; }
  if (!bulkParsed || !bulkParsed.length) { showToast('Keine Daten zum Importieren.', 'error'); return; }
  if (bulkErrors.length) { showToast('Bitte zuerst alle Fehler beheben.', 'error'); return; }

  const mode = document.getElementById('bulkModeSelect').value;

  if (mode === 'replace') {
    if (!confirm('Alle bestehenden Übungen dieses Kapitels werden gelöscht und durch die neuen ersetzt. Fortfahren?')) return;
  }

  btnLoading('bulkImportBtn', true);

  try {
    // Replace mode: delete existing exercises for this chapter
    if (mode === 'replace') {
      const existingExIds = state.cacheData.exercises
        .filter(ex => ex.chapter_id === chapterId)
        .map(ex => ex.id);
      if (existingExIds.length) {
        // Delete questions and content blocks first (in case no cascade)
        await sb.from('questions').delete().in('exercise_id', existingExIds);
        await sb.from('exercise_content').delete().in('exercise_id', existingExIds);
        const { error } = await sb.from('exercises').delete().in('id', existingExIds);
        if (error) throw error;
      }
    }

    // Calculate starting sort_order for append mode
    const existingCount = mode === 'replace' ? 0
      : state.cacheData.exercises.filter(ex => ex.chapter_id === chapterId).length;

    let importedExercises = 0;
    let importedQuestions = 0;
    let importedContent = 0;

    for (let i = 0; i < bulkParsed.length; i++) {
      const ex = bulkParsed[i];
      if (!ex.name) continue; // skip orphan groups

      // Insert exercise
      const { data: exData, error: exErr } = await sb.from('exercises').insert({
        chapter_id: chapterId,
        name: ex.name,
        description: ex.description || null,
        sort_order: existingCount + i,
      }).select().single();

      if (exErr) throw exErr;
      const exerciseId = exData.id;
      importedExercises++;

      // Insert elements
      for (let j = 0; j < ex.elements.length; j++) {
        const el = ex.elements[j];

        if (el.kind === 'question') {
          let options = el.options;
          // Scale options are already an object, choice/multichoice are arrays
          const { error: qErr } = await sb.from('questions').insert({
            exercise_id: exerciseId,
            label: el.label || null,
            question: el.question,
            hint: el.hint || null,
            placeholder: el.placeholder || null,
            type: el.type,
            options: options || null,
            wide: el.wide || false,
            sort_order: j,
          });
          if (qErr) throw qErr;
          importedQuestions++;
        } else {
          const { error: cErr } = await sb.from('exercise_content').insert({
            exercise_id: exerciseId,
            type: el.contentType,
            content: el.contentType === 'divider' ? '' : (el.content || ''),
            sort_order: j,
          });
          if (cErr) throw cErr;
          importedContent++;
        }
      }
    }

    await loadAllData();
    renderAdminExercises();
    clearBulkUpload();

    showToast(`Import erfolgreich: ${importedExercises} Übungen, ${importedQuestions} Fragen, ${importedContent} Inhaltsblöcke.`);
  } catch (e) {
    console.error('Bulk import error:', e);
    showToast('Import fehlgeschlagen: ' + trDataErr(e, 'import'), 'error');
    // Reload data to reflect partial import
    await loadAllData();
    renderAdminExercises();
  } finally {
    btnLoading('bulkImportBtn', false);
  }
}

export function clearBulkUpload() {
  bulkParsed = null;
  bulkErrors = [];
  const preview = document.getElementById('bulkPreview');
  if (preview) preview.innerHTML = '';
  const actions = document.getElementById('bulkActions');
  if (actions) actions.style.display = 'none';
  const fileInput = document.getElementById('bulkFileInput');
  if (fileInput) fileInput.value = '';
  const dz = document.getElementById('bulkDropzone');
  if (dz) {
    dz.innerHTML = `<div class="bulk-dropzone-text"><span style="font-size:24px;">📄</span><br>Excel-Datei hierher ziehen<br><span style="font-size:13px;color:var(--text-muted);">oder klicken zum Auswählen (.xlsx)</span></div>`;
  }
}
