import { sb } from './config.js';
import { state } from './state.js';
import { esc, btnLoading, showToast, trDataErr } from './utils.js';
import { loadAllData } from './data.js';
import { uploadImage, deleteImage } from './upload.js';
import { renderCourseTree, closeTreeEditPanel } from './admin-tree.js';
import { initImageUploadZones, handleImageFileSelect, updateImagePreview } from './admin.js';

// ══════════════════════════════════════
// PANEL MANAGEMENT
// ══════════════════════════════════════

export function openEditPanel(id, type) {
  const panel = document.getElementById('treeEditPanel');
  const body = document.getElementById('treeEditBody');
  const title = document.getElementById('treeEditTitle');
  const layout = document.querySelector('.tree-layout');
  if (!panel || !body) return;

  panel.style.display = '';
  layout?.classList.add('has-edit-panel');

  const labels = { course: 'Kurs', chapter: 'Kapitel', exercise: 'Übung', question: 'Frage', content: 'Inhaltsblock' };
  title.textContent = `${labels[type] || type} bearbeiten`;

  if (type === 'course') renderCourseEditForm(body, id);
  else if (type === 'chapter') renderChapterEditForm(body, id);
  else if (type === 'exercise') renderExerciseEditForm(body, id);
  else if (type === 'question') renderQuestionEditForm(body, id);
  else if (type === 'content') renderContentEditForm(body, id);

  // Re-init image upload zones after rendering
  setTimeout(() => initImageUploadZones(), 50);
}

export function openCreatePanel(parentId, parentType) {
  const panel = document.getElementById('treeEditPanel');
  const body = document.getElementById('treeEditBody');
  const title = document.getElementById('treeEditTitle');
  const layout = document.querySelector('.tree-layout');
  if (!panel || !body) return;

  panel.style.display = '';
  layout?.classList.add('has-edit-panel');

  if (parentType === 'course') {
    // Add chapter to this course
    title.textContent = 'Neues Kapitel erstellen';
    renderChapterCreateForm(body, parentId);
  } else if (parentType === 'chapter') {
    // Add exercise to this chapter
    title.textContent = 'Neue Übung erstellen';
    renderExerciseCreateForm(body, parentId);
  } else if (parentType === 'exercise') {
    // Add element (question or content) to this exercise
    title.textContent = 'Element hinzufügen';
    renderElementCreateForm(body, parentId);
  }

  setTimeout(() => initImageUploadZones(), 50);
}

// ══════════════════════════════════════
// COURSE FORM
// ══════════════════════════════════════

function renderCourseEditForm(container, courseId) {
  const c = state.cacheData.courses.find(x => x.id === courseId);
  if (!c) { container.innerHTML = '<p>Kurs nicht gefunden.</p>'; return; }

  const parentCourses = state.cacheData.courses.filter(x => !x.parent_course_id && x.id !== courseId);
  const parentOpts = `<option value="">— Kein Elternkurs —</option>` +
    parentCourses.map(p => `<option value="${p.id}"${p.id === c.parent_course_id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');

  const showSales = c.course_type === 'online' || c.course_type === 'both';

  container.innerHTML = `
    <input type="hidden" id="treeEditId" value="${courseId}">
    <div class="form-group"><label class="form-label">Kursname</label><input class="form-input" id="treeCourseNameInput" value="${esc(c.name)}"></div>
    <div class="form-group"><label class="form-label">Beschreibung</label><textarea class="form-textarea" id="treeCourseDescInput">${esc(c.description || '')}</textarea></div>
    <div class="form-group">
      <label class="form-label">Kursbild</label>
      <input type="hidden" id="treeCourseImageUrl" value="${esc(c.image_url || '')}">
      <div class="image-upload-zone${c.image_url ? ' has-image' : ''}" id="treeCourseImagePreview" data-action="triggerClickOn" data-args='["treeCourseImageInput"]'>
        ${c.image_url ? `<img src="${esc(c.image_url)}" alt="Kursbild">` : '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>'}
      </div>
      <input type="file" id="treeCourseImageInput" accept="image/*" style="display:none;" data-change="handleImageFileSelect" data-args='["treeCourseImageInput","treeCourseImagePreview"]'>
    </div>
    <div class="form-group"><label class="form-check"><input type="checkbox" id="treeCourseRestricted"${c.restricted ? ' checked' : ''}><span>Zugang einschränken</span></label></div>
    <div class="form-group"><label class="form-label">Erweiterung zu</label><select class="form-select" id="treeCourseParentSelect">${parentOpts}</select></div>
    <div class="form-group">
      <label class="form-label">Kurstyp</label>
      <select class="form-select" id="treeCourseTypeSelect" onchange="document.getElementById('treeCourseSalesFields').style.display=(this.value==='online'||this.value==='both')?'':'none'">
        <option value="exercise"${c.course_type === 'exercise' ? ' selected' : ''}>Übungskurs</option>
        <option value="online"${c.course_type === 'online' ? ' selected' : ''}>Online-Kurs</option>
        <option value="both"${c.course_type === 'both' ? ' selected' : ''}>Beides</option>
      </select>
    </div>
    <div id="treeCourseSalesFields" style="display:${showSales ? '' : 'none'};">
      <h4 style="margin:20px 0 12px;font-family:var(--font-heading);font-size:var(--font-size-h5);">Verkaufsseite</h4>
      <div class="form-group"><label class="form-check"><input type="checkbox" id="treeCourseSalesPublished"${c.sales_published ? ' checked' : ''}><span>Veröffentlicht</span></label></div>
      <div class="form-group"><label class="form-label">URL-Slug</label><input class="form-input" id="treeCourseSalesSlug" value="${esc(c.sales_slug || '')}"></div>
      <div class="form-group"><label class="form-label">Überschrift</label><input class="form-input" id="treeCourseSalesHeadline" value="${esc(c.sales_headline || '')}"></div>
      <div class="form-group"><label class="form-label">Beschreibung</label><textarea class="form-textarea" id="treeCourseSalesDesc">${esc(c.sales_description || '')}</textarea></div>
      <div class="form-group"><label class="form-label">Features (je Zeile)</label><textarea class="form-textarea" id="treeCourseSalesFeatures">${esc((c.sales_features || []).join('\n'))}</textarea></div>
      <div class="form-group"><label class="form-label">CTA-Button Text</label><input class="form-input" id="treeCourseSalesCta" value="${esc(c.sales_cta_text || 'Jetzt starten')}"></div>
      <h4 style="margin:20px 0 12px;font-family:var(--font-heading);font-size:var(--font-size-h5);">Preise</h4>
      <div class="form-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Einmalpreis (CHF)</label><input class="form-input" id="treeCoursePriceOnetime" type="number" step="0.01" value="${c.price_onetime_amount ? (c.price_onetime_amount / 100).toFixed(2) : ''}"></div>
        <div class="form-group" style="flex:1;"><label class="form-label">Stripe Price ID</label><input class="form-input" id="treeCourseStripePriceOnetime" value="${esc(c.stripe_price_id_onetime || '')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Abo / Monat (CHF)</label><input class="form-input" id="treeCoursePriceSubscription" type="number" step="0.01" value="${c.price_subscription_amount ? (c.price_subscription_amount / 100).toFixed(2) : ''}"></div>
        <div class="form-group" style="flex:1;"><label class="form-label">Stripe Price ID</label><input class="form-input" id="treeCourseStripePriceSubscription" value="${esc(c.stripe_price_id_subscription || '')}"></div>
      </div>
    </div>
    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveCourseBtn" data-action="treeSaveCourse"><span class="btn-text">Speichern</span></button>
      <button class="btn btn-ghost btn-sm" data-action="closeTreeEditPanel">Abbrechen</button>
    </div>`;
}

export async function treeSaveCourse() {
  const editId = document.getElementById('treeEditId')?.value;
  const name = document.getElementById('treeCourseNameInput')?.value.trim();
  if (!name) { showToast('Bitte Kursnamen eingeben.', 'error'); return; }

  btnLoading('treeSaveCourseBtn', true);
  try {
    let image_url = document.getElementById('treeCourseImageUrl')?.value || null;
    const fileInput = document.getElementById('treeCourseImageInput');
    if (fileInput?.files.length) {
      if (editId) {
        const old = state.cacheData.courses.find(c => c.id === editId);
        if (old?.image_url) await deleteImage(old.image_url);
      }
      image_url = await uploadImage(fileInput.files[0], 'courses');
    }

    const course_type = document.getElementById('treeCourseTypeSelect')?.value || 'exercise';
    const salesFeaturesRaw = document.getElementById('treeCourseSalesFeatures')?.value.trim() || '';

    const courseData = {
      name,
      description: document.getElementById('treeCourseDescInput')?.value.trim() || '',
      restricted: document.getElementById('treeCourseRestricted')?.checked || false,
      parent_course_id: document.getElementById('treeCourseParentSelect')?.value || null,
      image_url,
      course_type,
      is_purchasable: course_type !== 'exercise',
      sales_published: document.getElementById('treeCourseSalesPublished')?.checked || false,
      sales_slug: document.getElementById('treeCourseSalesSlug')?.value.trim() || null,
      sales_headline: document.getElementById('treeCourseSalesHeadline')?.value.trim() || null,
      sales_description: document.getElementById('treeCourseSalesDesc')?.value.trim() || null,
      sales_features: salesFeaturesRaw ? salesFeaturesRaw.split('\n').filter(l => l.trim()).map(l => l.trim()) : null,
      sales_cta_text: document.getElementById('treeCourseSalesCta')?.value.trim() || 'Jetzt starten',
      price_onetime_amount: Math.round(parseFloat(document.getElementById('treeCoursePriceOnetime')?.value) * 100) || null,
      stripe_price_id_onetime: document.getElementById('treeCourseStripePriceOnetime')?.value.trim() || null,
      price_subscription_amount: Math.round(parseFloat(document.getElementById('treeCoursePriceSubscription')?.value) * 100) || null,
      stripe_price_id_subscription: document.getElementById('treeCourseStripePriceSubscription')?.value.trim() || null,
      price_currency: 'chf',
    };

    if (editId) {
      const { error } = await sb.from('courses').update(courseData).eq('id', editId);
      if (error) throw error;
    } else {
      courseData.sort_order = state.cacheData.courses.length;
      const { error } = await sb.from('courses').insert(courseData);
      if (error) throw error;
    }

    await loadAllData();
    renderCourseTree();
    showToast(editId ? 'Kurs aktualisiert.' : 'Kurs erstellt.');
  } catch (e) { console.error(e); showToast(trDataErr(e, 'course'), 'error'); }
  finally { btnLoading('treeSaveCourseBtn', false); }
}

// ══════════════════════════════════════
// NEW COURSE FORM (top-level)
// ══════════════════════════════════════

export function openNewCoursePanel() {
  const panel = document.getElementById('treeEditPanel');
  const body = document.getElementById('treeEditBody');
  const title = document.getElementById('treeEditTitle');
  const layout = document.querySelector('.tree-layout');
  if (!panel || !body) return;

  panel.style.display = '';
  layout?.classList.add('has-edit-panel');
  title.textContent = 'Neuen Kurs erstellen';

  const parentCourses = state.cacheData.courses.filter(x => !x.parent_course_id);
  const parentOpts = `<option value="">— Kein Elternkurs —</option>` +
    parentCourses.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');

  body.innerHTML = `
    <input type="hidden" id="treeEditId" value="">
    <div class="form-group"><label class="form-label">Kursname</label><input class="form-input" id="treeCourseNameInput" placeholder="z.B. Selbstreflexion"></div>
    <div class="form-group"><label class="form-label">Beschreibung</label><textarea class="form-textarea" id="treeCourseDescInput" placeholder="Kurze Beschreibung …"></textarea></div>
    <div class="form-group">
      <label class="form-label">Kursbild</label>
      <input type="hidden" id="treeCourseImageUrl" value="">
      <div class="image-upload-zone" id="treeCourseImagePreview" data-action="triggerClickOn" data-args='["treeCourseImageInput"]'>
        <span class="image-upload-label">Bild hierher ziehen oder klicken</span>
      </div>
      <input type="file" id="treeCourseImageInput" accept="image/*" style="display:none;" data-change="handleImageFileSelect" data-args='["treeCourseImageInput","treeCourseImagePreview"]'>
    </div>
    <div class="form-group"><label class="form-check"><input type="checkbox" id="treeCourseRestricted"><span>Zugang einschränken</span></label></div>
    <div class="form-group"><label class="form-label">Erweiterung zu</label><select class="form-select" id="treeCourseParentSelect">${parentOpts}</select></div>
    <div class="form-group">
      <label class="form-label">Kurstyp</label>
      <select class="form-select" id="treeCourseTypeSelect" onchange="document.getElementById('treeCourseSalesFields').style.display=(this.value==='online'||this.value==='both')?'':'none'">
        <option value="exercise">Übungskurs</option>
        <option value="online">Online-Kurs</option>
        <option value="both">Beides</option>
      </select>
    </div>
    <div id="treeCourseSalesFields" style="display:none;">
      <h4 style="margin:20px 0 12px;font-family:var(--font-heading);font-size:var(--font-size-h5);">Verkaufsseite</h4>
      <div class="form-group"><label class="form-check"><input type="checkbox" id="treeCourseSalesPublished"><span>Veröffentlicht</span></label></div>
      <div class="form-group"><label class="form-label">URL-Slug</label><input class="form-input" id="treeCourseSalesSlug" placeholder="z.B. mein-kurs"></div>
      <div class="form-group"><label class="form-label">Überschrift</label><input class="form-input" id="treeCourseSalesHeadline"></div>
      <div class="form-group"><label class="form-label">Beschreibung</label><textarea class="form-textarea" id="treeCourseSalesDesc"></textarea></div>
      <div class="form-group"><label class="form-label">Features (je Zeile)</label><textarea class="form-textarea" id="treeCourseSalesFeatures"></textarea></div>
      <div class="form-group"><label class="form-label">CTA-Button Text</label><input class="form-input" id="treeCourseSalesCta" value="Jetzt starten"></div>
      <h4 style="margin:20px 0 12px;font-family:var(--font-heading);font-size:var(--font-size-h5);">Preise</h4>
      <div class="form-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Einmalpreis (CHF)</label><input class="form-input" id="treeCoursePriceOnetime" type="number" step="0.01"></div>
        <div class="form-group" style="flex:1;"><label class="form-label">Stripe Price ID</label><input class="form-input" id="treeCourseStripePriceOnetime"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Abo / Monat (CHF)</label><input class="form-input" id="treeCoursePriceSubscription" type="number" step="0.01"></div>
        <div class="form-group" style="flex:1;"><label class="form-label">Stripe Price ID</label><input class="form-input" id="treeCourseStripePriceSubscription"></div>
      </div>
    </div>
    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveCourseBtn" data-action="treeSaveCourse"><span class="btn-text">Erstellen</span></button>
      <button class="btn btn-ghost btn-sm" data-action="closeTreeEditPanel">Abbrechen</button>
    </div>`;

  setTimeout(() => initImageUploadZones(), 50);
}

// ══════════════════════════════════════
// CHAPTER FORM
// ══════════════════════════════════════

function renderChapterEditForm(container, chapterId) {
  const ch = state.cacheData.chapters.find(x => x.id === chapterId);
  if (!ch) { container.innerHTML = '<p>Kapitel nicht gefunden.</p>'; return; }

  const course = state.cacheData.courses.find(c => c.id === ch.course_id);
  const isOnline = course && (course.course_type === 'online' || course.course_type === 'both');

  // Chapter content blocks
  const contentBlocks = (state.cacheData.chapterContentBlocks || [])
    .filter(b => b.chapter_id === chapterId)
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  const contentListHtml = contentBlocks.length ? contentBlocks.map(block => {
    const typeLabels = { heading: 'Titel', subheading: 'Untertitel', text: 'Text', text_italic: 'Text kursiv', text_bold: 'Text fett', quote: 'Zitat', divider: 'Trennlinie', image: 'Bild' };
    let preview = '';
    if (block.type === 'divider') preview = '· · ·';
    else if (block.type === 'image') preview = '📷 Bild';
    else preview = esc((block.content || '').substring(0, 40) + ((block.content || '').length > 40 ? '…' : ''));
    return `<div class="tree-content-item">
      <span class="content-type-badge content-type-${block.type}">${typeLabels[block.type] || block.type}</span>
      <span class="tree-content-preview">${preview}</span>
      <span class="tree-content-actions">
        <button class="icon-btn" data-action="editTreeNode" data-args='["${block.id}","chapterContent"]' title="Bearbeiten">✎</button>
        <button class="icon-btn delete" data-action="deleteTreeChapterContent" data-args='["${block.id}","${chapterId}"]' title="Löschen">✕</button>
      </span>
    </div>`;
  }).join('') : '<p style="font-size:13px;color:var(--text-muted);font-style:italic;">Keine Inhaltsblöcke.</p>';

  container.innerHTML = `
    <input type="hidden" id="treeEditId" value="${chapterId}">
    <div class="form-group"><label class="form-label">Kurs</label><p style="font-weight:bold;font-size:14px;">${esc(course?.name || '—')}</p></div>
    <div class="form-group"><label class="form-label">Kapitelname</label><input class="form-input" id="treeChapterNameInput" value="${esc(ch.name)}"></div>
    <div class="form-row">
      <div class="form-group" style="flex:3;"><label class="form-label">Beschreibung</label><textarea class="form-textarea" id="treeChapterDescInput">${esc(ch.description || '')}</textarea></div>
      <div class="form-group" style="flex:1;"><label class="form-label">Zeit (Min.)</label><input class="form-input" id="treeChapterTimeInput" type="number" min="1" value="${ch.estimated_minutes || ''}"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Kapitelbild</label>
      <input type="hidden" id="treeChapterImageUrl" value="${esc(ch.image_url || '')}">
      <div class="image-upload-zone${ch.image_url ? ' has-image' : ''}" id="treeChapterImagePreview" data-action="triggerClickOn" data-args='["treeChapterImageInput"]'>
        ${ch.image_url ? `<img src="${esc(ch.image_url)}" alt="Kapitelbild">` : '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>'}
      </div>
      <input type="file" id="treeChapterImageInput" accept="image/*" style="display:none;" data-change="handleImageFileSelect" data-args='["treeChapterImageInput","treeChapterImagePreview"]'>
    </div>
    ${isOnline ? `
    <h4 style="margin:20px 0 12px;font-family:var(--font-heading);font-size:var(--font-size-h5);">Online-Kurs Inhalt</h4>
    <div class="form-group">
      <label class="form-label">Kapiteltyp</label>
      <select class="form-select" id="treeChapterTypeSelect">
        <option value="standard"${ch.chapter_type === 'standard' ? ' selected' : ''}>Standard</option>
        <option value="vorwort"${ch.chapter_type === 'vorwort' ? ' selected' : ''}>Vorwort</option>
        <option value="abschluss"${ch.chapter_type === 'abschluss' ? ' selected' : ''}>Abschlusswort</option>
        <option value="content"${ch.chapter_type === 'content' ? ' selected' : ''}>Nur Inhalt</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Audio (MP3)</label>
      <div class="audio-upload-zone${ch.audio_url ? ' has-audio' : ''}" id="treeChapterAudioPreview" data-action="triggerClickOn" data-args='["treeChapterAudioInput"]'>
        ${ch.audio_url ? '<span class="audio-upload-filename">🎵 Audio vorhanden</span>' : '<span class="audio-upload-label">MP3 hierher ziehen oder klicken</span>'}
      </div>
      <input type="file" id="treeChapterAudioInput" accept="audio/*" style="display:none;" data-change="treeHandleChapterAudio">
      <input type="hidden" id="treeChapterAudioUrl" value="${esc(ch.audio_url || '')}">
      <input type="hidden" id="treeChapterAudioDuration" value="${ch.audio_duration_seconds || 0}">
    </div>
    ` : `<input type="hidden" id="treeChapterTypeSelect" value="standard"><input type="hidden" id="treeChapterAudioUrl" value=""><input type="hidden" id="treeChapterAudioDuration" value="0">`}
    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveChapterBtn" data-action="treeSaveChapter"><span class="btn-text">Speichern</span></button>
      <button class="btn btn-ghost btn-sm" data-action="closeTreeEditPanel">Abbrechen</button>
    </div>
    ${isOnline ? `
    <div style="margin-top:24px;border-top:1px solid var(--border-light);padding-top:20px;">
      <h4 style="margin-bottom:12px;font-family:var(--font-heading);font-size:var(--font-size-h5);">Kapitelinhalt</h4>
      <div class="tree-content-list">${contentListHtml}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px;" data-action="addTreeChapterContent" data-args='["${chapterId}"]'>+ Inhalt hinzufügen</button>
    </div>` : ''}`;
}

function renderChapterCreateForm(container, courseId) {
  const course = state.cacheData.courses.find(c => c.id === courseId);
  const isOnline = course && (course.course_type === 'online' || course.course_type === 'both');

  container.innerHTML = `
    <input type="hidden" id="treeEditId" value="">
    <input type="hidden" id="treeChapterCourseId" value="${courseId}">
    <div class="form-group"><label class="form-label">Kurs</label><p style="font-weight:bold;font-size:14px;">${esc(course?.name || '—')}</p></div>
    <div class="form-group"><label class="form-label">Kapitelname</label><input class="form-input" id="treeChapterNameInput" placeholder="z.B. Innere Wahrnehmung"></div>
    <div class="form-row">
      <div class="form-group" style="flex:3;"><label class="form-label">Beschreibung</label><textarea class="form-textarea" id="treeChapterDescInput" placeholder="Kurze Beschreibung …"></textarea></div>
      <div class="form-group" style="flex:1;"><label class="form-label">Zeit (Min.)</label><input class="form-input" id="treeChapterTimeInput" type="number" min="1" placeholder="15"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Kapitelbild</label>
      <input type="hidden" id="treeChapterImageUrl" value="">
      <div class="image-upload-zone" id="treeChapterImagePreview" data-action="triggerClickOn" data-args='["treeChapterImageInput"]'>
        <span class="image-upload-label">Bild hierher ziehen oder klicken</span>
      </div>
      <input type="file" id="treeChapterImageInput" accept="image/*" style="display:none;" data-change="handleImageFileSelect" data-args='["treeChapterImageInput","treeChapterImagePreview"]'>
    </div>
    ${isOnline ? `
    <h4 style="margin:20px 0 12px;font-family:var(--font-heading);font-size:var(--font-size-h5);">Online-Kurs Inhalt</h4>
    <div class="form-group">
      <label class="form-label">Kapiteltyp</label>
      <select class="form-select" id="treeChapterTypeSelect">
        <option value="standard">Standard</option>
        <option value="vorwort">Vorwort</option>
        <option value="abschluss">Abschlusswort</option>
        <option value="content">Nur Inhalt</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Audio (MP3)</label>
      <div class="audio-upload-zone" id="treeChapterAudioPreview" data-action="triggerClickOn" data-args='["treeChapterAudioInput"]'>
        <span class="audio-upload-label">MP3 hierher ziehen oder klicken</span>
      </div>
      <input type="file" id="treeChapterAudioInput" accept="audio/*" style="display:none;" data-change="treeHandleChapterAudio">
      <input type="hidden" id="treeChapterAudioUrl" value="">
      <input type="hidden" id="treeChapterAudioDuration" value="0">
    </div>` : `<input type="hidden" id="treeChapterTypeSelect" value="standard"><input type="hidden" id="treeChapterAudioUrl" value=""><input type="hidden" id="treeChapterAudioDuration" value="0">`}
    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveChapterBtn" data-action="treeSaveChapter"><span class="btn-text">Erstellen</span></button>
      <button class="btn btn-ghost btn-sm" data-action="closeTreeEditPanel">Abbrechen</button>
    </div>`;
}

export function treeHandleChapterAudio() {
  const input = document.getElementById('treeChapterAudioInput');
  const zone = document.getElementById('treeChapterAudioPreview');
  if (!input || !input.files.length) return;
  const file = input.files[0];
  zone.classList.add('has-audio');
  zone.innerHTML = `<span class="audio-upload-filename">🎵 ${esc(file.name)} (${(file.size / 1024 / 1024).toFixed(1)} MB)</span>`;
}

export async function treeSaveChapter() {
  const editId = document.getElementById('treeEditId')?.value;
  const courseId = document.getElementById('treeChapterCourseId')?.value || (editId ? state.cacheData.chapters.find(c => c.id === editId)?.course_id : null);
  const name = document.getElementById('treeChapterNameInput')?.value.trim();
  if (!name) { showToast('Bitte Kapitelnamen eingeben.', 'error'); return; }
  if (!courseId) { showToast('Kurs nicht gefunden.', 'error'); return; }

  btnLoading('treeSaveChapterBtn', true);
  try {
    let image_url = document.getElementById('treeChapterImageUrl')?.value || null;
    const fileInput = document.getElementById('treeChapterImageInput');
    if (fileInput?.files.length) {
      if (editId) {
        const old = state.cacheData.chapters.find(c => c.id === editId);
        if (old?.image_url) await deleteImage(old.image_url);
      }
      image_url = await uploadImage(fileInput.files[0], 'chapters');
    }

    // Audio upload
    let audio_url = document.getElementById('treeChapterAudioUrl')?.value || null;
    let audio_duration_seconds = parseInt(document.getElementById('treeChapterAudioDuration')?.value) || null;
    const audioInput = document.getElementById('treeChapterAudioInput');
    if (audioInput?.files.length) {
      const audioFile = audioInput.files[0];
      // Get duration from audio element
      audio_duration_seconds = await new Promise((resolve) => {
        const a = new Audio();
        a.addEventListener('loadedmetadata', () => resolve(Math.round(a.duration)));
        a.addEventListener('error', () => resolve(null));
        a.src = URL.createObjectURL(audioFile);
      });
      // Upload to meditation bucket (same pattern as admin.js)
      const ext = audioFile.name.split('.').pop();
      const path = `chapters/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadErr } = await sb.storage.from('meditations').upload(path, audioFile, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = sb.storage.from('meditations').getPublicUrl(path);
      audio_url = urlData.publicUrl;
    }

    const chapterData = {
      course_id: courseId, name,
      description: document.getElementById('treeChapterDescInput')?.value.trim() || '',
      image_url,
      estimated_minutes: parseInt(document.getElementById('treeChapterTimeInput')?.value) || null,
      chapter_type: document.getElementById('treeChapterTypeSelect')?.value || 'standard',
      audio_url, audio_duration_seconds,
    };

    if (editId) {
      const { error } = await sb.from('chapters').update(chapterData).eq('id', editId);
      if (error) throw error;
    } else {
      chapterData.sort_order = state.cacheData.chapters.filter(c => c.course_id === courseId).length;
      const { error } = await sb.from('chapters').insert(chapterData);
      if (error) throw error;
    }

    await loadAllData();
    renderCourseTree();
    if (editId) {
      openEditPanel(editId, 'chapter');
    }
    showToast(editId ? 'Kapitel aktualisiert.' : 'Kapitel erstellt.');
  } catch (e) { console.error(e); showToast(trDataErr(e, 'chapter'), 'error'); }
  finally { btnLoading('treeSaveChapterBtn', false); }
}

// ══════════════════════════════════════
// CHAPTER CONTENT (sub-panel)
// ══════════════════════════════════════

export function addTreeChapterContent(chapterId) {
  const panel = document.getElementById('treeEditPanel');
  const body = document.getElementById('treeEditBody');
  const title = document.getElementById('treeEditTitle');
  if (!panel || !body) return;

  title.textContent = 'Kapitelinhalt hinzufügen';
  body.innerHTML = `
    <input type="hidden" id="treeEditId" value="">
    <input type="hidden" id="treeChapterContentChapterId" value="${chapterId}">
    <div class="form-group">
      <label class="form-label">Typ</label>
      <select class="form-select" id="treeChapterContentType" onchange="
        var t=this.value;
        document.getElementById('treeChapterContentTextGroup').style.display=(t==='divider'||t==='image')?'none':'';
        document.getElementById('treeChapterContentImageGroup').style.display=t==='image'?'':'none';
      ">
        <option value="heading">Titel</option>
        <option value="subheading">Untertitel</option>
        <option value="text">Text</option>
        <option value="text_italic">Text kursiv</option>
        <option value="text_bold">Text fett</option>
        <option value="quote">Zitat</option>
        <option value="divider">Trennlinie</option>
        <option value="image">Bild</option>
      </select>
    </div>
    <div class="form-group" id="treeChapterContentTextGroup"><label class="form-label">Inhalt</label><textarea class="form-textarea" id="treeChapterContentTextInput" placeholder="Text eingeben …"></textarea></div>
    <div class="form-group" id="treeChapterContentImageGroup" style="display:none;">
      <label class="form-label">Bild hochladen</label>
      <div class="image-upload-zone" id="treeChapterContentImagePreview" data-action="triggerClickOn" data-args='["treeChapterContentImageInput"]'>
        <span class="image-upload-label">Bild hierher ziehen oder klicken</span>
      </div>
      <input type="file" id="treeChapterContentImageInput" accept="image/*" style="display:none;" data-change="handleImageFileSelect" data-args='["treeChapterContentImageInput","treeChapterContentImagePreview"]'>
    </div>
    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveChapterContentBtn" data-action="treeSaveChapterContent"><span class="btn-text">Hinzufügen</span></button>
      <button class="btn btn-ghost btn-sm" data-action="editTreeNode" data-args='["${chapterId}","chapter"]'>Zurück</button>
    </div>`;

  setTimeout(() => initImageUploadZones(), 50);
}

export async function treeSaveChapterContent() {
  const chapterId = document.getElementById('treeChapterContentChapterId')?.value;
  const editId = document.getElementById('treeEditId')?.value;
  const type = document.getElementById('treeChapterContentType')?.value;
  if (!chapterId) return;

  let content = '';
  if (type === 'image') {
    const fileInput = document.getElementById('treeChapterContentImageInput');
    if (fileInput?.files.length) {
      btnLoading('treeSaveChapterContentBtn', true);
      try { content = await uploadImage(fileInput.files[0], 'chapters'); }
      catch (e) { showToast('Bild-Upload fehlgeschlagen.', 'error'); btnLoading('treeSaveChapterContentBtn', false); return; }
    } else if (editId) {
      const existing = (state.cacheData.chapterContentBlocks || []).find(b => b.id === editId);
      content = existing?.content || '';
    } else {
      showToast('Bitte ein Bild auswählen.', 'error'); return;
    }
  } else if (type !== 'divider') {
    content = document.getElementById('treeChapterContentTextInput')?.value.trim();
    if (!content) { showToast('Bitte Inhalt eingeben.', 'error'); return; }
  }

  btnLoading('treeSaveChapterContentBtn', true);
  try {
    const existing = (state.cacheData.chapterContentBlocks || []).filter(b => b.chapter_id === chapterId);
    const maxSort = Math.max(0, ...existing.map(b => b.sort_order ?? 0));
    const obj = { chapter_id: chapterId, type, content: type === 'divider' ? '' : content, sort_order: editId ? ((state.cacheData.chapterContentBlocks || []).find(b => b.id === editId)?.sort_order ?? maxSort + 1) : maxSort + 1 };
    if (editId) {
      const { error } = await sb.from('chapter_content').update(obj).eq('id', editId);
      if (error) throw error;
    } else {
      const { error } = await sb.from('chapter_content').insert(obj);
      if (error) throw error;
    }
    await loadAllData();
    renderCourseTree();
    // Go back to chapter edit
    openEditPanel(chapterId, 'chapter');
    showToast(editId ? 'Block aktualisiert.' : 'Block hinzugefügt.');
  } catch (e) { showToast(trDataErr(e, 'chapter_content'), 'error'); }
  finally { btnLoading('treeSaveChapterContentBtn', false); }
}

export async function deleteTreeChapterContent(blockId, chapterId) {
  if (!confirm('Inhaltsblock löschen?')) return;
  try {
    const block = (state.cacheData.chapterContentBlocks || []).find(b => b.id === blockId);
    if (block?.type === 'image' && block.content) await deleteImage(block.content);
    const { error } = await sb.from('chapter_content').delete().eq('id', blockId);
    if (error) throw error;
    await loadAllData();
    renderCourseTree();
    openEditPanel(chapterId, 'chapter');
    showToast('Block gelöscht.');
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

// ══════════════════════════════════════
// EXERCISE FORM
// ══════════════════════════════════════

function renderExerciseEditForm(container, exerciseId) {
  const ex = state.cacheData.exercises.find(x => x.id === exerciseId);
  if (!ex) { container.innerHTML = '<p>Übung nicht gefunden.</p>'; return; }

  const ch = state.cacheData.chapters.find(c => c.id === ex.chapter_id);

  container.innerHTML = `
    <input type="hidden" id="treeEditId" value="${exerciseId}">
    <div class="form-group"><label class="form-label">Kapitel</label><p style="font-weight:bold;font-size:14px;">${esc(ch?.name || '—')}</p></div>
    <div class="form-group"><label class="form-label">Übungsname</label><input class="form-input" id="treeExerciseNameInput" value="${esc(ex.name)}"></div>
    <div class="form-group"><label class="form-label">Beschreibung</label><textarea class="form-textarea" id="treeExerciseDescInput">${esc(ex.description || '')}</textarea></div>
    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveExerciseBtn" data-action="treeSaveExercise"><span class="btn-text">Speichern</span></button>
      <button class="btn btn-ghost btn-sm" data-action="closeTreeEditPanel">Abbrechen</button>
    </div>`;
}

function renderExerciseCreateForm(container, chapterId) {
  const ch = state.cacheData.chapters.find(c => c.id === chapterId);

  container.innerHTML = `
    <input type="hidden" id="treeEditId" value="">
    <input type="hidden" id="treeExerciseChapterId" value="${chapterId}">
    <div class="form-group"><label class="form-label">Kapitel</label><p style="font-weight:bold;font-size:14px;">${esc(ch?.name || '—')}</p></div>
    <div class="form-group"><label class="form-label">Übungsname</label><input class="form-input" id="treeExerciseNameInput" placeholder="z.B. Innere Wahrnehmung"></div>
    <div class="form-group"><label class="form-label">Beschreibung</label><textarea class="form-textarea" id="treeExerciseDescInput" placeholder="Kurze Beschreibung …"></textarea></div>
    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveExerciseBtn" data-action="treeSaveExercise"><span class="btn-text">Erstellen</span></button>
      <button class="btn btn-ghost btn-sm" data-action="closeTreeEditPanel">Abbrechen</button>
    </div>`;
}

export async function treeSaveExercise() {
  const editId = document.getElementById('treeEditId')?.value;
  const chapterId = document.getElementById('treeExerciseChapterId')?.value || (editId ? state.cacheData.exercises.find(e => e.id === editId)?.chapter_id : null);
  const name = document.getElementById('treeExerciseNameInput')?.value.trim();
  if (!name) { showToast('Bitte Übungsnamen eingeben.', 'error'); return; }

  btnLoading('treeSaveExerciseBtn', true);
  try {
    const exerciseData = { chapter_id: chapterId, name, description: document.getElementById('treeExerciseDescInput')?.value.trim() || '' };
    if (editId) {
      const { error } = await sb.from('exercises').update(exerciseData).eq('id', editId);
      if (error) throw error;
    } else {
      exerciseData.sort_order = state.cacheData.exercises.filter(e => e.chapter_id === chapterId).length;
      const { error } = await sb.from('exercises').insert(exerciseData);
      if (error) throw error;
    }
    await loadAllData();
    renderCourseTree();
    showToast(editId ? 'Übung aktualisiert.' : 'Übung erstellt.');
  } catch (e) { showToast(trDataErr(e, 'exercise'), 'error'); }
  finally { btnLoading('treeSaveExerciseBtn', false); }
}

// ══════════════════════════════════════
// QUESTION FORM
// ══════════════════════════════════════

function renderQuestionEditForm(container, questionId) {
  const q = state.cacheData.questions.find(x => x.id === questionId);
  if (!q) { container.innerHTML = '<p>Frage nicht gefunden.</p>'; return; }

  const showPlaceholder = q.type === 'text' ? '' : 'none';
  const showOptions = (q.type === 'choice' || q.type === 'multichoice') ? '' : 'none';
  const showScale = q.type === 'scale' ? '' : 'none';
  const opts = Array.isArray(q.options) ? q.options : [];
  const scaleOpts = typeof q.options === 'object' && !Array.isArray(q.options) ? q.options : {};

  const optsHtml = opts.map(o => `<div class="option-row"><input class="form-input" value="${esc(o)}"><button class="icon-btn delete" onclick="this.parentElement.remove()">✕</button></div>`).join('');

  container.innerHTML = `
    <input type="hidden" id="treeEditId" value="${questionId}">
    <input type="hidden" id="treeQuestionExerciseId" value="${q.exercise_id}">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Label</label><input class="form-input" id="treeQuestionLabelInput" value="${esc(q.label || '')}"></div>
      <div class="form-group"><label class="form-label">Fragetyp</label>
        <select class="form-select" id="treeQuestionTypeSelect" onchange="
          var t=this.value;
          document.getElementById('treeQuestionPlaceholderGroup').style.display=t==='text'?'':'none';
          document.getElementById('treeQuestionOptionsGroup').style.display=(t==='choice'||t==='multichoice')?'':'none';
          document.getElementById('treeQuestionScaleGroup').style.display=t==='scale'?'':'none';
        ">
          <option value="text"${q.type === 'text' ? ' selected' : ''}>Textfeld</option>
          <option value="choice"${q.type === 'choice' ? ' selected' : ''}>Single Choice</option>
          <option value="multichoice"${q.type === 'multichoice' ? ' selected' : ''}>Multiple Choice</option>
          <option value="scale"${q.type === 'scale' ? ' selected' : ''}>Skala</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Frage</label><textarea class="form-textarea" id="treeQuestionInput">${esc(q.question || '')}</textarea></div>
    <div class="form-group"><label class="form-label">Hinweis</label><textarea class="form-textarea" id="treeQuestionHintInput" style="min-height:60px;">${esc(q.hint || '')}</textarea></div>
    <div class="form-group" id="treeQuestionPlaceholderGroup" style="display:${showPlaceholder};"><label class="form-label">Platzhalter</label><input class="form-input" id="treeQuestionPlaceholderInput" value="${esc(q.placeholder || '')}"></div>
    <div class="form-group" id="treeQuestionOptionsGroup" style="display:${showOptions};">
      <label class="form-label">Antwortmöglichkeiten</label>
      <div class="options-editor" id="treeQuestionOptionsEditor">${optsHtml}</div>
      <button class="add-option-btn" data-action="treeAddOptionRow">+ Option</button>
    </div>
    <div class="form-group" id="treeQuestionScaleGroup" style="display:${showScale};">
      <label class="form-label">Skala</label>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Min</label><input class="form-input" id="treeQuestionScaleMin" type="number" value="${scaleOpts.min || 1}"></div>
        <div class="form-group"><label class="form-label">Max</label><input class="form-input" id="treeQuestionScaleMax" type="number" value="${scaleOpts.max || 10}"></div>
        <div class="form-group"><label class="form-label">Schritt</label><input class="form-input" id="treeQuestionScaleStep" type="number" value="${scaleOpts.step || 1}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Label links</label><input class="form-input" id="treeQuestionScaleLabelMin" value="${esc(scaleOpts.labelMin || '')}"></div>
        <div class="form-group"><label class="form-label">Label rechts</label><input class="form-input" id="treeQuestionScaleLabelMax" value="${esc(scaleOpts.labelMax || '')}"></div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Breite</label><select class="form-select" id="treeQuestionWidthSelect"><option value="normal"${q.wide ? '' : ' selected'}>Normal</option><option value="wide"${q.wide ? ' selected' : ''}>Breit</option></select></div>
    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveQuestionBtn" data-action="treeSaveQuestion"><span class="btn-text">Speichern</span></button>
      <button class="btn btn-ghost btn-sm" data-action="closeTreeEditPanel">Abbrechen</button>
    </div>`;
}

export function treeAddOptionRow(val) {
  const ed = document.getElementById('treeQuestionOptionsEditor');
  if (!ed) return;
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = `<input class="form-input" placeholder="Antwortmöglichkeit …" value="${val ? esc(val) : ''}"><button class="icon-btn delete" onclick="this.parentElement.remove()">✕</button>`;
  ed.appendChild(row);
}

export async function treeSaveQuestion() {
  const editId = document.getElementById('treeEditId')?.value;
  const exerciseId = document.getElementById('treeQuestionExerciseId')?.value;
  const question = document.getElementById('treeQuestionInput')?.value.trim();
  if (!question) { showToast('Bitte Frage eingeben.', 'error'); return; }

  const type = document.getElementById('treeQuestionTypeSelect')?.value || 'text';

  let options = [];
  if (type === 'choice' || type === 'multichoice') {
    options = Array.from(document.querySelectorAll('#treeQuestionOptionsEditor .option-row input'))
      .map(i => i.value.trim()).filter(Boolean);
    if (options.length < 2) { showToast('Mindestens 2 Optionen.', 'error'); return; }
  }
  if (type === 'scale') {
    options = {
      min: Number(document.getElementById('treeQuestionScaleMin')?.value) || 1,
      max: Number(document.getElementById('treeQuestionScaleMax')?.value) || 10,
      step: Number(document.getElementById('treeQuestionScaleStep')?.value) || 1,
      labelMin: document.getElementById('treeQuestionScaleLabelMin')?.value.trim() || '',
      labelMax: document.getElementById('treeQuestionScaleLabelMax')?.value.trim() || '',
    };
  }

  btnLoading('treeSaveQuestionBtn', true);
  try {
    const existingBlocks = (state.cacheData.contentBlocks || []).filter(b => b.exercise_id === exerciseId);
    const existingQs = state.cacheData.questions.filter(q => q.exercise_id === exerciseId);
    const maxSort = Math.max(0, ...existingBlocks.map(b => b.sort_order ?? 0), ...existingQs.map(q => q.sort_order ?? 0));

    const obj = {
      exercise_id: exerciseId,
      label: document.getElementById('treeQuestionLabelInput')?.value.trim() || '',
      question,
      hint: document.getElementById('treeQuestionHintInput')?.value.trim() || '',
      placeholder: document.getElementById('treeQuestionPlaceholderInput')?.value.trim() || '',
      wide: document.getElementById('treeQuestionWidthSelect')?.value === 'wide',
      type,
      options,
    };

    if (editId) {
      const { error } = await sb.from('questions').update(obj).eq('id', editId);
      if (error) throw error;
    } else {
      obj.sort_order = maxSort + 1;
      const { error } = await sb.from('questions').insert(obj);
      if (error) throw error;
    }
    await loadAllData();
    renderCourseTree();
    showToast(editId ? 'Frage aktualisiert.' : 'Frage hinzugefügt.');
  } catch (e) { showToast(trDataErr(e, 'question'), 'error'); }
  finally { btnLoading('treeSaveQuestionBtn', false); }
}

// ══════════════════════════════════════
// CONTENT BLOCK FORM
// ══════════════════════════════════════

function renderContentEditForm(container, contentId) {
  const b = (state.cacheData.contentBlocks || []).find(x => x.id === contentId);
  if (!b) { container.innerHTML = '<p>Block nicht gefunden.</p>'; return; }

  const showText = b.type !== 'divider' ? '' : 'none';

  container.innerHTML = `
    <input type="hidden" id="treeEditId" value="${contentId}">
    <input type="hidden" id="treeContentExerciseId" value="${b.exercise_id}">
    <div class="form-group">
      <label class="form-label">Typ</label>
      <select class="form-select" id="treeContentTypeSelect" onchange="document.getElementById('treeContentTextGroup').style.display=this.value==='divider'?'none':''">
        <option value="heading"${b.type === 'heading' ? ' selected' : ''}>Titel</option>
        <option value="text"${b.type === 'text' ? ' selected' : ''}>Text</option>
        <option value="text_italic"${b.type === 'text_italic' ? ' selected' : ''}>Text kursiv</option>
        <option value="text_bold"${b.type === 'text_bold' ? ' selected' : ''}>Text fett</option>
        <option value="quote"${b.type === 'quote' ? ' selected' : ''}>Zitat</option>
        <option value="divider"${b.type === 'divider' ? ' selected' : ''}>Trennlinie</option>
      </select>
    </div>
    <div class="form-group" id="treeContentTextGroup" style="display:${showText};"><label class="form-label">Inhalt</label><textarea class="form-textarea" id="treeContentTextInput">${esc(b.content || '')}</textarea></div>
    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveContentBtn" data-action="treeSaveContent"><span class="btn-text">Speichern</span></button>
      <button class="btn btn-ghost btn-sm" data-action="closeTreeEditPanel">Abbrechen</button>
    </div>`;
}

export async function treeSaveContent() {
  const editId = document.getElementById('treeEditId')?.value;
  const exerciseId = document.getElementById('treeContentExerciseId')?.value;
  const type = document.getElementById('treeContentTypeSelect')?.value;
  const content = type === 'divider' ? '' : (document.getElementById('treeContentTextInput')?.value.trim() || '');

  if (type !== 'divider' && !content) { showToast('Bitte Inhalt eingeben.', 'error'); return; }

  btnLoading('treeSaveContentBtn', true);
  try {
    const existingBlocks = (state.cacheData.contentBlocks || []).filter(b => b.exercise_id === exerciseId);
    const existingQs = state.cacheData.questions.filter(q => q.exercise_id === exerciseId);
    const maxSort = Math.max(0, ...existingBlocks.map(b => b.sort_order ?? 0), ...existingQs.map(q => q.sort_order ?? 0));
    const sortOrder = editId
      ? ((state.cacheData.contentBlocks || []).find(b => b.id === editId)?.sort_order ?? maxSort + 1)
      : maxSort + 1;

    const obj = { exercise_id: exerciseId, type, content, sort_order: sortOrder };
    if (editId) {
      const { error } = await sb.from('exercise_content').update(obj).eq('id', editId);
      if (error) throw error;
    } else {
      const { error } = await sb.from('exercise_content').insert(obj);
      if (error) throw error;
    }
    await loadAllData();
    renderCourseTree();
    showToast(editId ? 'Block aktualisiert.' : 'Block hinzugefügt.');
  } catch (e) { showToast(trDataErr(e, 'content'), 'error'); }
  finally { btnLoading('treeSaveContentBtn', false); }
}

// ══════════════════════════════════════
// ELEMENT CREATE FORM (question or content)
// ══════════════════════════════════════

function renderElementCreateForm(container, exerciseId) {
  container.innerHTML = `
    <input type="hidden" id="treeEditId" value="">
    <input type="hidden" id="treeQuestionExerciseId" value="${exerciseId}">
    <input type="hidden" id="treeContentExerciseId" value="${exerciseId}">
    <div class="form-group">
      <label class="form-label">Was hinzufügen?</label>
      <select class="form-select" id="treeElementTypeSelect" onchange="
        var t=this.value;
        document.getElementById('treeElementQuestionFields').style.display=t==='question'?'':'none';
        document.getElementById('treeElementContentFields').style.display=t!=='question'?'':'none';
        document.getElementById('treeContentTypeSelect').value=t!=='question'?t:'heading';
        document.getElementById('treeContentTextGroup').style.display=(t==='divider')?'none':'';
      ">
        <option value="question">Frage</option>
        <option value="heading">Titel</option>
        <option value="text">Text</option>
        <option value="text_italic">Text kursiv</option>
        <option value="text_bold">Text fett</option>
        <option value="quote">Zitat</option>
        <option value="divider">Trennlinie</option>
      </select>
    </div>

    <div id="treeElementQuestionFields">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Label</label><input class="form-input" id="treeQuestionLabelInput" placeholder="z.B. Reflexion · 01"></div>
        <div class="form-group"><label class="form-label">Fragetyp</label>
          <select class="form-select" id="treeQuestionTypeSelect" onchange="
            var t=this.value;
            document.getElementById('treeQuestionPlaceholderGroup').style.display=t==='text'?'':'none';
            document.getElementById('treeQuestionOptionsGroup').style.display=(t==='choice'||t==='multichoice')?'':'none';
            document.getElementById('treeQuestionScaleGroup').style.display=t==='scale'?'':'none';
          ">
            <option value="text">Textfeld</option>
            <option value="choice">Single Choice</option>
            <option value="multichoice">Multiple Choice</option>
            <option value="scale">Skala</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Frage</label><textarea class="form-textarea" id="treeQuestionInput" placeholder="Die Reflexionsfrage …"></textarea></div>
      <div class="form-group"><label class="form-label">Hinweis</label><textarea class="form-textarea" id="treeQuestionHintInput" style="min-height:60px;" placeholder="Ein unterstützender Hinweis …"></textarea></div>
      <div class="form-group" id="treeQuestionPlaceholderGroup"><label class="form-label">Platzhalter</label><input class="form-input" id="treeQuestionPlaceholderInput" placeholder="z.B. Beschreibe dein Gefühl …"></div>
      <div class="form-group" id="treeQuestionOptionsGroup" style="display:none;">
        <label class="form-label">Antwortmöglichkeiten</label>
        <div class="options-editor" id="treeQuestionOptionsEditor"></div>
        <button class="add-option-btn" data-action="treeAddOptionRow">+ Option</button>
      </div>
      <div class="form-group" id="treeQuestionScaleGroup" style="display:none;">
        <label class="form-label">Skala</label>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Min</label><input class="form-input" id="treeQuestionScaleMin" type="number" value="1"></div>
          <div class="form-group"><label class="form-label">Max</label><input class="form-input" id="treeQuestionScaleMax" type="number" value="10"></div>
          <div class="form-group"><label class="form-label">Schritt</label><input class="form-input" id="treeQuestionScaleStep" type="number" value="1"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Label links</label><input class="form-input" id="treeQuestionScaleLabelMin"></div>
          <div class="form-group"><label class="form-label">Label rechts</label><input class="form-input" id="treeQuestionScaleLabelMax"></div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Breite</label><select class="form-select" id="treeQuestionWidthSelect"><option value="normal">Normal</option><option value="wide">Breit</option></select></div>
    </div>

    <div id="treeElementContentFields" style="display:none;">
      <input type="hidden" id="treeContentTypeSelect" value="heading">
      <div class="form-group" id="treeContentTextGroup"><label class="form-label">Inhalt</label><textarea class="form-textarea" id="treeContentTextInput" placeholder="Text eingeben …"></textarea></div>
    </div>

    <div class="actions" style="margin-top:20px;">
      <button class="btn btn-primary btn-sm" id="treeSaveElementBtn" data-action="treeSaveElement"><span class="btn-text">Hinzufügen</span></button>
      <button class="btn btn-ghost btn-sm" data-action="closeTreeEditPanel">Abbrechen</button>
    </div>`;
}

export async function treeSaveElement() {
  const elementType = document.getElementById('treeElementTypeSelect')?.value;
  if (elementType === 'question') {
    await treeSaveQuestion();
  } else {
    // Set the content type from the element selector
    const contentType = document.getElementById('treeContentTypeSelect');
    if (contentType) contentType.value = elementType;
    await treeSaveContent();
  }
}
