import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, trDataErr } from './utils.js';
import { loadAllData } from './data.js';
import { openEditPanel, openCreatePanel, openNewCoursePanel } from './admin-tree-crud.js';

// ── Drill-Down State ──
let drillLevel = 'courses';    // 'courses' | 'chapters' | 'exercises' | 'elements'
let drillCourseId = null;
let drillChapterId = null;
let drillExerciseId = null;
let editingId = null;
let editingType = null;

export function getSelectedNode() { return { id: editingId, type: editingType }; }

// ══════════════════════════════════════
// MAIN RENDER (name kept for compat)
// ══════════════════════════════════════

export function renderCourseTree() {
  renderBreadcrumb();
  renderToolbarButton();
  renderCurrentLevelList();
  initDragDrop();
}

// ══════════════════════════════════════
// BREADCRUMB
// ══════════════════════════════════════

function renderBreadcrumb() {
  const el = document.getElementById('courseBreadcrumb');
  if (!el) return;

  const parts = [];
  parts.push({ label: 'Kurse', level: 'courses' });

  if (drillCourseId) {
    const course = (state.cacheData.courses || []).find(c => c.id === drillCourseId);
    parts.push({ label: course?.name || '…', level: 'chapters', courseId: drillCourseId });
  }
  if (drillChapterId) {
    const chapter = (state.cacheData.chapters || []).find(c => c.id === drillChapterId);
    parts.push({ label: chapter?.name || '…', level: 'exercises', courseId: drillCourseId, chapterId: drillChapterId });
  }
  if (drillExerciseId) {
    const exercise = (state.cacheData.exercises || []).find(e => e.id === drillExerciseId);
    parts.push({ label: exercise?.name || '…', level: 'elements', courseId: drillCourseId, chapterId: drillChapterId, exerciseId: drillExerciseId });
  }

  el.innerHTML = parts.map((p, i) => {
    if (i === parts.length - 1) {
      return `<span class="breadcrumb-current">${esc(p.label)}</span>`;
    }
    const args = [p.level, p.courseId || '', p.chapterId || '', p.exerciseId || ''].map(a => `"${a}"`).join(',');
    return `<button class="breadcrumb-link" data-action="drillTo" data-args='[${args}]'>${esc(p.label)}</button><span class="breadcrumb-sep">›</span>`;
  }).join('');
}

// ══════════════════════════════════════
// TOOLBAR BUTTON
// ══════════════════════════════════════

function renderToolbarButton() {
  const btn = document.getElementById('courseAddBtn');
  if (!btn) return;

  const labels = {
    courses: '+ Neuer Kurs',
    chapters: '+ Neues Kapitel',
    exercises: '+ Neue Übung',
    elements: '+ Element',
  };
  btn.querySelector('.btn-text').textContent = labels[drillLevel] || '+ Neu';
}

// ══════════════════════════════════════
// LIST RENDERING
// ══════════════════════════════════════

function renderCurrentLevelList() {
  const el = document.getElementById('courseItemList');
  if (!el) return;

  if (drillLevel === 'courses') renderCoursesList(el);
  else if (drillLevel === 'chapters') renderChaptersList(el);
  else if (drillLevel === 'exercises') renderExercisesList(el);
  else if (drillLevel === 'elements') renderElementsList(el);
}

function renderCoursesList(el) {
  const courses = state.cacheData.courses || [];
  if (!courses.length) {
    el.innerHTML = '<div class="empty-state">Noch keine Kurse. Erstelle deinen ersten Kurs.</div>';
    return;
  }

  const topLevel = courses.filter(c => !c.parent_course_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const extensions = courses.filter(c => c.parent_course_id);

  // Interleave: after each parent, show its extensions
  const ordered = [];
  for (const c of topLevel) {
    ordered.push(c);
    const exts = extensions.filter(e => e.parent_course_id === c.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    ordered.push(...exts);
  }
  // Orphan extensions (parent not in top-level)
  const usedExtIds = new Set(ordered.filter(c => c.parent_course_id).map(c => c.id));
  extensions.filter(e => !usedExtIds.has(e.id)).forEach(e => ordered.push(e));

  el.innerHTML = ordered.map(c => {
    const chapters = (state.cacheData.chapters || []).filter(ch => ch.course_id === c.id);
    const typeLabel = c.course_type === 'online' ? 'Online' : c.course_type === 'both' ? 'Beides' : 'Übung';
    const parentName = c.parent_course_id ? (courses.find(p => p.id === c.parent_course_id)?.name || '') : '';
    const isEditing = editingId === c.id && editingType === 'course';

    return `<div class="drag-item${isEditing ? ' editing' : ''}" draggable="true" data-drag-id="${c.id}" data-drag-table="courses">
      <span class="drag-handle" title="Ziehen">⠿</span>
      <div style="flex:1;min-width:0;">
        <strong>${esc(c.name)}</strong>
        ${parentName ? `<span style="color:var(--text-muted);font-size:13px;margin-left:8px;">↳ ${esc(parentName)}</span>` : ''}
      </div>
      <span class="badge badge-muted" style="margin-right:6px;">${typeLabel}</span>
      ${c.restricted ? '<span style="margin-right:6px;" title="Eingeschränkt">🔒</span>' : ''}
      <span style="color:var(--text-muted);font-size:13px;margin-right:8px;">${chapters.length} Kapitel</span>
      <div class="actions-cell">
        <button class="icon-btn" data-action="drillIntoCourse" data-args='["${c.id}"]' title="Kapitel anzeigen">▸</button>
        <button class="icon-btn" data-action="editTreeNode" data-args='["${c.id}","course"]' title="Bearbeiten">✎</button>
        <button class="icon-btn delete" data-action="deleteTreeNode" data-args='["${c.id}","course"]' title="Löschen">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderChaptersList(el) {
  const chapters = (state.cacheData.chapters || [])
    .filter(ch => ch.course_id === drillCourseId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (!chapters.length) {
    el.innerHTML = '<div class="empty-state">Keine Kapitel. Erstelle dein erstes Kapitel.</div>';
    return;
  }

  el.innerHTML = chapters.map(ch => {
    const exercises = (state.cacheData.exercises || []).filter(ex => ex.chapter_id === ch.id);
    const course = (state.cacheData.courses || []).find(c => c.id === ch.course_id);
    const isOnline = course && (course.course_type === 'online' || course.course_type === 'both');
    const typeIcon = ch.chapter_type === 'vorwort' ? '📄' : ch.chapter_type === 'abschluss' ? '📄' : isOnline ? '🎧' : '';
    const isEditing = editingId === ch.id && editingType === 'chapter';

    return `<div class="drag-item${isEditing ? ' editing' : ''}" draggable="true" data-drag-id="${ch.id}" data-drag-table="chapters">
      <span class="drag-handle" title="Ziehen">⠿</span>
      <div style="flex:1;min-width:0;">
        ${typeIcon ? `<span style="margin-right:4px;">${typeIcon}</span>` : ''}<strong>${esc(ch.name)}</strong>
      </div>
      ${ch.estimated_minutes ? `<span class="badge badge-muted" style="margin-right:6px;">${ch.estimated_minutes} Min.</span>` : ''}
      <span style="color:var(--text-muted);font-size:13px;margin-right:8px;">${exercises.length} Übungen</span>
      <div class="actions-cell">
        <button class="icon-btn" data-action="drillIntoChapter" data-args='["${ch.id}"]' title="Übungen anzeigen">▸</button>
        <button class="icon-btn" data-action="editTreeNode" data-args='["${ch.id}","chapter"]' title="Bearbeiten">✎</button>
        <button class="icon-btn delete" data-action="deleteTreeNode" data-args='["${ch.id}","chapter"]' title="Löschen">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderExercisesList(el) {
  const exercises = (state.cacheData.exercises || [])
    .filter(ex => ex.chapter_id === drillChapterId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (!exercises.length) {
    el.innerHTML = '<div class="empty-state">Keine Übungen. Erstelle deine erste Übung.</div>';
    return;
  }

  el.innerHTML = exercises.map(ex => {
    const questions = (state.cacheData.questions || []).filter(q => q.exercise_id === ex.id);
    const contentBlocks = (state.cacheData.contentBlocks || []).filter(b => b.exercise_id === ex.id);
    const elemCount = questions.length + contentBlocks.length;
    const isEditing = editingId === ex.id && editingType === 'exercise';

    return `<div class="drag-item${isEditing ? ' editing' : ''}" draggable="true" data-drag-id="${ex.id}" data-drag-table="exercises">
      <span class="drag-handle" title="Ziehen">⠿</span>
      <div style="flex:1;min-width:0;">
        <strong>${esc(ex.name)}</strong>
      </div>
      <span style="color:var(--text-muted);font-size:13px;margin-right:8px;">${questions.length} Fragen · ${contentBlocks.length} Inhalte</span>
      <div class="actions-cell">
        <button class="icon-btn" data-action="drillIntoExercise" data-args='["${ex.id}"]' title="Elemente anzeigen">▸</button>
        <button class="icon-btn" data-action="editTreeNode" data-args='["${ex.id}","exercise"]' title="Bearbeiten">✎</button>
        <button class="icon-btn delete" data-action="deleteTreeNode" data-args='["${ex.id}","exercise"]' title="Löschen">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderElementsList(el) {
  const questions = (state.cacheData.questions || []).filter(q => q.exercise_id === drillExerciseId);
  const contentBlocks = (state.cacheData.contentBlocks || []).filter(b => b.exercise_id === drillExerciseId);

  const items = [
    ...questions.map(q => ({ ...q, _kind: 'question' })),
    ...contentBlocks.map(b => ({ ...b, _kind: 'content' })),
  ].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  if (!items.length) {
    el.innerHTML = '<div class="empty-state">Keine Elemente. Füge Fragen oder Inhalte hinzu.</div>';
    return;
  }

  el.innerHTML = items.map(item => {
    const table = item._kind === 'question' ? 'questions' : 'exercise_content';
    const type = item._kind;
    const isEditing = editingId === item.id && editingType === type;

    if (item._kind === 'question') {
      const qTypeLabels = { text: 'Textfrage', choice: 'Single Choice', multichoice: 'Multi Choice', scale: 'Skala' };
      const preview = (item.question || '').substring(0, 60) + ((item.question || '').length > 60 ? '…' : '');
      return `<div class="drag-item${isEditing ? ' editing' : ''}" draggable="true" data-drag-id="${item.id}" data-drag-table="${table}">
        <span class="drag-handle" title="Ziehen">⠿</span>
        <span class="badge badge-muted" style="margin-right:6px;">${qTypeLabels[item.type] || 'Frage'}</span>
        <div style="flex:1;min-width:0;"><span>${esc(preview)}</span></div>
        <div class="actions-cell">
          <button class="icon-btn" data-action="editTreeNode" data-args='["${item.id}","question"]' title="Bearbeiten">✎</button>
          <button class="icon-btn delete" data-action="deleteTreeNode" data-args='["${item.id}","question"]' title="Löschen">✕</button>
        </div>
      </div>`;
    } else {
      const typeLabels = { heading: 'Titel', text: 'Text', text_italic: 'Text kursiv', text_bold: 'Text fett', quote: 'Zitat', divider: 'Trennlinie', image: 'Bild' };
      const preview = item.type === 'divider' ? '· · ·' : item.type === 'image' ? '📷 Bild' : (item.content || '').substring(0, 60) + ((item.content || '').length > 60 ? '…' : '');
      return `<div class="drag-item${isEditing ? ' editing' : ''}" draggable="true" data-drag-id="${item.id}" data-drag-table="${table}">
        <span class="drag-handle" title="Ziehen">⠿</span>
        <span class="badge badge-muted" style="margin-right:6px;">${typeLabels[item.type] || item.type}</span>
        <div style="flex:1;min-width:0;"><span>${esc(preview)}</span></div>
        <div class="actions-cell">
          <button class="icon-btn" data-action="editTreeNode" data-args='["${item.id}","content"]' title="Bearbeiten">✎</button>
          <button class="icon-btn delete" data-action="deleteTreeNode" data-args='["${item.id}","content"]' title="Löschen">✕</button>
        </div>
      </div>`;
    }
  }).join('');
}

// ══════════════════════════════════════
// DRILL NAVIGATION
// ══════════════════════════════════════

export function drillIntoCourse(courseId) {
  drillLevel = 'chapters';
  drillCourseId = courseId;
  drillChapterId = null;
  drillExerciseId = null;
  hideInlineForm();
  renderCourseTree();
}

export function drillIntoChapter(chapterId) {
  drillLevel = 'exercises';
  drillChapterId = chapterId;
  drillExerciseId = null;
  // Find course for this chapter
  if (!drillCourseId) {
    const ch = (state.cacheData.chapters || []).find(c => c.id === chapterId);
    if (ch) drillCourseId = ch.course_id;
  }
  hideInlineForm();
  renderCourseTree();
}

export function drillIntoExercise(exerciseId) {
  drillLevel = 'elements';
  drillExerciseId = exerciseId;
  // Find chapter for this exercise
  if (!drillChapterId) {
    const ex = (state.cacheData.exercises || []).find(e => e.id === exerciseId);
    if (ex) drillChapterId = ex.chapter_id;
  }
  hideInlineForm();
  renderCourseTree();
}

export function drillTo(level, courseId, chapterId, exerciseId) {
  drillLevel = level || 'courses';
  drillCourseId = courseId || null;
  drillChapterId = chapterId || null;
  drillExerciseId = exerciseId || null;
  hideInlineForm();
  renderCourseTree();
}

// ══════════════════════════════════════
// ADD ITEM (context-sensitive)
// ══════════════════════════════════════

export function courseAddItem() {
  if (drillLevel === 'courses') {
    openNewCoursePanel();
  } else if (drillLevel === 'chapters') {
    openCreatePanel(drillCourseId, 'course');
  } else if (drillLevel === 'exercises') {
    openCreatePanel(drillChapterId, 'chapter');
  } else if (drillLevel === 'elements') {
    openCreatePanel(drillExerciseId, 'exercise');
  }
}

// ══════════════════════════════════════
// SELECTION & EDIT
// ══════════════════════════════════════

export function editTreeNode(id, type) {
  editingId = id;
  editingType = type;
  openEditPanel(id, type);
  renderCurrentLevelList();
}

export function addChildNode(parentId, parentType) {
  openCreatePanel(parentId, parentType);
}

export function closeTreeEditPanel() {
  editingId = null;
  editingType = null;
  hideInlineForm();
  renderCurrentLevelList();
}

function hideInlineForm() {
  editingId = null;
  editingType = null;
  const form = document.getElementById('courseInlineForm');
  if (form) form.style.display = 'none';
}

// ══════════════════════════════════════
// DELETE
// ══════════════════════════════════════

export async function deleteTreeNode(id, type) {
  const labels = { course: 'Kurs', chapter: 'Kapitel', exercise: 'Übung', question: 'Frage', content: 'Inhaltsblock' };
  const cascadeWarnings = {
    course: ' mit allen Kapiteln, Übungen und Fragen',
    chapter: ' mit allen Übungen und Fragen',
    exercise: ' mit allen Fragen und Inhalten',
  };
  const warning = cascadeWarnings[type] || '';
  if (!confirm(`${labels[type]}${warning} löschen?`)) return;

  try {
    const table = type === 'question' ? 'questions' : type === 'content' ? 'exercise_content' : type + 's';
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw error;
    await loadAllData();
    if (editingId === id && editingType === type) {
      hideInlineForm();
    }
    renderCourseTree();
    showToast(`${labels[type]} gelöscht.`);
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

// ══════════════════════════════════════
// DRAG & DROP (flat list)
// ══════════════════════════════════════

let dragInfo = null;

function initDragDrop() {
  const items = document.querySelectorAll('#courseItemList .drag-item[draggable="true"]');
  items.forEach(item => {
    item.addEventListener('dragstart', onDragStart);
    item.addEventListener('dragover', onDragOver);
    item.addEventListener('dragleave', onDragLeave);
    item.addEventListener('drop', onDrop);
    item.addEventListener('dragend', onDragEnd);
  });
}

function onDragStart(e) {
  const item = e.currentTarget;
  dragInfo = {
    id: item.dataset.dragId,
    table: item.dataset.dragTable,
  };
  item.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragInfo.id);
}

function onDragOver(e) {
  e.preventDefault();
  const item = e.currentTarget;
  if (!dragInfo) return;
  if (item.dataset.dragTable !== dragInfo.table) return;
  e.dataTransfer.dropEffect = 'move';
  item.classList.add('drag-over');
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function onDrop(e) {
  e.preventDefault();
  const item = e.currentTarget;
  item.classList.remove('drag-over');
  if (!dragInfo) return;
  if (item.dataset.dragTable !== dragInfo.table) return;

  const targetId = item.dataset.dragId;
  if (targetId === dragInfo.id) return;

  const container = document.getElementById('courseItemList');
  const siblings = Array.from(container.querySelectorAll(`.drag-item[data-drag-table="${dragInfo.table}"]`));
  const ids = siblings.map(el => el.dataset.dragId).filter(Boolean);
  const fromIdx = ids.indexOf(dragInfo.id);
  const toIdx = ids.indexOf(targetId);
  if (fromIdx === -1 || toIdx === -1) return;

  ids.splice(fromIdx, 1);
  ids.splice(toIdx, 0, dragInfo.id);

  try {
    const table = dragInfo.table;
    await Promise.all(ids.map((id, i) =>
      sb.from(table).update({ sort_order: i }).eq('id', id)
    ));
    await loadAllData();
    renderCourseTree();
  } catch (e) { showToast('Sortierung fehlgeschlagen.', 'error'); }
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-item.drag-over').forEach(r => r.classList.remove('drag-over'));
  dragInfo = null;
}

// ══════════════════════════════════════
// SEARCH
// ══════════════════════════════════════

export function searchTree(query) {
  const items = document.querySelectorAll('#courseItemList .drag-item');
  if (!query) {
    items.forEach(el => el.style.display = '');
    return;
  }
  const q = query.toLowerCase();
  items.forEach(el => {
    const text = el.textContent.toLowerCase();
    el.style.display = text.includes(q) ? '' : 'none';
  });
}

// ══════════════════════════════════════
// COMPAT STUBS (no longer needed but registered)
// ══════════════════════════════════════

export function toggleTreeNode() {}
export function expandAllTree() {}
export function collapseAllTree() {}

// ══════════════════════════════════════
// REGISTER ON WINDOW (for event delegation)
// ══════════════════════════════════════
window.renderCourseTree = renderCourseTree;
window.toggleTreeNode = toggleTreeNode;
window.editTreeNode = editTreeNode;
window.addChildNode = addChildNode;
window.closeTreeEditPanel = closeTreeEditPanel;
window.deleteTreeNode = deleteTreeNode;
window.expandAllTree = expandAllTree;
window.collapseAllTree = collapseAllTree;
window.searchTree = searchTree;
window.drillIntoCourse = drillIntoCourse;
window.drillIntoChapter = drillIntoChapter;
window.drillIntoExercise = drillIntoExercise;
window.drillTo = drillTo;
window.courseAddItem = courseAddItem;
