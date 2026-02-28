import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, trDataErr } from './utils.js';
import { loadAllData } from './data.js';
import { openEditPanel, openCreatePanel } from './admin-tree-crud.js';

// ── Tree State ──
let expandedNodes = new Set();
let selectedNodeId = null;
let selectedNodeType = null;

export function getSelectedNode() { return { id: selectedNodeId, type: selectedNodeType }; }

// ══════════════════════════════════════
// RENDER TREE
// ══════════════════════════════════════

export function renderCourseTree() {
  const el = document.getElementById('courseTree');
  if (!el) return;

  const courses = state.cacheData.courses || [];
  if (!courses.length) {
    el.innerHTML = '<div class="empty-state">Noch keine Kurse. Erstelle deinen ersten Kurs.</div>';
    return;
  }

  // Only top-level courses (no parent)
  const topLevel = courses.filter(c => !c.parent_course_id);
  const extensions = courses.filter(c => c.parent_course_id);

  el.innerHTML = topLevel.map(c => renderCourseNode(c, extensions)).join('');
  initTreeDragDrop();
}

function renderCourseNode(course, extensions) {
  const chapters = (state.cacheData.chapters || []).filter(ch => ch.course_id === course.id);
  const exts = (extensions || []).filter(e => e.parent_course_id === course.id);
  const isOpen = expandedNodes.has('course-' + course.id);
  const isSelected = selectedNodeId === course.id && selectedNodeType === 'course';
  const childCount = chapters.length;
  const typeLabel = course.course_type === 'online' ? '📖' : course.course_type === 'both' ? '📖📝' : '📝';

  let childrenHtml = '';
  if (isOpen) {
    const chapterItems = chapters
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(ch => renderChapterNode(ch)).join('');
    const extItems = exts.map(e => renderCourseNode(e, [])).join('');
    childrenHtml = `<ul class="tree-children">${chapterItems}${extItems}</ul>`;
  }

  return `<li class="tree-node tree-node--course" data-id="${course.id}" data-type="course">
    <div class="tree-node-row${isSelected ? ' selected' : ''}" draggable="true" data-drag-id="${course.id}" data-drag-table="courses">
      <span class="drag-handle" title="Ziehen">⠿</span>
      <button class="tree-toggle${isOpen ? ' open' : ''}${!childCount && !exts.length ? ' empty' : ''}" data-action="toggleTreeNode" data-args='["course-${course.id}"]'>▸</button>
      <span class="tree-node-icon">${typeLabel}</span>
      <span class="tree-node-name" data-action="editTreeNode" data-args='["${course.id}","course"]'>${esc(course.name)}</span>
      ${course.restricted ? '<span class="tree-badge tree-badge--lock" title="Eingeschränkt">🔒</span>' : ''}
      <span class="tree-node-meta">${childCount} Kapitel</span>
      <span class="tree-node-actions">
        <button class="icon-btn tree-action-btn" data-action="addChildNode" data-args='["${course.id}","course"]' title="Kapitel hinzufügen">+</button>
        <button class="icon-btn tree-action-btn" data-action="editTreeNode" data-args='["${course.id}","course"]' title="Bearbeiten">✎</button>
        <button class="icon-btn tree-action-btn delete" data-action="deleteTreeNode" data-args='["${course.id}","course"]' title="Löschen">✕</button>
      </span>
    </div>
    ${childrenHtml}
  </li>`;
}

function renderChapterNode(chapter) {
  const exercises = (state.cacheData.exercises || []).filter(ex => ex.chapter_id === chapter.id);
  const isOpen = expandedNodes.has('chapter-' + chapter.id);
  const isSelected = selectedNodeId === chapter.id && selectedNodeType === 'chapter';
  const childCount = exercises.length;
  const course = (state.cacheData.courses || []).find(c => c.id === chapter.course_id);
  const isOnline = course && (course.course_type === 'online' || course.course_type === 'both');
  const typeIcon = chapter.chapter_type === 'vorwort' ? '📄' : chapter.chapter_type === 'abschluss' ? '📄' : isOnline ? '🎧' : '';

  let childrenHtml = '';
  if (isOpen) {
    const items = exercises
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(ex => renderExerciseNode(ex)).join('');
    childrenHtml = `<ul class="tree-children">${items}</ul>`;
  }

  return `<li class="tree-node tree-node--chapter" data-id="${chapter.id}" data-type="chapter">
    <div class="tree-node-row${isSelected ? ' selected' : ''}" draggable="true" data-drag-id="${chapter.id}" data-drag-table="chapters">
      <span class="drag-handle" title="Ziehen">⠿</span>
      <button class="tree-toggle${isOpen ? ' open' : ''}${!childCount ? ' empty' : ''}" data-action="toggleTreeNode" data-args='["chapter-${chapter.id}"]'>▸</button>
      ${typeIcon ? `<span class="tree-node-icon">${typeIcon}</span>` : ''}
      <span class="tree-node-name" data-action="editTreeNode" data-args='["${chapter.id}","chapter"]'>${esc(chapter.name)}</span>
      ${chapter.estimated_minutes ? `<span class="tree-badge">${chapter.estimated_minutes} Min.</span>` : ''}
      <span class="tree-node-meta">${childCount} Übungen</span>
      <span class="tree-node-actions">
        <button class="icon-btn tree-action-btn" data-action="addChildNode" data-args='["${chapter.id}","chapter"]' title="Übung hinzufügen">+</button>
        <button class="icon-btn tree-action-btn" data-action="editTreeNode" data-args='["${chapter.id}","chapter"]' title="Bearbeiten">✎</button>
        <button class="icon-btn tree-action-btn delete" data-action="deleteTreeNode" data-args='["${chapter.id}","chapter"]' title="Löschen">✕</button>
      </span>
    </div>
    ${childrenHtml}
  </li>`;
}

function renderExerciseNode(exercise) {
  const questions = (state.cacheData.questions || []).filter(q => q.exercise_id === exercise.id);
  const contentBlocks = (state.cacheData.contentBlocks || []).filter(b => b.exercise_id === exercise.id);
  const isOpen = expandedNodes.has('exercise-' + exercise.id);
  const isSelected = selectedNodeId === exercise.id && selectedNodeType === 'exercise';
  const childCount = questions.length + contentBlocks.length;

  let childrenHtml = '';
  if (isOpen) {
    // Merge questions and content blocks, sorted by sort_order
    const items = [
      ...questions.map(q => ({ ...q, _kind: 'question' })),
      ...contentBlocks.map(b => ({ ...b, _kind: 'content' })),
    ].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

    const itemsHtml = items.map(item => renderElementNode(item)).join('');
    childrenHtml = `<ul class="tree-children">${itemsHtml}</ul>`;
  }

  return `<li class="tree-node tree-node--exercise" data-id="${exercise.id}" data-type="exercise">
    <div class="tree-node-row${isSelected ? ' selected' : ''}" draggable="true" data-drag-id="${exercise.id}" data-drag-table="exercises">
      <span class="drag-handle" title="Ziehen">⠿</span>
      <button class="tree-toggle${isOpen ? ' open' : ''}${!childCount ? ' empty' : ''}" data-action="toggleTreeNode" data-args='["exercise-${exercise.id}"]'>▸</button>
      <span class="tree-node-name" data-action="editTreeNode" data-args='["${exercise.id}","exercise"]'>${esc(exercise.name)}</span>
      <span class="tree-node-meta">${questions.length} Fragen</span>
      <span class="tree-node-actions">
        <button class="icon-btn tree-action-btn" data-action="addChildNode" data-args='["${exercise.id}","exercise"]' title="Element hinzufügen">+</button>
        <button class="icon-btn tree-action-btn" data-action="editTreeNode" data-args='["${exercise.id}","exercise"]' title="Bearbeiten">✎</button>
        <button class="icon-btn tree-action-btn delete" data-action="deleteTreeNode" data-args='["${exercise.id}","exercise"]' title="Löschen">✕</button>
      </span>
    </div>
    ${childrenHtml}
  </li>`;
}

function renderElementNode(item) {
  const isSelected = selectedNodeId === item.id && (
    (item._kind === 'question' && selectedNodeType === 'question') ||
    (item._kind === 'content' && selectedNodeType === 'content')
  );

  if (item._kind === 'question') {
    const qTypeLabels = { text: 'Textfrage', choice: 'Single Choice', multichoice: 'Multi Choice', scale: 'Skala' };
    const preview = (item.question || '').substring(0, 50) + ((item.question || '').length > 50 ? '…' : '');
    return `<li class="tree-node tree-node--element" data-id="${item.id}" data-type="question">
      <div class="tree-node-row${isSelected ? ' selected' : ''}" draggable="true" data-drag-id="${item.id}" data-drag-table="questions">
        <span class="drag-handle" title="Ziehen">⠿</span>
        <span class="tree-element-badge tree-element-badge--question">${qTypeLabels[item.type] || 'Frage'}</span>
        <span class="tree-node-name" data-action="editTreeNode" data-args='["${item.id}","question"]'>${esc(preview)}</span>
        <span class="tree-node-actions">
          <button class="icon-btn tree-action-btn" data-action="editTreeNode" data-args='["${item.id}","question"]' title="Bearbeiten">✎</button>
          <button class="icon-btn tree-action-btn delete" data-action="deleteTreeNode" data-args='["${item.id}","question"]' title="Löschen">✕</button>
        </span>
      </div>
    </li>`;
  } else {
    const typeLabels = { heading: 'Titel', text: 'Text', text_italic: 'Text kursiv', text_bold: 'Text fett', quote: 'Zitat', divider: 'Trennlinie', image: 'Bild' };
    const preview = item.type === 'divider' ? '· · ·' : item.type === 'image' ? '📷 Bild' : (item.content || '').substring(0, 50) + ((item.content || '').length > 50 ? '…' : '');
    return `<li class="tree-node tree-node--element" data-id="${item.id}" data-type="content">
      <div class="tree-node-row${isSelected ? ' selected' : ''}" draggable="true" data-drag-id="${item.id}" data-drag-table="exercise_content">
        <span class="drag-handle" title="Ziehen">⠿</span>
        <span class="tree-element-badge tree-element-badge--content">${typeLabels[item.type] || item.type}</span>
        <span class="tree-node-name" data-action="editTreeNode" data-args='["${item.id}","content"]'>${esc(preview)}</span>
        <span class="tree-node-actions">
          <button class="icon-btn tree-action-btn" data-action="editTreeNode" data-args='["${item.id}","content"]' title="Bearbeiten">✎</button>
          <button class="icon-btn tree-action-btn delete" data-action="deleteTreeNode" data-args='["${item.id}","content"]' title="Löschen">✕</button>
        </span>
      </div>
    </li>`;
  }
}

// ══════════════════════════════════════
// TOGGLE / EXPAND / COLLAPSE
// ══════════════════════════════════════

export function toggleTreeNode(nodeKey) {
  if (expandedNodes.has(nodeKey)) {
    expandedNodes.delete(nodeKey);
  } else {
    expandedNodes.add(nodeKey);
  }
  renderCourseTree();
}

export function expandAllTree() {
  const courses = state.cacheData.courses || [];
  const chapters = state.cacheData.chapters || [];
  const exercises = state.cacheData.exercises || [];
  courses.forEach(c => expandedNodes.add('course-' + c.id));
  chapters.forEach(ch => expandedNodes.add('chapter-' + ch.id));
  exercises.forEach(ex => expandedNodes.add('exercise-' + ex.id));
  renderCourseTree();
}

export function collapseAllTree() {
  expandedNodes.clear();
  renderCourseTree();
}

// ══════════════════════════════════════
// SELECTION & EDIT PANEL
// ══════════════════════════════════════

export function editTreeNode(id, type) {
  selectedNodeId = id;
  selectedNodeType = type;
  renderCourseTree();
  openEditPanel(id, type);
}

export function addChildNode(parentId, parentType) {
  // Expand parent first
  expandedNodes.add(parentType + '-' + parentId);
  renderCourseTree();
  openCreatePanel(parentId, parentType);
}

export function closeTreeEditPanel() {
  selectedNodeId = null;
  selectedNodeType = null;
  const panel = document.getElementById('treeEditPanel');
  if (panel) panel.style.display = 'none';
  const layout = document.querySelector('.tree-layout');
  if (layout) layout.classList.remove('has-edit-panel');
  renderCourseTree();
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
    // Close panel if deleted node was selected
    if (selectedNodeId === id && selectedNodeType === type) {
      closeTreeEditPanel();
    }
    renderCourseTree();
    showToast(`${labels[type]} gelöscht.`);
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

// ══════════════════════════════════════
// DRAG & DROP (within same level)
// ══════════════════════════════════════

function initTreeDragDrop() {
  const rows = document.querySelectorAll('#courseTree .tree-node-row[draggable="true"]');
  rows.forEach(row => {
    row.addEventListener('dragstart', onTreeDragStart);
    row.addEventListener('dragover', onTreeDragOver);
    row.addEventListener('dragleave', onTreeDragLeave);
    row.addEventListener('drop', onTreeDrop);
    row.addEventListener('dragend', onTreeDragEnd);
  });
}

let dragInfo = null;

function onTreeDragStart(e) {
  const row = e.currentTarget;
  const node = row.closest('.tree-node');
  dragInfo = {
    id: row.dataset.dragId,
    table: row.dataset.dragTable,
    parentList: node.parentElement, // the <ul> containing this node
  };
  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragInfo.id);
}

function onTreeDragOver(e) {
  e.preventDefault();
  const row = e.currentTarget;
  const node = row.closest('.tree-node');
  if (!dragInfo) return;
  // Only allow drop within same parent list and same table type
  if (node.parentElement !== dragInfo.parentList) return;
  if (row.dataset.dragTable !== dragInfo.table) return;
  e.dataTransfer.dropEffect = 'move';
  row.classList.add('drag-over');
}

function onTreeDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function onTreeDrop(e) {
  e.preventDefault();
  const row = e.currentTarget;
  row.classList.remove('drag-over');
  if (!dragInfo) return;

  const node = row.closest('.tree-node');
  if (node.parentElement !== dragInfo.parentList) return;
  if (row.dataset.dragTable !== dragInfo.table) return;

  const targetId = row.dataset.dragId;
  if (targetId === dragInfo.id) return;

  // Get all nodes in same parent list
  const siblings = Array.from(dragInfo.parentList.children);
  const ids = siblings.map(li => li.querySelector('.tree-node-row[draggable="true"]')?.dataset.dragId).filter(Boolean);
  const fromIdx = ids.indexOf(dragInfo.id);
  const toIdx = ids.indexOf(targetId);
  if (fromIdx === -1 || toIdx === -1) return;

  // Reorder
  ids.splice(fromIdx, 1);
  ids.splice(toIdx, 0, dragInfo.id);

  // Save to DB
  try {
    const table = dragInfo.table;
    await Promise.all(ids.map((id, i) =>
      sb.from(table).update({ sort_order: i }).eq('id', id)
    ));
    await loadAllData();
    renderCourseTree();
  } catch (e) { showToast('Sortierung fehlgeschlagen.', 'error'); }
}

function onTreeDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.tree-node-row.drag-over').forEach(r => r.classList.remove('drag-over'));
  dragInfo = null;
}

// ══════════════════════════════════════
// SEARCH & FILTER (bonus)
// ══════════════════════════════════════

export function searchTree(query) {
  if (!query) {
    renderCourseTree();
    return;
  }
  const q = query.toLowerCase();
  const courses = state.cacheData.courses || [];
  const chapters = state.cacheData.chapters || [];
  const exercises = state.cacheData.exercises || [];
  const questions = state.cacheData.questions || [];

  // Find matching items and expand their parents
  expandedNodes.clear();
  questions.filter(item => (item.question || '').toLowerCase().includes(q)).forEach(item => {
    const ex = exercises.find(e => e.id === item.exercise_id);
    if (ex) {
      expandedNodes.add('exercise-' + ex.id);
      const ch = chapters.find(c => c.id === ex.chapter_id);
      if (ch) {
        expandedNodes.add('chapter-' + ch.id);
        expandedNodes.add('course-' + ch.course_id);
      }
    }
  });
  exercises.filter(item => (item.name || '').toLowerCase().includes(q)).forEach(item => {
    expandedNodes.add('exercise-' + item.id);
    const ch = chapters.find(c => c.id === item.chapter_id);
    if (ch) {
      expandedNodes.add('chapter-' + ch.id);
      expandedNodes.add('course-' + ch.course_id);
    }
  });
  chapters.filter(item => (item.name || '').toLowerCase().includes(q)).forEach(item => {
    expandedNodes.add('chapter-' + item.id);
    expandedNodes.add('course-' + item.course_id);
  });
  courses.filter(item => (item.name || '').toLowerCase().includes(q)).forEach(item => {
    expandedNodes.add('course-' + item.id);
  });

  renderCourseTree();
}

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
