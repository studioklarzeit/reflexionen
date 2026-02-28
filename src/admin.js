import { sb, SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { state } from './state.js';
import { esc, btnLoading, showToast, trDataErr } from './utils.js';
import { loadAllData, loadCourseAccess } from './data.js';
import { uploadImage, deleteImage } from './upload.js';
import { renderBulkUpload } from './bulkupload.js';

// ── ADMIN TABS ──

const TAB_GROUPS = {
  courses: 'Kurse', chapters: 'Kurse', exercises: 'Kurse',
  users: 'Einstellungen', onboarding: 'Einstellungen', typography: 'Einstellungen', colors: 'Einstellungen',
  journal: 'Tools', checkin: 'Tools', weeklyImpulse: 'Tools', meditation: 'Tools', messages: 'Tools',
  pages: 'Website', blog: 'Website', seoTracking: 'Website',
};

export function toggleAdminGroup(name) {
  const pills = document.getElementById('adminPills' + name);
  const labels = document.querySelectorAll('.admin-nav-label');
  const groups = ['Kurse', 'Einstellungen', 'Tools', 'Website'];
  const isOpen = pills && pills.classList.contains('open');

  // Close all
  groups.forEach(g => {
    const el = document.getElementById('adminPills' + g);
    if (el) el.classList.remove('open');
  });
  labels.forEach(l => l.classList.remove('active'));

  // Toggle: if was closed, open it
  if (!isOpen && pills) {
    pills.classList.add('open');
    const idx = groups.indexOf(name);
    if (labels[idx]) labels[idx].classList.add('active');
  }
}

export function switchAdminTab(tab) {
  document.querySelectorAll('#adminPills .nav-pill').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(t => { t.style.display = 'none'; });

  const tabs = ['courses', 'chapters', 'exercises', 'users', 'onboarding', 'typography', 'colors', 'journal', 'checkin', 'weeklyImpulse', 'meditation', 'messages', 'proQuestions', 'pages', 'blog', 'seoTracking'];
  const idx = tabs.indexOf(tab);
  const pills = document.querySelectorAll('#adminPills .nav-pill');
  if (pills[idx]) pills[idx].classList.add('active');
  document.getElementById('adminTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';

  // Auto-open the parent group
  const groupName = TAB_GROUPS[tab];
  if (groupName) {
    const area = document.getElementById('adminPills' + groupName);
    if (area && !area.classList.contains('open')) {
      toggleAdminGroup(groupName);
    }
  }

  if (tab === 'courses') { populateParentCourseSelect(); renderAdminCourses(); }
  if (tab === 'chapters') { populateCourseSelects(); renderAdminChapters(); }
  if (tab === 'exercises') { populateCourseSelects(); renderAdminExercises(); }
  if (tab === 'users') renderAdminUsers();
  if (tab === 'onboarding') loadOnboardingEditor();
  if (tab === 'typography') loadTypographyEditor();
  if (tab === 'journal') loadJournalImpulseEditor();
  if (tab === 'colors') loadColorEditor();
  if (tab === 'checkin') loadCheckinEditor();
  if (tab === 'weeklyImpulse') loadWeeklyImpulseEditor();
  if (tab === 'meditation') loadMeditationEditor();
  if (tab === 'messages') loadAdminMessages();
  if (tab === 'proQuestions') loadAdminProQuestions();
  if (tab === 'pages') { import('./pagebuilder.js').then(m => { m.loadPageEditor(); m.initPageDragDrop(); }); }
  if (tab === 'blog') { import('./pagebuilder.js').then(m => { m.loadBlogEditor(); m.initPageDragDrop(); }); }
  if (tab === 'seoTracking') { import('./seo.js').then(m => m.loadSeoEditor()); }
}

// ══════════════════════════════════════
// ADMIN: COURSES (unchanged)
// ══════════════════════════════════════

export function renderAdminCourses() {
  const courses = state.cacheData.courses;
  const el = document.getElementById('adminCoursesList');
  if (!courses.length) { el.innerHTML = '<div class="empty-state">Noch keine Kurse.</div>'; return; }

  const rows = courses.map((c) => {
    const cc = state.cacheData.chapters.filter((ch) => ch.course_id === c.id).length;
    const parentName = c.parent_course_id ? state.cacheData.courses.find(p => p.id === c.parent_course_id)?.name : null;
    const parentBadge = parentName ? ` <span style="font-weight:normal;font-size:11px;color:var(--text-muted);">↳ ${esc(parentName)}</span>` : '';
    return `<tr draggable="true" data-id="${c.id}" data-table="courses"><td><span class="drag-handle" title="Ziehen zum Sortieren">⠿</span></td>` +
      `<td style="font-weight:bold;">${esc(c.name)}${parentBadge}${c.restricted ? ' <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : ''}</td>` +
      `<td style="color:var(--text-muted);font-style:italic;font-size:13px;">${esc(c.description || '—')}</td><td>${cc}</td>` +
      `<td><div class="actions-cell">${c.restricted ? `<button class="icon-btn" data-action="manageInvites" data-args='["${c.id}"]' title="Einladungen">⫘</button>` : ''}` +
      `<button class="icon-btn" data-action="editCourse" data-args='["${c.id}"]'>✎</button>` +
      `<button class="icon-btn delete" data-action="deleteCourse" data-args='["${c.id}"]'>✕</button></div></td></tr>`;
  }).join('');

  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th style="width:40px;"></th><th>Kursname</th><th>Beschreibung</th><th>Kapitel</th><th style="text-align:right">Aktionen</th></tr></thead><tbody id="dragCourses">${rows}</tbody></table></div>`;
  initDragDrop('dragCourses', 'courses');
}

export async function saveCourse() {
  const name = document.getElementById('courseNameInput').value.trim();
  const desc = document.getElementById('courseDescInput').value.trim();
  const restricted = document.getElementById('courseRestrictedInput').checked;
  const parent_course_id = document.getElementById('courseParentSelect')?.value || null;
  const editId = document.getElementById('editCourseId').value;
  if (!name) { showToast('Bitte Kursnamen eingeben.', 'error'); return; }

  // New fields
  const course_type = document.getElementById('courseTypeSelect').value;
  const is_purchasable = course_type !== 'exercise';
  const sales_published = document.getElementById('courseSalesPublished')?.checked || false;
  const sales_slug = document.getElementById('courseSalesSlug')?.value.trim() || null;
  const sales_headline = document.getElementById('courseSalesHeadline')?.value.trim() || null;
  const sales_description = document.getElementById('courseSalesDesc')?.value.trim() || null;
  const salesFeaturesRaw = document.getElementById('courseSalesFeatures')?.value.trim() || '';
  const sales_features = salesFeaturesRaw ? salesFeaturesRaw.split('\n').filter(l => l.trim()).map(l => l.trim()) : null;
  const sales_cta_text = document.getElementById('courseSalesCta')?.value.trim() || 'Jetzt starten';
  const price_onetime_amount = Math.round(parseFloat(document.getElementById('coursePriceOnetime')?.value) * 100) || null;
  const stripe_price_id_onetime = document.getElementById('courseStripePriceOnetime')?.value.trim() || null;
  const price_subscription_amount = Math.round(parseFloat(document.getElementById('coursePriceSubscription')?.value) * 100) || null;
  const stripe_price_id_subscription = document.getElementById('courseStripePriceSubscription')?.value.trim() || null;

  btnLoading('saveCourseBtn', true);
  try {
    // Handle image upload
    let image_url = document.getElementById('courseImageUrl').value || null;
    const fileInput = document.getElementById('courseImageInput');
    if (fileInput.files.length) {
      if (editId) {
        const old = state.cacheData.courses.find((c) => c.id === editId);
        if (old?.image_url) await deleteImage(old.image_url);
      }
      image_url = await uploadImage(fileInput.files[0], 'courses');
    }

    const courseData = {
      name, description: desc, restricted, image_url,
      parent_course_id,
      course_type, is_purchasable,
      sales_published, sales_slug, sales_headline, sales_description,
      sales_features, sales_cta_text,
      price_onetime_amount, stripe_price_id_onetime,
      price_subscription_amount, stripe_price_id_subscription,
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
    resetCourseForm();
    renderAdminCourses();
    showToast(editId ? 'Kurs aktualisiert.' : 'Kurs erstellt.');
  } catch (e) { console.error(e); showToast(trDataErr(e, 'course'), 'error'); }
  finally { btnLoading('saveCourseBtn', false); }
}

export function editCourse(id) {
  const c = state.cacheData.courses.find((x) => x.id === id);
  if (!c) return;
  document.getElementById('editCourseId').value = id;
  document.getElementById('courseNameInput').value = c.name;
  document.getElementById('courseDescInput').value = c.description || '';
  document.getElementById('courseRestrictedInput').checked = c.restricted || false;
  populateParentCourseSelect(id);
  document.getElementById('courseParentSelect').value = c.parent_course_id || '';
  document.getElementById('courseFormTitle').textContent = 'Kurs bearbeiten';
  // Image
  document.getElementById('courseImageUrl').value = c.image_url || '';
  updateImagePreview('courseImagePreview', c.image_url);
  // New fields
  document.getElementById('courseTypeSelect').value = c.course_type || 'exercise';
  document.getElementById('courseSalesPublished').checked = c.sales_published || false;
  document.getElementById('courseSalesSlug').value = c.sales_slug || '';
  document.getElementById('courseSalesHeadline').value = c.sales_headline || '';
  document.getElementById('courseSalesDesc').value = c.sales_description || '';
  document.getElementById('courseSalesFeatures').value = (c.sales_features || []).join('\n');
  document.getElementById('courseSalesCta').value = c.sales_cta_text || 'Jetzt starten';
  document.getElementById('coursePriceOnetime').value = c.price_onetime_amount ? (c.price_onetime_amount / 100).toFixed(2) : '';
  document.getElementById('courseStripePriceOnetime').value = c.stripe_price_id_onetime || '';
  document.getElementById('coursePriceSubscription').value = c.price_subscription_amount ? (c.price_subscription_amount / 100).toFixed(2) : '';
  document.getElementById('courseStripePriceSubscription').value = c.stripe_price_id_subscription || '';
  toggleCourseSalesFields();
  // Hide sections editor when switching to a different course
  const sectionsEditor = document.getElementById('pageSectionsEditor');
  if (sectionsEditor) sectionsEditor.style.display = 'none';
  document.getElementById('courseNameInput').focus();
}

export async function deleteCourse(id) {
  if (!confirm('Kurs mit allen Kapiteln, Übungen und Fragen löschen?')) return;
  try {
    const { error } = await sb.from('courses').delete().eq('id', id);
    if (error) throw error;
    await loadAllData(); renderAdminCourses(); showToast('Kurs gelöscht.');
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

export function resetCourseForm() {
  document.getElementById('editCourseId').value = '';
  document.getElementById('courseNameInput').value = '';
  document.getElementById('courseDescInput').value = '';
  document.getElementById('courseRestrictedInput').checked = false;
  populateParentCourseSelect();
  document.getElementById('courseFormTitle').textContent = 'Neuen Kurs erstellen';
  // Image
  document.getElementById('courseImageUrl').value = '';
  document.getElementById('courseImageInput').value = '';
  updateImagePreview('courseImagePreview', null);
  // New fields
  document.getElementById('courseTypeSelect').value = 'exercise';
  document.getElementById('courseSalesPublished').checked = false;
  document.getElementById('courseSalesSlug').value = '';
  document.getElementById('courseSalesHeadline').value = '';
  document.getElementById('courseSalesDesc').value = '';
  document.getElementById('courseSalesFeatures').value = '';
  document.getElementById('courseSalesCta').value = 'Jetzt starten';
  document.getElementById('coursePriceOnetime').value = '';
  document.getElementById('courseStripePriceOnetime').value = '';
  document.getElementById('coursePriceSubscription').value = '';
  document.getElementById('courseStripePriceSubscription').value = '';
  toggleCourseSalesFields();
  // Hide sections editor
  const sectionsEditor = document.getElementById('pageSectionsEditor');
  if (sectionsEditor) sectionsEditor.style.display = 'none';
}

export function toggleCourseSalesFields() {
  const type = document.getElementById('courseTypeSelect').value;
  const salesFields = document.getElementById('courseSalesFields');
  if (salesFields) salesFields.style.display = (type === 'online' || type === 'both') ? 'block' : 'none';
}

export function populateParentCourseSelect(excludeId) {
  const sel = document.getElementById('courseParentSelect');
  if (!sel) return;
  const courses = state.cacheData.courses.filter(c => !c.parent_course_id && c.id !== excludeId);
  sel.innerHTML = '<option value="">— Kein Elternkurs (eigenständig) —</option>' +
    courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

// ══════════════════════════════════════
// INVITE MANAGEMENT (unchanged)
// ══════════════════════════════════════

export async function manageInvites(courseId) {
  const course = state.cacheData.courses.find((c) => c.id === courseId);
  const { data: invites } = await sb.from('course_invites').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
  const list = invites || [];

  let html = `<div class="admin-form"><h3>Einladungen — ${esc(course.name)}</h3>`;
  html += `<div class="actions" style="margin-top:0;margin-bottom:20px;"><button class="btn btn-primary btn-sm" data-action="createInvite" data-args='["${courseId}"]'><span class="btn-text">Neuen Link erstellen</span></button><button class="btn btn-ghost btn-sm" data-action="renderAdminCourses">Zurück</button></div>`;

  if (list.length) {
    html += '<div class="invite-list">';
    list.forEach((inv) => {
      const url = location.origin + location.pathname + '?invite=' + inv.token;
      const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
      const maxed = inv.max_uses && inv.used_count >= inv.max_uses;
      const status = expired ? '✕ Abgelaufen' : maxed ? '✓ Limit erreicht' : '✓ Aktiv';
      html += `<div class="invite-item"><div><div class="invite-box" style="margin:0;font-size:11px;padding:6px 10px;">${esc(url)}</div>` +
        `<span style="font-size:11px;color:var(--text-light);">${status} · ${inv.used_count}× verwendet${inv.max_uses ? ' / max ' + inv.max_uses : ''}</span></div>` +
        `<button class="icon-btn" data-action="copyAndToast" data-args='["${esc(url)}"]' title="Kopieren">⎘</button></div>`;
    });
    html += '</div>';
  } else {
    html += '<p style="font-style:italic;color:var(--text-light);">Noch keine Einladungslinks.</p>';
  }
  html += '</div>';
  document.getElementById('adminCoursesList').innerHTML = html;
}

export async function createInvite(courseId) {
  try {
    const { error } = await sb.from('course_invites').insert({ course_id: courseId });
    if (error) throw error;
    manageInvites(courseId);
    showToast('Einladungslink erstellt.');
  } catch (e) { showToast(trDataErr(e, 'save'), 'error'); }
}

export async function redeemInvite(token) {
  try {
    const { data, error } = await sb.rpc('redeem_invite', { invite_token: token });
    if (error) throw error;
    if (data && data.success) {
      await loadCourseAccess();
      showToast('Kurs freigeschaltet!');
      const { navigateTo } = await import('./navigation.js');
      navigateTo('courses');
    } else {
      showToast(data?.error || 'Ungültiger Link.', 'error');
    }
  } catch (e) { showToast('Fehler beim Einlösen des Links.', 'error'); }
}

// ══════════════════════════════════════
// ADMIN: CHAPTERS (unchanged)
// ══════════════════════════════════════

export function renderAdminChapters() {
  const chapters = state.cacheData.chapters;
  const el = document.getElementById('adminChaptersList');
  if (!chapters.length) { el.innerHTML = '<div class="empty-state">Noch keine Kapitel.</div>'; return; }

  const rows = chapters.map((ch) => {
    const course = state.cacheData.courses.find((c) => c.id === ch.course_id);
    const ec = state.cacheData.exercises.filter((ex) => ex.chapter_id === ch.id).length;
    return `<tr draggable="true" data-id="${ch.id}" data-table="chapters"><td><span class="drag-handle">⠿</span></td>` +
      `<td style="font-weight:bold;">${esc(ch.name)}</td>` +
      `<td style="color:var(--text-muted);font-style:italic;font-size:13px;">${course ? esc(course.name) : '—'}</td><td>${ec}</td>` +
      `<td><div class="actions-cell"><button class="icon-btn" data-action="editChapter" data-args='["${ch.id}"]'>✎</button>` +
      `<button class="icon-btn delete" data-action="deleteChapter" data-args='["${ch.id}"]'>✕</button></div></td></tr>`;
  }).join('');

  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th style="width:40px;"></th><th>Kapitel</th><th>Kurs</th><th>Übungen</th><th style="text-align:right">Aktionen</th></tr></thead><tbody id="dragChapters">${rows}</tbody></table></div>`;
  initDragDrop('dragChapters', 'chapters');
}

export async function saveChapter() {
  const courseId = document.getElementById('chapterCourseSelect').value;
  const name = document.getElementById('chapterNameInput').value.trim();
  const desc = document.getElementById('chapterDescInput').value.trim();
  const estimatedMinutes = parseInt(document.getElementById('chapterTimeInput').value) || null;
  const editId = document.getElementById('editChapterId').value;
  if (!courseId) { showToast('Bitte Kurs auswählen.', 'error'); return; }
  if (!name) { showToast('Bitte Kapitelnamen eingeben.', 'error'); return; }

  // Online course fields
  const chapter_type = document.getElementById('chapterTypeSelect')?.value || 'standard';

  btnLoading('saveChapterBtn', true);
  try {
    // Handle image upload
    let image_url = document.getElementById('chapterImageUrl').value || null;
    const fileInput = document.getElementById('chapterImageInput');
    if (fileInput.files.length) {
      if (editId) {
        const old = state.cacheData.chapters.find((c) => c.id === editId);
        if (old?.image_url) await deleteImage(old.image_url);
      }
      image_url = await uploadImage(fileInput.files[0], 'chapters');
    }

    // Handle audio upload
    let audio_url = document.getElementById('chapterAudioUrl')?.value || null;
    let audio_duration_seconds = parseInt(document.getElementById('chapterAudioDuration')?.value) || null;
    const audioInput = document.getElementById('chapterAudioInput');
    if (audioInput?.files.length) {
      const audioFile = audioInput.files[0];
      audio_duration_seconds = await getAudioDuration(audioFile);
      if (editId) {
        const old = state.cacheData.chapters.find((c) => c.id === editId);
        if (old?.audio_url) await deleteMeditationAudio(old.audio_url);
      }
      audio_url = await uploadMeditationAudio(audioFile);
    }

    const chapterData = {
      course_id: courseId, name, description: desc, image_url,
      estimated_minutes: estimatedMinutes,
      chapter_type, audio_url, audio_duration_seconds,
    };

    if (editId) {
      const { error } = await sb.from('chapters').update(chapterData).eq('id', editId);
      if (error) throw error;
    } else {
      chapterData.sort_order = state.cacheData.chapters.filter((c) => c.course_id === courseId).length;
      const { error } = await sb.from('chapters').insert(chapterData);
      if (error) throw error;
    }
    await loadAllData(); resetChapterForm(); renderAdminChapters();
    showToast(editId ? 'Kapitel aktualisiert.' : 'Kapitel erstellt.');
  } catch (e) { showToast(trDataErr(e, 'chapter'), 'error'); }
  finally { btnLoading('saveChapterBtn', false); }
}

export function editChapter(id) {
  const ch = state.cacheData.chapters.find((c) => c.id === id);
  if (!ch) return;
  document.getElementById('editChapterId').value = id;
  document.getElementById('chapterCourseSelect').value = ch.course_id;
  document.getElementById('chapterNameInput').value = ch.name;
  document.getElementById('chapterDescInput').value = ch.description || '';
  document.getElementById('chapterFormTitle').textContent = 'Kapitel bearbeiten';
  // Time estimate
  document.getElementById('chapterTimeInput').value = ch.estimated_minutes || '';
  // Image
  document.getElementById('chapterImageUrl').value = ch.image_url || '';
  updateImagePreview('chapterImagePreview', ch.image_url);
  // Online course fields
  document.getElementById('chapterTypeSelect').value = ch.chapter_type || 'standard';
  document.getElementById('chapterAudioUrl').value = ch.audio_url || '';
  document.getElementById('chapterAudioDuration').value = ch.audio_duration_seconds || 0;
  const audioZone = document.getElementById('chapterAudioPreview');
  if (ch.audio_url) {
    audioZone.classList.add('has-audio');
    audioZone.innerHTML = `<span class="audio-upload-filename">🎵 Audio vorhanden</span>`;
  }
  toggleChapterOnlineFields();
  // Show chapter content blocks editor
  document.getElementById('chapterContentSection').style.display = '';
  renderAdminChapterContent(id);
  document.getElementById('chapterNameInput').focus();
}

export async function deleteChapter(id) {
  if (!confirm('Kapitel mit allen Übungen und Fragen löschen?')) return;
  try {
    const { error } = await sb.from('chapters').delete().eq('id', id);
    if (error) throw error;
    await loadAllData(); renderAdminChapters(); showToast('Kapitel gelöscht.');
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

export function resetChapterForm() {
  document.getElementById('editChapterId').value = '';
  document.getElementById('chapterNameInput').value = '';
  document.getElementById('chapterDescInput').value = '';
  document.getElementById('chapterFormTitle').textContent = 'Neues Kapitel erstellen';
  // Time estimate
  document.getElementById('chapterTimeInput').value = '';
  // Image
  document.getElementById('chapterImageUrl').value = '';
  document.getElementById('chapterImageInput').value = '';
  updateImagePreview('chapterImagePreview', null);
  // Online course fields
  document.getElementById('chapterTypeSelect').value = 'standard';
  document.getElementById('chapterAudioUrl').value = '';
  document.getElementById('chapterAudioDuration').value = '0';
  const audioInput = document.getElementById('chapterAudioInput');
  if (audioInput) audioInput.value = '';
  const audioZone = document.getElementById('chapterAudioPreview');
  if (audioZone) {
    audioZone.classList.remove('has-audio');
    audioZone.innerHTML = '<span class="audio-upload-label">MP3 hierher ziehen oder klicken</span>';
  }
  toggleChapterOnlineFields();
  // Hide chapter content blocks editor
  document.getElementById('chapterContentSection').style.display = 'none';
}

export function handleChapterAudioSelect() {
  const input = document.getElementById('chapterAudioInput');
  const zone = document.getElementById('chapterAudioPreview');
  if (!input || !input.files.length) return;
  const file = input.files[0];
  zone.classList.add('has-audio');
  zone.innerHTML = `<span class="audio-upload-filename">🎵 ${esc(file.name)} (${(file.size / 1024 / 1024).toFixed(1)} MB)</span>`;
}

export function toggleChapterOnlineFields() {
  const courseId = document.getElementById('chapterCourseSelect').value;
  const course = state.cacheData.courses.find(c => c.id === courseId);
  const isOnline = course && (course.course_type === 'online' || course.course_type === 'both');
  const fields = document.getElementById('chapterOnlineFields');
  if (fields) fields.style.display = isOnline ? 'block' : 'none';
}

// ══════════════════════════════════════
// ADMIN: EXERCISES (now containers)
// ══════════════════════════════════════

export function renderAdminExercises() {
  renderBulkUpload();

  const exercises = state.cacheData.exercises;
  const el = document.getElementById('adminExercisesList');
  if (!exercises.length) { el.innerHTML = '<div class="empty-state">Noch keine Übungen.</div>'; return; }

  const rows = exercises.map((ex) => {
    const ch = state.cacheData.chapters.find((c) => c.id === ex.chapter_id);
    const qc = state.cacheData.questions.filter((q) => q.exercise_id === ex.id).length;
    return `<tr draggable="true" data-id="${ex.id}" data-table="exercises"><td><span class="drag-handle">⠿</span></td>` +
      `<td style="font-weight:bold;">${esc(ex.name)}</td>` +
      `<td style="color:var(--text-muted);font-style:italic;font-size:13px;">${esc(ex.description || '—')}</td>` +
      `<td style="color:var(--text-muted);font-size:13px;">${ch ? esc(ch.name) : '—'}</td><td>${qc}</td>` +
      `<td><div class="actions-cell"><button class="icon-btn" data-action="editExercise" data-args='["${ex.id}"]'>✎</button>` +
      `<button class="icon-btn delete" data-action="deleteExercise" data-args='["${ex.id}"]'>✕</button></div></td></tr>`;
  }).join('');

  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th style="width:40px;"></th><th>Übungsname</th><th>Beschreibung</th><th>Kapitel</th><th>Fragen</th><th style="text-align:right">Aktionen</th></tr></thead><tbody id="dragExercises">${rows}</tbody></table></div>`;
  initDragDrop('dragExercises', 'exercises');
}

export async function saveExercise() {
  const chapterId = document.getElementById('exerciseChapterSelect').value;
  const name = document.getElementById('exerciseNameInput').value.trim();
  const desc = document.getElementById('exerciseDescInput').value.trim();
  const editId = document.getElementById('editExerciseId').value;
  if (!chapterId) { showToast('Bitte Kapitel auswählen.', 'error'); return; }
  if (!name) { showToast('Bitte Übungsnamen eingeben.', 'error'); return; }

  btnLoading('saveExerciseBtn', true);
  try {
    if (editId) {
      const { error } = await sb.from('exercises').update({ chapter_id: chapterId, name, description: desc }).eq('id', editId);
      if (error) throw error;
      await loadAllData(); renderAdminExercises();
      showToast('Übung aktualisiert.');
      // Re-open edit mode
      editExercise(editId);
    } else {
      const ord = state.cacheData.exercises.filter((e) => e.chapter_id === chapterId).length;
      const { data, error } = await sb.from('exercises').insert({ chapter_id: chapterId, name, description: desc, sort_order: ord }).select().single();
      if (error) throw error;
      await loadAllData(); renderAdminExercises();
      showToast('Übung erstellt — füge jetzt Fragen hinzu.');
      // Open edit mode for the new exercise
      if (data?.id) editExercise(data.id);
    }
  } catch (e) { showToast(trDataErr(e, 'exercise'), 'error'); }
  finally { btnLoading('saveExerciseBtn', false); }
}

export function editExercise(id) {
  const ex = state.cacheData.exercises.find((e) => e.id === id);
  if (!ex) return;
  const ch = state.cacheData.chapters.find((c) => c.id === ex.chapter_id);
  document.getElementById('editExerciseId').value = id;
  if (ch) { document.getElementById('exerciseCourseFilter').value = ch.course_id; updateExerciseChapterSelect(); }
  document.getElementById('exerciseChapterSelect').value = ex.chapter_id;
  document.getElementById('exerciseNameInput').value = ex.name;
  document.getElementById('exerciseDescInput').value = ex.description || '';
  document.getElementById('exerciseFormTitle').textContent = 'Übung bearbeiten';
  document.getElementById('exerciseNameInput').focus();
  // Show content + question section
  document.getElementById('exerciseContentSection').style.display = '';
  resetElementForm();
  renderAdminContent(id);
}

export async function deleteExercise(id) {
  if (!confirm('Übung mit allen Fragen löschen?')) return;
  try {
    const { error } = await sb.from('exercises').delete().eq('id', id);
    if (error) throw error;
    await loadAllData(); renderAdminExercises(); showToast('Übung gelöscht.');
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

export function resetExerciseForm() {
  document.getElementById('editExerciseId').value = '';
  document.getElementById('exerciseNameInput').value = '';
  document.getElementById('exerciseDescInput').value = '';
  document.getElementById('exerciseFormTitle').textContent = 'Neue Übung erstellen';
  // Hide content blocks section
  document.getElementById('exerciseContentSection').style.display = 'none';
  resetElementForm();
}

// ══════════════════════════════════════
// ADMIN: QUESTIONS (new tab)
// ══════════════════════════════════════

// ══════════════════════════════════════
// ADMIN: UNIFIED ELEMENT MANAGEMENT
// (Questions + Content Blocks within Exercises)
// ══════════════════════════════════════

export function onExerciseAddTypeChange() {
  const t = document.getElementById('exerciseAddType').value;
  const isQuestion = t === 'question';
  document.getElementById('questionFieldsWrap').style.display = isQuestion ? '' : 'none';
  document.getElementById('contentFieldsWrap').style.display = isQuestion ? 'none' : '';
  // Content text field visibility
  document.getElementById('contentTextGroup').style.display = (!isQuestion && t !== 'divider') ? 'block' : 'none';
}

export function onQuestionTypeChange() {
  const t = document.getElementById('questionTypeSelect').value;
  document.getElementById('questionPlaceholderGroup').style.display = t === 'text' ? 'block' : 'none';
  document.getElementById('questionOptionsGroup').style.display = (t === 'choice' || t === 'multichoice') ? 'block' : 'none';
  document.getElementById('questionScaleGroup').style.display = t === 'scale' ? 'block' : 'none';
  if ((t === 'choice' || t === 'multichoice') && !document.getElementById('questionOptionsEditor').children.length) addOptionRow();
}

export function addOptionRow(val) {
  const ed = document.getElementById('questionOptionsEditor');
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = `<input class="form-input" placeholder="Antwortmöglichkeit …" value="${val ? esc(val) : ''}"><button class="icon-btn delete" data-action="removeParent" data-el>✕</button>`;
  ed.appendChild(row);
}

function getOptionsFromEditor() {
  return Array.from(document.querySelectorAll('#questionOptionsEditor .option-row input'))
    .map((i) => i.value.trim()).filter(Boolean);
}

export async function saveElement() {
  const exerciseId = document.getElementById('editExerciseId').value;
  if (!exerciseId) { showToast('Bitte zuerst eine Übung auswählen.', 'error'); return; }

  const addType = document.getElementById('exerciseAddType').value;
  const isQuestion = addType === 'question';

  if (isQuestion) {
    await saveQuestionInline(exerciseId);
  } else {
    await saveContentInline(exerciseId, addType);
  }
}

async function saveQuestionInline(exerciseId) {
  const label = document.getElementById('questionLabelInput').value.trim();
  const question = document.getElementById('questionQuestionInput').value.trim();
  const hint = document.getElementById('questionHintInput').value.trim();
  const placeholder = document.getElementById('questionPlaceholderInput').value.trim();
  const wide = document.getElementById('questionWidthSelect').value === 'wide';
  const editId = document.getElementById('editQuestionId').value;
  const type = document.getElementById('questionTypeSelect').value;

  if (!question) { showToast('Bitte Frage eingeben.', 'error'); return; }

  let options = [];
  if (type === 'choice' || type === 'multichoice') {
    options = getOptionsFromEditor();
    if (options.length < 2) { showToast('Mindestens 2 Antwortmöglichkeiten.', 'error'); return; }
  }
  if (type === 'scale') {
    options = {
      min: Number(document.getElementById('questionScaleMin').value) || 1,
      max: Number(document.getElementById('questionScaleMax').value) || 10,
      step: Number(document.getElementById('questionScaleStep').value) || 1,
      labelMin: document.getElementById('questionScaleLabelMin').value.trim(),
      labelMax: document.getElementById('questionScaleLabelMax').value.trim(),
    };
  }

  btnLoading('saveElementBtn', true);
  try {
    // Auto sort_order
    const existingBlocks = (state.cacheData.contentBlocks || []).filter((b) => b.exercise_id === exerciseId);
    const existingQs = state.cacheData.questions.filter((q) => q.exercise_id === exerciseId);
    const maxSort = Math.max(0, ...existingBlocks.map(b => b.sort_order ?? 0), ...existingQs.map(q => q.sort_order ?? 0));

    const obj = { exercise_id: exerciseId, label, question, hint, placeholder, wide, type, options };
    if (editId) {
      const { error } = await sb.from('questions').update(obj).eq('id', editId);
      if (error) throw error;
    } else {
      obj.sort_order = maxSort + 1;
      const { error } = await sb.from('questions').insert(obj);
      if (error) throw error;
    }
    await loadAllData(); resetElementForm(); renderAdminContent(exerciseId);
    showToast(editId ? 'Frage aktualisiert.' : 'Frage hinzugefügt.');
  } catch (e) { showToast(trDataErr(e, 'question'), 'error'); }
  finally { btnLoading('saveElementBtn', false); }
}

async function saveContentInline(exerciseId, type) {
  const content = document.getElementById('contentTextInput').value.trim();
  const editId = document.getElementById('editContentId').value;

  if (type !== 'divider' && !content) { showToast('Bitte Inhalt eingeben.', 'error'); return; }

  btnLoading('saveElementBtn', true);
  try {
    const existingBlocks = (state.cacheData.contentBlocks || []).filter((b) => b.exercise_id === exerciseId);
    const existingQs = state.cacheData.questions.filter((q) => q.exercise_id === exerciseId);
    const maxSort = Math.max(0, ...existingBlocks.map(b => b.sort_order ?? 0), ...existingQs.map(q => q.sort_order ?? 0));
    const sortOrder = editId
      ? ((state.cacheData.contentBlocks || []).find(b => b.id === editId)?.sort_order ?? maxSort + 1)
      : maxSort + 1;

    const obj = { exercise_id: exerciseId, type, content: type === 'divider' ? '' : content, sort_order: sortOrder };
    if (editId) {
      const { error } = await sb.from('exercise_content').update(obj).eq('id', editId);
      if (error) throw error;
    } else {
      const { error } = await sb.from('exercise_content').insert(obj);
      if (error) throw error;
    }
    await loadAllData(); resetElementForm(); renderAdminContent(exerciseId);
    showToast(editId ? 'Inhaltsblock aktualisiert.' : 'Inhaltsblock hinzugefügt.');
  } catch (e) { showToast(trDataErr(e, 'content'), 'error'); }
  finally { btnLoading('saveElementBtn', false); }
}

export function editQuestion(id) {
  const q = state.cacheData.questions.find((x) => x.id === id);
  if (!q) return;

  // Make sure we're in exercise edit mode
  const currentExId = document.getElementById('editExerciseId').value;
  if (currentExId !== q.exercise_id) {
    editExercise(q.exercise_id);
  }

  document.getElementById('exerciseAddType').value = 'question';
  onExerciseAddTypeChange();

  document.getElementById('editQuestionId').value = id;
  document.getElementById('questionLabelInput').value = q.label || '';
  document.getElementById('questionQuestionInput').value = q.question;
  document.getElementById('questionHintInput').value = q.hint || '';
  document.getElementById('questionPlaceholderInput').value = q.placeholder || '';
  document.getElementById('questionWidthSelect').value = q.wide ? 'wide' : 'normal';
  document.getElementById('questionTypeSelect').value = q.type || 'text';
  onQuestionTypeChange();

  const opts = q.options || [];
  document.getElementById('questionOptionsEditor').innerHTML = '';
  if (Array.isArray(opts)) { opts.forEach((o) => addOptionRow(o)); }
  else if (typeof opts === 'object') {
    document.getElementById('questionScaleMin').value = opts.min || 1;
    document.getElementById('questionScaleMax').value = opts.max || 10;
    document.getElementById('questionScaleStep').value = opts.step || 1;
    document.getElementById('questionScaleLabelMin').value = opts.labelMin || '';
    document.getElementById('questionScaleLabelMax').value = opts.labelMax || '';
  }
  document.getElementById('saveElementBtn').querySelector('.btn-text').textContent = 'Aktualisieren';
  document.getElementById('questionQuestionInput').focus();
}

export async function deleteQuestion(id) {
  if (!confirm('Frage löschen?')) return;
  const exerciseId = document.getElementById('editExerciseId').value;
  try {
    const { error } = await sb.from('questions').delete().eq('id', id);
    if (error) throw error;
    await loadAllData(); renderAdminContent(exerciseId); showToast('Frage gelöscht.');
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

export function editContent(id) {
  const b = (state.cacheData.contentBlocks || []).find((x) => x.id === id);
  if (!b) return;
  document.getElementById('exerciseAddType').value = b.type;
  onExerciseAddTypeChange();
  document.getElementById('editContentId').value = id;
  document.getElementById('contentTextInput').value = b.content || '';
  document.getElementById('saveElementBtn').querySelector('.btn-text').textContent = 'Aktualisieren';
}

export async function deleteContent(id) {
  if (!confirm('Inhaltsblock löschen?')) return;
  const exerciseId = document.getElementById('editExerciseId').value;
  try {
    const { error } = await sb.from('exercise_content').delete().eq('id', id);
    if (error) throw error;
    await loadAllData(); renderAdminContent(exerciseId); showToast('Inhaltsblock gelöscht.');
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

export function resetElementForm() {
  document.getElementById('editContentId').value = '';
  document.getElementById('editQuestionId').value = '';
  document.getElementById('exerciseAddType').value = 'question';
  document.getElementById('contentTextInput').value = '';
  document.getElementById('questionLabelInput').value = '';
  document.getElementById('questionQuestionInput').value = '';
  document.getElementById('questionHintInput').value = '';
  document.getElementById('questionPlaceholderInput').value = '';
  document.getElementById('questionWidthSelect').value = 'normal';
  document.getElementById('questionTypeSelect').value = 'text';
  document.getElementById('questionOptionsEditor').innerHTML = '';
  onExerciseAddTypeChange();
  onQuestionTypeChange();
  document.getElementById('saveElementBtn').querySelector('.btn-text').textContent = 'Hinzufügen';
}

// Kept for backward compatibility
export function renderAdminQuestions() {}
export function resetQuestionForm() { resetElementForm(); }
export function updateQuestionExerciseSelect() {}
export function updateContentExerciseSelect() {}
export function onContentTypeChange() {}
export function resetContentForm() { resetElementForm(); }
export function saveQuestion() { saveElement(); }
export function saveContent() { saveElement(); }

// ══════════════════════════════════════
// ADMIN: CHAPTER CONTENT BLOCKS
// ══════════════════════════════════════

export function onChapterContentAddTypeChange() {
  const t = document.getElementById('chapterContentAddType').value;
  const isImage = t === 'image';
  const isDivider = t === 'divider';
  document.getElementById('chapterContentTextGroup').style.display = (isDivider || isImage) ? 'none' : 'block';
  document.getElementById('chapterContentImageGroup').style.display = isImage ? 'block' : 'none';
}

export async function saveChapterContent() {
  const chapterId = document.getElementById('editChapterId').value;
  if (!chapterId) { showToast('Bitte zuerst ein Kapitel speichern.', 'error'); return; }

  const type = document.getElementById('chapterContentAddType').value;
  const editId = document.getElementById('editChapterContentId').value;
  let content = '';

  if (type === 'image') {
    const fileInput = document.getElementById('chapterContentImageInput');
    if (fileInput.files.length) {
      btnLoading('saveChapterContentBtn', true);
      try {
        content = await uploadImage(fileInput.files[0], 'chapters');
      } catch (e) { showToast('Bild-Upload fehlgeschlagen.', 'error'); btnLoading('saveChapterContentBtn', false); return; }
    } else if (editId) {
      const existing = (state.cacheData.chapterContentBlocks || []).find(b => b.id === editId);
      content = existing?.content || '';
    } else {
      showToast('Bitte ein Bild auswählen.', 'error'); return;
    }
  } else if (type !== 'divider') {
    content = document.getElementById('chapterContentTextInput').value.trim();
    if (!content) { showToast('Bitte Inhalt eingeben.', 'error'); return; }
  }

  btnLoading('saveChapterContentBtn', true);
  try {
    const existing = (state.cacheData.chapterContentBlocks || []).filter(b => b.chapter_id === chapterId);
    const maxSort = Math.max(0, ...existing.map(b => b.sort_order ?? 0));
    const sortOrder = editId
      ? ((state.cacheData.chapterContentBlocks || []).find(b => b.id === editId)?.sort_order ?? maxSort + 1)
      : maxSort + 1;

    const obj = { chapter_id: chapterId, type, content: type === 'divider' ? '' : content, sort_order: sortOrder };
    if (editId) {
      const { error } = await sb.from('chapter_content').update(obj).eq('id', editId);
      if (error) throw error;
    } else {
      const { error } = await sb.from('chapter_content').insert(obj);
      if (error) throw error;
    }
    await loadAllData(); resetChapterContentForm(); renderAdminChapterContent(chapterId);
    showToast(editId ? 'Block aktualisiert.' : 'Block hinzugefügt.');
  } catch (e) { showToast(trDataErr(e, 'chapter_content'), 'error'); }
  finally { btnLoading('saveChapterContentBtn', false); }
}

export function editChapterContentBlock(id) {
  const b = (state.cacheData.chapterContentBlocks || []).find(x => x.id === id);
  if (!b) return;
  document.getElementById('chapterContentAddType').value = b.type;
  onChapterContentAddTypeChange();
  document.getElementById('editChapterContentId').value = id;
  if (b.type === 'image') {
    const preview = document.getElementById('chapterContentImagePreview');
    if (b.content) {
      preview.innerHTML = `<img src="${esc(b.content)}" alt="Vorschau">`;
      preview.classList.add('has-image');
    }
  } else {
    document.getElementById('chapterContentTextInput').value = b.content || '';
  }
  document.getElementById('saveChapterContentBtn').querySelector('.btn-text').textContent = 'Aktualisieren';
}

export async function deleteChapterContentBlock(id) {
  if (!confirm('Inhaltsblock löschen?')) return;
  const chapterId = document.getElementById('editChapterId').value;
  try {
    const block = (state.cacheData.chapterContentBlocks || []).find(b => b.id === id);
    if (block?.type === 'image' && block.content) await deleteImage(block.content);
    const { error } = await sb.from('chapter_content').delete().eq('id', id);
    if (error) throw error;
    await loadAllData(); renderAdminChapterContent(chapterId); showToast('Block gelöscht.');
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

export function resetChapterContentForm() {
  document.getElementById('editChapterContentId').value = '';
  document.getElementById('chapterContentAddType').value = 'heading';
  document.getElementById('chapterContentTextInput').value = '';
  const imgInput = document.getElementById('chapterContentImageInput');
  if (imgInput) imgInput.value = '';
  const imgPreview = document.getElementById('chapterContentImagePreview');
  if (imgPreview) {
    imgPreview.classList.remove('has-image');
    imgPreview.innerHTML = '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>';
  }
  onChapterContentAddTypeChange();
  document.getElementById('saveChapterContentBtn').querySelector('.btn-text').textContent = 'Hinzufügen';
}

export function renderAdminChapterContent(chapterId) {
  const chId = chapterId || document.getElementById('editChapterId').value;
  const blocks = (state.cacheData.chapterContentBlocks || []).filter(b => b.chapter_id === chId)
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  const el = document.getElementById('adminChapterContentList');
  if (!el) return;

  if (!blocks.length) { el.innerHTML = '<div class="empty-state">Noch keine Inhaltsblöcke. Füge Titel, Text, Bilder etc. hinzu.</div>'; return; }

  const typeLabels = { heading: 'Titel', subheading: 'Untertitel', text: 'Text', text_italic: 'Text kursiv', text_bold: 'Text fett', quote: 'Zitat', divider: 'Trennlinie', image: 'Bild' };
  const rows = blocks.map(item => {
    let preview = '';
    if (item.type === 'divider') preview = '· · ·';
    else if (item.type === 'image') preview = '<img src="' + esc(item.content || '') + '" style="height:32px;border-radius:4px;">';
    else preview = esc((item.content || '').substring(0, 60) + ((item.content || '').length > 60 ? '…' : ''));

    return `<tr draggable="true" data-id="${item.id}" data-table="chapter_content"><td><span class="drag-handle">⠿</span></td>` +
      `<td><span class="content-type-badge content-type-${item.type}">${typeLabels[item.type] || item.type}</span></td>` +
      `<td style="max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${preview}</td>` +
      `<td><div class="actions-cell"><button class="icon-btn" data-action="editChapterContentBlock" data-args='["${item.id}"]'>✎</button>` +
      `<button class="icon-btn delete" data-action="deleteChapterContentBlock" data-args='["${item.id}"]'>✕</button></div></td></tr>`;
  }).join('');

  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th style="width:40px;"></th><th>Typ</th><th>Inhalt</th><th style="text-align:right">Aktionen</th></tr></thead><tbody id="dragChapterContent">${rows}</tbody></table></div>`;
  initDragDrop('dragChapterContent', 'chapter_content');
}

export function renderAdminContent(exerciseId) {
  const exId = exerciseId || document.getElementById('editExerciseId').value;
  const blocks = (state.cacheData.contentBlocks || []).filter((b) => b.exercise_id === exId);
  const questions = state.cacheData.questions.filter((q) => q.exercise_id === exId);
  const el = document.getElementById('adminContentList');

  // Merge into one sorted list
  const items = [
    ...blocks.map((b) => ({ ...b, _kind: 'content' })),
    ...questions.map((q) => ({ ...q, _kind: 'question' })),
  ].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  if (!items.length) { el.innerHTML = '<div class="empty-state">Noch keine Elemente in dieser Übung.</div>'; return; }

  const typeLabels = { heading: 'Titel', text: 'Text', text_italic: 'Text kursiv', text_bold: 'Text fett', quote: 'Zitat', divider: 'Trennlinie' };
  const qTypeLabels = { text: 'Textfrage', choice: 'Single Choice', multichoice: 'Multi Choice', scale: 'Skala' };
  const rows = items.map((item) => {
    if (item._kind === 'content') {
      const preview = item.type === 'divider' ? '· · ·' : (item.content || '').substring(0, 60) + ((item.content || '').length > 60 ? '…' : '');
      return `<tr draggable="true" data-id="${item.id}" data-table="exercise_content"><td><span class="drag-handle">⠿</span></td>` +
        `<td><span class="content-type-badge content-type-${item.type}">${typeLabels[item.type] || item.type}</span></td>` +
        `<td style="max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(preview)}</td>` +
        `<td><div class="actions-cell"><button class="icon-btn" data-action="editContent" data-args='["${item.id}"]'>✎</button>` +
        `<button class="icon-btn delete" data-action="deleteContent" data-args='["${item.id}"]'>✕</button></div></td></tr>`;
    } else {
      const qPreview = (item.question || '').substring(0, 60) + ((item.question || '').length > 60 ? '…' : '');
      return `<tr draggable="true" data-id="${item.id}" data-table="questions"><td><span class="drag-handle">⠿</span></td>` +
        `<td><span class="content-type-badge" style="background:var(--accent-warm);color:white;">${qTypeLabels[item.type || 'text']}</span></td>` +
        `<td style="max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(qPreview)}</td>` +
        `<td><div class="actions-cell"><button class="icon-btn" data-action="editQuestion" data-args='["${item.id}"]'>✎</button>` +
        `<button class="icon-btn delete" data-action="deleteQuestion" data-args='["${item.id}"]'>✕</button></div></td></tr>`;
    }
  }).join('');

  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th style="width:40px;"></th><th>Typ</th><th>Inhalt</th><th style="text-align:right">Aktionen</th></tr></thead><tbody id="dragContent">${rows}</tbody></table></div>`;
  initMixedDragDrop('dragContent', exId);
}

export async function renderAdminUsers() {
  const el = document.getElementById('adminUsersList');
  el.innerHTML = '<div class="empty-state"><div class="spinner" style="margin-bottom:12px;"></div>User werden geladen …</div>';
  const { data: profiles, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { el.innerHTML = '<div class="empty-state">Fehler beim Laden der User.</div>'; return; }
  if (!profiles || !profiles.length) { el.innerHTML = '<div class="empty-state">Keine User gefunden.</div>'; return; }

  const rows = profiles.map((p) => {
    const emailSafe = esc(p.email || '—');
    const emailJson = esc(JSON.stringify(p.email || ''));
    return `<tr id="userRow-${p.id}">` +
      `<td><span class="user-status ${p.is_admin ? 'admin' : 'user'}"></span>${emailSafe}</td>` +
      `<td style="font-size:12px;color:var(--text-muted);">${new Date(p.created_at).toLocaleDateString('de-CH')}</td>` +
      `<td>${p.is_admin ? 'Admin' : 'User'}</td>` +
      `<td><div class="actions-cell">` +
        `<button class="icon-btn" data-action="showUserProgress" data-args='["${p.id}"]' title="Fortschritt">📊</button>` +
        `<button class="icon-btn" data-action="openSendMessageModal" data-args='["${p.id}",${emailJson}]' title="Nachricht">✉</button>` +
        `<button class="icon-btn" data-action="toggleAdmin" data-args='["${p.id}",${!p.is_admin}]'>${p.is_admin ? '↓ User' : '↑ Admin'}</button>` +
        (!p.is_admin ? `<button class="icon-btn delete" data-action="openAdminDeleteUserModal" data-args='["${p.id}",${emailJson}]' title="Löschen">✕</button>` : '') +
      `</div></td></tr>` +
      `<tr id="userDetail-${p.id}" class="user-detail-row" style="display:none;"><td colspan="4"><div id="userDetailContent-${p.id}" class="user-detail-content"></div></td></tr>`;
  }).join('');

  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>E-Mail</th><th>Registriert</th><th>Rolle</th><th style="text-align:right">Aktionen</th></tr></thead><tbody>${rows}</tbody></table></div>` +
    `<p style="font-size:12px;font-style:italic;color:var(--text-light);margin-top:8px;">${profiles.length} User insgesamt</p>`;
}

export async function toggleAdmin(userId, makeAdmin) {
  if (!confirm(makeAdmin ? 'User zum Admin machen?' : 'Admin-Rechte entziehen?')) return;
  try {
    const { error } = await sb.from('profiles').update({ is_admin: makeAdmin }).eq('id', userId);
    if (error) throw error;
    renderAdminUsers();
    showToast(makeAdmin ? 'Admin-Rechte vergeben.' : 'Admin-Rechte entzogen.');
  } catch (e) { showToast(trDataErr(e, 'save'), 'error'); }
}

// ── USER PROGRESS ──

export async function showUserProgress(userId) {
  const detailRow = document.getElementById('userDetail-' + userId);
  const detailContent = document.getElementById('userDetailContent-' + userId);
  if (!detailRow || !detailContent) return;

  // Toggle visibility
  if (detailRow.style.display !== 'none') {
    detailRow.style.display = 'none';
    return;
  }

  detailRow.style.display = '';
  detailContent.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="spinner" style="margin-bottom:8px;"></div>Fortschritt wird geladen …</div>';

  try {
    const { data, error } = await sb.rpc('admin_get_user_progress', { target_user_id: userId });
    if (error) { console.error('RPC error:', error); throw error; }

    const courseAccess = data?.course_access || [];
    const chapterProgress = data?.chapter_progress || [];
    const userAnswers = data?.answers || [];

    if (!courseAccess.length) {
      detailContent.innerHTML = '<p style="padding:16px;color:var(--text-muted);font-style:italic;">Keine Kurszugänge.</p>';
      return;
    }

    const courses = state.cacheData.courses;
    const chapters = state.cacheData.chapters;
    const exercises = state.cacheData.exercises;
    const questions = state.cacheData.questions || [];

    const courseCards = courseAccess.map(ca => {
      const course = courses.find(c => c.id === ca.course_id);
      if (!course) return '';

      const courseChapters = chapters.filter(ch => ch.course_id === course.id);
      const completedChapters = courseChapters.filter(ch =>
        chapterProgress.some(cp => cp.chapter_id === ch.id && cp.is_completed)
      );

      const courseExIds = exercises
        .filter(ex => courseChapters.some(ch => ch.id === ex.chapter_id))
        .map(ex => ex.id);
      const courseQIds = questions
        .filter(q => courseExIds.includes(q.exercise_id))
        .map(q => q.id);
      const answeredCount = userAnswers.filter(a => courseQIds.includes(a.question_id)).length;

      const chPct = courseChapters.length ? Math.round((completedChapters.length / courseChapters.length) * 100) : 0;
      const qPct = courseQIds.length ? Math.round((answeredCount / courseQIds.length) * 100) : 0;

      const accessLabel = ca.access_type === 'subscription' ? 'Abo' : ca.access_type === 'invite' ? 'Einladung' : 'Kauf';

      return `<div class="user-progress-course">
        <div class="user-progress-course-name">${esc(course.name)}</div>
        <div class="user-progress-stats">
          <div class="user-progress-stat">
            <span class="user-progress-label">Kapitel</span>
            <div class="user-progress-bar"><div class="user-progress-bar-fill" style="width:${chPct}%"></div></div>
            <span class="user-progress-value">${completedChapters.length}/${courseChapters.length}</span>
          </div>
          <div class="user-progress-stat">
            <span class="user-progress-label">Fragen</span>
            <div class="user-progress-bar"><div class="user-progress-bar-fill" style="width:${qPct}%"></div></div>
            <span class="user-progress-value">${answeredCount}/${courseQIds.length}</span>
          </div>
        </div>
        <span class="user-progress-access-type">${accessLabel}</span>
      </div>`;
    }).filter(Boolean).join('');

    detailContent.innerHTML = courseCards || '<p style="padding:16px;color:var(--text-muted);font-style:italic;">Keine Kurse gefunden.</p>';
  } catch (e) {
    console.error('Progress load error:', e);
    detailContent.innerHTML = '<p style="padding:16px;color:var(--accent-rose);">Fehler beim Laden des Fortschritts.</p>';
  }
}

// ── ADMIN DELETE USER ──

let _pendingDeleteUserId = null;
let _pendingDeleteUserEmail = null;

export function openAdminDeleteUserModal(userId, email) {
  _pendingDeleteUserId = userId;
  _pendingDeleteUserEmail = email;

  let overlay = document.getElementById('adminDeleteUserModal');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'adminDeleteUserModal';
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="modal">
    <button class="modal-close" data-action="closeAdminDeleteUserModal">&times;</button>
    <div class="modal-icon"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></div>
    <h2>User löschen?</h2>
    <p>Alle Daten von <strong>${esc(email)}</strong> werden unwiderruflich gelöscht — Antworten, Fortschritt, Kurszugänge, Journal-Einträge und der Account.</p>
    <p class="modal-confirm-label">Tippe die E-Mail-Adresse zur Bestätigung:</p>
    <input class="modal-confirm-input" id="adminDeleteUserConfirmInput" placeholder="${esc(email)}">
    <div class="modal-actions">
      <button class="btn btn-ghost btn-sm" data-action="closeAdminDeleteUserModal">Abbrechen</button>
      <button class="btn btn-primary btn-sm" id="adminDeleteUserConfirmBtn" disabled data-action="confirmAdminDeleteUser"><span class="btn-text">User löschen</span></button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.classList.add('active');
    const input = document.getElementById('adminDeleteUserConfirmInput');
    if (input) {
      input.focus();
      input.addEventListener('input', _onDeleteConfirmInput);
    }
  });
}

function _onDeleteConfirmInput() {
  const input = document.getElementById('adminDeleteUserConfirmInput');
  const btn = document.getElementById('adminDeleteUserConfirmBtn');
  if (!input || !btn) return;
  btn.disabled = input.value.trim().toLowerCase() !== (_pendingDeleteUserEmail || '').toLowerCase();
}

export function closeAdminDeleteUserModal() {
  const modal = document.getElementById('adminDeleteUserModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 200);
  }
  _pendingDeleteUserId = null;
  _pendingDeleteUserEmail = null;
}

async function invokeEdgeFunction(fnName, payload) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Nicht eingeloggt');
  console.log('Edge function call:', fnName, 'Token:', session.access_token?.substring(0, 20) + '...', 'Key:', SUPABASE_KEY?.substring(0, 20) + '...');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log(`Edge ${fnName} response ${res.status}:`, text);
  let data;
  try { data = JSON.parse(text); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || data.msg || data.message || `Fehler ${res.status}`);
  return data;
}

export async function confirmAdminDeleteUser() {
  if (!_pendingDeleteUserId) return;
  btnLoading('adminDeleteUserConfirmBtn', true);

  try {
    await invokeEdgeFunction('admin-delete-user', { targetUserId: _pendingDeleteUserId });
    closeAdminDeleteUserModal();
    showToast('User wurde gelöscht.');
    renderAdminUsers();
  } catch (e) {
    console.error('Admin delete error:', e);
    showToast('Fehler beim Löschen: ' + e.message, 'error');
    btnLoading('adminDeleteUserConfirmBtn', false);
  }
}

// ── SEND MESSAGE (EMAIL + IN-APP) ──

let _pendingMsgUserId = null;
let _pendingMsgUserEmail = null;

export function openSendMessageModal(userId, email) {
  _pendingMsgUserId = userId;
  _pendingMsgUserEmail = email;

  let overlay = document.getElementById('adminSendMessageModal');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'adminSendMessageModal';
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="modal" style="max-width:520px;text-align:left;">
    <button class="modal-close" data-action="closeSendMessageModal">&times;</button>
    <h2 style="margin-bottom:16px;">Nachricht an ${esc(email)}</h2>
    <div class="form-group" style="margin-bottom:12px;">
      <label class="form-label">Betreff (optional)</label>
      <input class="form-input" id="adminMsgSubject" type="text" maxlength="120" placeholder="Betreff">
    </div>
    <div class="form-group" style="margin-bottom:16px;">
      <label class="form-label">Nachricht</label>
      <textarea class="form-textarea" id="adminMsgBody" rows="5" maxlength="2000" placeholder="Deine Nachricht …" style="resize:vertical;"></textarea>
    </div>
    <p style="font-size:11px;color:var(--text-light);margin-bottom:16px;">Wird als E-Mail gesendet und als In-App Benachrichtigung gespeichert.</p>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-sm" data-action="closeSendMessageModal">Abbrechen</button>
      <button class="btn btn-primary btn-sm" id="adminSendMsgBtn" data-action="confirmSendMessage"><span class="btn-text">Senden</span></button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.classList.add('active');
    document.getElementById('adminMsgSubject')?.focus();
  });
}

export function closeSendMessageModal() {
  const modal = document.getElementById('adminSendMessageModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 200);
  }
  _pendingMsgUserId = null;
  _pendingMsgUserEmail = null;
}

export async function confirmSendMessage() {
  const body = document.getElementById('adminMsgBody')?.value?.trim();
  if (!body) { showToast('Bitte Nachricht eingeben.', 'error'); return; }

  const subject = document.getElementById('adminMsgSubject')?.value?.trim() || '';
  btnLoading('adminSendMsgBtn', true);

  try {
    const data = await invokeEdgeFunction('send-user-email', {
      to: _pendingMsgUserEmail,
      targetUserId: _pendingMsgUserId,
      subject: subject || undefined,
      message: body,
    });

    closeSendMessageModal();
    const emailInfo = data?.emailSent ? 'E-Mail gesendet' : 'Benachrichtigung gespeichert (kein E-Mail-Service)';
    showToast(emailInfo + '.');
  } catch (e) {
    console.error('Send message error:', e);
    showToast('Fehler beim Senden: ' + e.message, 'error');
    btnLoading('adminSendMsgBtn', false);
  }
}

// ══════════════════════════════════════
// ADMIN: SELECTS
// ══════════════════════════════════════

export function populateCourseSelects() {
  const courses = state.cacheData.courses;
  const opts = '<option value="">— Kurs wählen —</option>' +
    courses.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  document.getElementById('chapterCourseSelect').innerHTML = opts;
  document.getElementById('exerciseCourseFilter').innerHTML = opts;
  updateExerciseChapterSelect();
}

export function updateExerciseChapterSelect() {
  const cid = document.getElementById('exerciseCourseFilter').value;
  const chs = state.cacheData.chapters.filter((ch) => !cid || ch.course_id === cid);
  document.getElementById('exerciseChapterSelect').innerHTML =
    '<option value="">— Kapitel wählen —</option>' +
    chs.map((ch) => `<option value="${ch.id}">${esc(ch.name)}</option>`).join('');
}

// ══════════════════════════════════════
// ADMIN: TYPOGRAPHY SETTINGS
// ══════════════════════════════════════

const GOOGLE_FONTS = [
  'Marcellus', 'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville',
  'Lora', 'EB Garamond', 'Crimson Text', 'Merriweather', 'DM Serif Display',
  'PT Serif', 'Source Serif Pro', 'Noto Serif', 'Spectral', 'Literata',
  'Inter', 'Work Sans', 'Nunito', 'Open Sans', 'Lato', 'Raleway',
];

const TYPO_LEVELS = ['h1','h2','h3','h4','h5','p1','p2','p3'];

function getTypoValues() {
  const typo = {
    fontHeading: document.getElementById('typoHeadingFont').value,
    fontBody: document.getElementById('typoBodyFont').value,
  };
  TYPO_LEVELS.forEach(lv => {
    typo[lv] = document.getElementById('typo' + lv.toUpperCase()).value;
    typo[lv + 'Color'] = document.getElementById('typo' + lv.toUpperCase() + 'Color').value;
    typo[lv + 'Style'] = document.getElementById('typo' + lv.toUpperCase() + 'Style').value;
    typo[lv + 'Pt'] = document.getElementById('typo' + lv.toUpperCase() + 'Pt')?.value || '0';
    typo[lv + 'Pb'] = document.getElementById('typo' + lv.toUpperCase() + 'Pb')?.value || '0';
  });
  return typo;
}

export async function loadTypographyEditor() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'typography').single();
    if (data?.value) {
      const typo = JSON.parse(data.value);
      document.getElementById('typoHeadingFont').value = typo.fontHeading || 'Marcellus';
      document.getElementById('typoBodyFont').value = typo.fontBody || 'PT Serif';

      const defaults = {
        h1: { size:'4', color:'#1a1a1a', style:'normal' },
        h2: { size:'2.8', color:'#1a1a1a', style:'normal' },
        h3: { size:'2.2', color:'#1a1a1a', style:'normal' },
        h4: { size:'1.4', color:'#1a1a1a', style:'normal' },
        h5: { size:'1.1', color:'#1a1a1a', style:'normal' },
        p1: { size:'1.4', color:'#1a1a1a', style:'normal' },
        p2: { size:'1.1', color:'#6b6b6b', style:'italic' },
        p3: { size:'0.8', color:'#999999', style:'italic' },
      };

      TYPO_LEVELS.forEach(lv => {
        const d = defaults[lv];
        document.getElementById('typo' + lv.toUpperCase()).value = typo[lv] || d.size;
        document.getElementById('typo' + lv.toUpperCase() + 'Color').value = typo[lv + 'Color'] || d.color;
        document.getElementById('typo' + lv.toUpperCase() + 'Style').value = typo[lv + 'Style'] || d.style;
        document.getElementById('typo' + lv.toUpperCase() + 'Pt').value = typo[lv + 'Pt'] || '0';
        document.getElementById('typo' + lv.toUpperCase() + 'Pb').value = typo[lv + 'Pb'] || '0';
      });
    }
  } catch (e) { /* defaults used */ }
}

export async function saveTypography() {
  const typo = getTypoValues();
  btnLoading('saveTypoBtn', true);
  try {
    const { error } = await sb.from('settings').upsert(
      { key: 'typography', value: JSON.stringify(typo) },
      { onConflict: 'key' }
    );
    if (error) throw error;
    applyTypography(typo);
    showToast('Typografie gespeichert.');
  } catch (e) { showToast(trDataErr(e, 'save'), 'error'); }
  finally { btnLoading('saveTypoBtn', false); }
}

export function applyTypography(typo) {
  if (!typo) return;
  const r = document.documentElement.style;

  // Load Google Font if changed — all weights
  const loadFont = (name) => {
    const id = 'gfont-' + name.replace(/\s/g, '-');
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap`;
      document.head.appendChild(link);
    }
  };

  if (typo.fontHeading) {
    loadFont(typo.fontHeading);
    r.setProperty('--font-heading', `'${typo.fontHeading}', serif`);
  }
  if (typo.fontBody) {
    loadFont(typo.fontBody);
    r.setProperty('--font-body', `'${typo.fontBody}', serif`);
  }

  const parseStyle = (s) => {
    // Backwards compat: normal→400, italic→400i, bold→700, bold-italic→700i
    // New: 300, 300i, 500, 500i, 600, 600i
    const map = { 'normal':'400', 'italic':'400i', 'bold':'700', 'bold-italic':'700i' };
    const v = map[s] || s || '400';
    const isItalic = v.endsWith('i');
    const weight = isItalic ? v.slice(0, -1) : v;
    return { weight, italic: isItalic };
  };

  TYPO_LEVELS.forEach(lv => {
    if (typo[lv]) r.setProperty('--font-size-' + lv, typo[lv] + 'rem');
    if (typo[lv + 'Color']) r.setProperty('--font-color-' + lv, typo[lv + 'Color']);
    const style = typo[lv + 'Style'];
    if (style) {
      const { weight, italic } = parseStyle(style);
      r.setProperty('--font-style-' + lv, italic ? 'italic' : 'normal');
      r.setProperty('--font-weight-' + lv, weight);
    }
    if (typo[lv + 'Pt']) r.setProperty('--font-pt-' + lv, typo[lv + 'Pt'] + 'px');
    if (typo[lv + 'Pb']) r.setProperty('--font-pb-' + lv, typo[lv + 'Pb'] + 'px');
  });

  // Update preview if visible
  TYPO_LEVELS.forEach(lv => {
    const el = document.querySelector('.typo-preview-' + lv);
    if (el) {
      if (typo[lv + 'Color']) el.style.color = typo[lv + 'Color'];
      const style = typo[lv + 'Style'];
      if (style) {
        const { weight, italic } = parseStyle(style);
        el.style.fontStyle = italic ? 'italic' : 'normal';
        el.style.fontWeight = weight;
      }
    }
  });
}

export async function loadAndApplyTypography() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'typography').single();
    if (data?.value) applyTypography(JSON.parse(data.value));
  } catch (e) { /* defaults */ }
}

export function previewTypography() {
  const typo = getTypoValues();
  applyTypography(typo);
  showToast('Vorschau aktiv — Änderungen noch nicht gespeichert.');
}

// ══════════════════════════════════════
// ADMIN: JOURNAL IMPULSES
// ══════════════════════════════════════

const DEFAULT_JOURNAL_IMPULSES = [
  { fromChapter: 1, toChapter: 4, phase: 'Verstehen', text: 'Was habe ich heute bemerkt?' },
  { fromChapter: 5, toChapter: 7, phase: 'Vertiefen', text: 'Gab es heute einen Moment, in dem mein Körper etwas gezeigt hat?' },
  { fromChapter: 8, toChapter: 9, phase: 'Muster', text: 'Habe ich heute ein altes Muster erkannt — ohne es sofort ändern zu wollen?' },
  { fromChapter: 10, toChapter: 99, phase: 'Integration', text: 'Was habe ich mir heute erlaubt?' },
];

let journalImpulseRows = [];

export async function loadJournalImpulseEditor() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'journal_impulses').single();
    if (data?.value) {
      journalImpulseRows = JSON.parse(data.value);
    } else {
      journalImpulseRows = [...DEFAULT_JOURNAL_IMPULSES];
    }
  } catch (e) {
    journalImpulseRows = [...DEFAULT_JOURNAL_IMPULSES];
  }
  renderJournalImpulseRows();
}

function renderJournalImpulseRows() {
  const container = document.getElementById('journalImpulsesList');
  if (!container) return;

  if (!journalImpulseRows.length) {
    container.innerHTML = '<div class="empty-state">Keine Impulse definiert.</div>';
    return;
  }

  container.innerHTML = journalImpulseRows.map((row, i) => `
    <div class="journal-impulse-row" style="padding:16px;background:var(--card);border-radius:8px;border:1px solid var(--border-light);margin-bottom:12px;">
      <div class="form-row" style="gap:12px;margin-bottom:8px;">
        <div class="form-group" style="flex:1;"><label class="form-label">Phase</label><input class="form-input" value="${esc(row.phase || '')}" data-change="updateJournalImpulse" data-args='[${i},"phase"]' data-val placeholder="z.B. Verstehen"></div>
        <div class="form-group" style="width:90px;"><label class="form-label">Von Kap.</label><input class="form-input" type="number" min="1" value="${row.fromChapter || 1}" data-change="updateJournalImpulse" data-args='[${i},"fromChapter"]' data-val></div>
        <div class="form-group" style="width:90px;"><label class="form-label">Bis Kap.</label><input class="form-input" type="number" min="1" value="${row.toChapter || 99}" data-change="updateJournalImpulse" data-args='[${i},"toChapter"]' data-val></div>
        <div style="display:flex;align-items:end;padding-bottom:4px;"><button class="icon-btn delete" data-action="removeJournalImpulseRow" data-args='[${i}]' title="Entfernen">✕</button></div>
      </div>
      <div class="form-group"><label class="form-label">Impuls-Text</label><input class="form-input" value="${esc(row.text || '')}" data-change="updateJournalImpulse" data-args='[${i},"text"]' data-val placeholder="Was habe ich heute bemerkt?"></div>
    </div>
  `).join('');
}

export function addJournalImpulseRow() {
  journalImpulseRows.push({ fromChapter: 1, toChapter: 99, phase: '', text: '' });
  renderJournalImpulseRows();
}

export function removeJournalImpulseRow(index) {
  journalImpulseRows.splice(index, 1);
  renderJournalImpulseRows();
}

export function updateJournalImpulse(index, field, value) {
  if (!journalImpulseRows[index]) return;
  if (field === 'fromChapter' || field === 'toChapter') {
    journalImpulseRows[index][field] = parseInt(value, 10) || 1;
  } else {
    journalImpulseRows[index][field] = value;
  }
}

export async function saveJournalImpulses() {
  btnLoading('saveImpulsesBtn', true);
  try {
    const { error } = await sb.from('settings').upsert(
      { key: 'journal_impulses', value: JSON.stringify(journalImpulseRows) },
      { onConflict: 'key' }
    );
    if (error) throw error;

    // Clear cache in journal module
    if (window.__clearImpulseCache) window.__clearImpulseCache();

    showToast('Impulse gespeichert.');
  } catch (e) { showToast(trDataErr(e, 'save'), 'error'); }
  finally { btnLoading('saveImpulsesBtn', false); }
}

// ══════════════════════════════════════
// ADMIN: MESSAGES (Kontakt)
// ══════════════════════════════════════

let cachedMessages = [];
let currentMessageFilter = 'all';

export async function loadAdminMessages() {
  try {
    const { data, error } = await sb
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    cachedMessages = data || [];
  } catch (e) {
    console.error('Messages load error:', e);
    cachedMessages = [];
  }
  renderAdminMessages();
}

export function filterMessages(type) {
  currentMessageFilter = type;

  // Update active button
  document.querySelectorAll('#messagesFilter .checkin-range-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase() === type ||
      (type === 'all' && btn.textContent === 'Alle') ||
      (type === 'question' && btn.textContent === 'Fragen') ||
      (type === 'topic' && btn.textContent === 'Themen') ||
      (type === 'contact' && btn.textContent === 'Kontakt'));
  });

  renderAdminMessages();
}

function renderAdminMessages() {
  const container = document.getElementById('adminMessagesList');
  if (!container) return;

  const filtered = currentMessageFilter === 'all'
    ? cachedMessages
    : cachedMessages.filter(m => m.type === currentMessageFilter);

  if (!filtered.length) {
    container.innerHTML = '<p style="font-style:italic;color:var(--text-light);padding:20px 0;">Keine Nachrichten vorhanden.</p>';
    return;
  }

  const typeLabels = { question: 'Frage', topic: 'Themenvorschlag', contact: 'Kontakt' };
  const typeColors = { question: 'var(--accent-olive)', topic: 'var(--accent-warm)', contact: 'var(--text-muted)' };

  container.innerHTML = filtered.map(m => {
    const d = new Date(m.created_at);
    const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const email = m.sender_email || 'Unbekannt';
    const label = typeLabels[m.type] || m.type;
    const color = typeColors[m.type] || 'var(--text-muted)';

    return `
      <div class="admin-message-card">
        <div class="admin-message-header">
          <span class="admin-message-type" style="color:${color};">${esc(label)}</span>
          <span class="admin-message-date">${esc(dateStr)}</span>
        </div>
        <div class="admin-message-sender">${esc(email)}</div>
        ${m.subject ? `<div class="admin-message-subject">${esc(m.subject)}</div>` : ''}
        <div class="admin-message-body">${esc(m.message)}</div>
        <div class="admin-message-actions">
          <button class="btn btn-ghost btn-sm" data-action="deleteMessage" data-args='["${m.id}"]'>Löschen</button>
        </div>
      </div>`;
  }).join('');
}

export async function deleteMessage(id) {
  if (!confirm('Nachricht wirklich löschen?')) return;
  try {
    const { error } = await sb.from('contact_messages').delete().eq('id', id);
    if (error) throw error;
    cachedMessages = cachedMessages.filter(m => m.id !== id);
    renderAdminMessages();
    showToast('Nachricht gelöscht.');
  } catch (e) {
    showToast(trDataErr(e, 'delete'), 'error');
  }
}

// ══════════════════════════════════════
// ADMIN: WEEKLY IMPULSES
// ══════════════════════════════════════

export async function loadWeeklyImpulseEditor() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'weekly_impulses').single();
    if (data?.value) {
      const impulses = JSON.parse(data.value);
      const phase1 = impulses.filter(i => i.phase === 1).map(i => i.text).join('\n');
      const phase2 = impulses.filter(i => i.phase === 2).map(i => i.text).join('\n');
      const phase3 = impulses.filter(i => i.phase === 3).map(i => i.text).join('\n');
      document.getElementById('weeklyImpulsesPhase1').value = phase1;
      document.getElementById('weeklyImpulsesPhase2').value = phase2;
      document.getElementById('weeklyImpulsesPhase3').value = phase3;
      return;
    }
  } catch (e) { /* use defaults below */ }

  // Load defaults into textareas
  const { DEFAULT_IMPULSES } = await import('./weeklyimpulse.js');
  if (DEFAULT_IMPULSES) {
    document.getElementById('weeklyImpulsesPhase1').value = DEFAULT_IMPULSES.filter(i => i.phase === 1).map(i => i.text).join('\n');
    document.getElementById('weeklyImpulsesPhase2').value = DEFAULT_IMPULSES.filter(i => i.phase === 2).map(i => i.text).join('\n');
    document.getElementById('weeklyImpulsesPhase3').value = DEFAULT_IMPULSES.filter(i => i.phase === 3).map(i => i.text).join('\n');
  }
}

export async function saveWeeklyImpulses() {
  const parse = (textareaId, phase) => {
    const text = document.getElementById(textareaId)?.value || '';
    return text.split('\n').map(l => l.trim()).filter(Boolean).map(t => ({ text: t, phase }));
  };

  const impulses = [
    ...parse('weeklyImpulsesPhase1', 1),
    ...parse('weeklyImpulsesPhase2', 2),
    ...parse('weeklyImpulsesPhase3', 3),
  ];

  btnLoading('saveWeeklyImpulsesBtn', true);
  try {
    const { error } = await sb.from('settings').upsert(
      { key: 'weekly_impulses', value: JSON.stringify(impulses) },
      { onConflict: 'key' }
    );
    if (error) throw error;
    if (window.__clearWeeklyImpulseCache) window.__clearWeeklyImpulseCache();
    showToast(`${impulses.length} Impulse gespeichert.`);
  } catch (e) { showToast(trDataErr(e, 'save'), 'error'); }
  finally { btnLoading('saveWeeklyImpulsesBtn', false); }
}

// ══════════════════════════════════════
// ADMIN: CHECK-IN QUESTIONS
// ══════════════════════════════════════

const DEFAULT_CHECKIN_QUESTIONS = [
  {
    id: 'q1', text: 'Heute habe ich …', type: 'single',
    options: [
      { label: '… spüren können, wie es mir geht', color: '#4caf50' },
      { label: '… funktioniert, ohne viel zu spüren', color: '#f0c431' },
      { label: '… vor allem für andere gesorgt', color: '#ef8c2f' },
      { label: '… gar nicht bei mir sein können', color: '#e05555' },
    ],
  },
  {
    id: 'q2', text: 'Meine Energie war heute …', type: 'single',
    options: [
      { label: '… da', color: '#4caf50' },
      { label: '… knapp, aber es ging', color: '#f0c431' },
      { label: '… weniger als ich gebraucht hätte', color: '#ef8c2f' },
      { label: '… seit dem Aufwachen aufgebraucht', color: '#e05555' },
    ],
  },
  {
    id: 'q3', text: 'Was hat heute am meisten Energie gekostet?', type: 'multi',
    options: [
      { label: 'Arbeit' }, { label: 'Entscheidungen' }, { label: 'Emotionale Arbeit' },
      { label: 'Körper' }, { label: 'Alles' }, { label: 'Nichts Bestimmtes' },
    ],
  },
];

let checkinQRows = [];

export async function loadCheckinEditor() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'checkin_questions').single();
    if (data?.value) {
      checkinQRows = JSON.parse(data.value);
    } else {
      checkinQRows = JSON.parse(JSON.stringify(DEFAULT_CHECKIN_QUESTIONS));
    }
  } catch (e) {
    checkinQRows = JSON.parse(JSON.stringify(DEFAULT_CHECKIN_QUESTIONS));
  }
  renderCheckinQRows();
}

function renderCheckinQRows() {
  const container = document.getElementById('checkinQuestionsList');
  if (!container) return;

  container.innerHTML = checkinQRows.map((q, qi) => {
    const typeLabel = q.type === 'multi' ? 'Multiple Choice' : 'Single Choice (Farbskala)';
    const optionsHtml = (q.options || []).map((opt, oi) => `
      <div class="form-row" style="gap:8px;margin-bottom:4px;align-items:center;">
        ${q.type !== 'multi' ? `<input class="form-input color-input" type="color" value="${opt.color || '#999'}" data-change="updateCheckinOption" data-args='[${qi},${oi},"color"]' data-val style="width:44px;flex:none;">` : ''}
        <input class="form-input" value="${esc(opt.label || '')}" data-change="updateCheckinOption" data-args='[${qi},${oi},"label"]' data-val placeholder="Antwort-Text" style="flex:1;">
        <button class="icon-btn delete" data-action="removeCheckinOption" data-args='[${qi},${oi}]' title="Entfernen">✕</button>
      </div>
    `).join('');

    return `
      <div style="padding:16px;background:var(--card);border-radius:8px;border:1px solid var(--border-light);margin-bottom:12px;">
        <div class="form-row" style="gap:12px;margin-bottom:8px;">
          <div class="form-group" style="flex:1;"><label class="form-label">Frage</label><input class="form-input" value="${esc(q.text || '')}" data-change="updateCheckinQ" data-args='[${qi},"text"]' data-val></div>
          <div class="form-group" style="width:180px;">
            <label class="form-label">Typ</label>
            <select class="form-input" data-change="updateCheckinQ" data-args='[${qi},"type"]' data-val>
              <option value="single" ${q.type === 'single' ? 'selected' : ''}>Single (Farbskala)</option>
              <option value="multi" ${q.type === 'multi' ? 'selected' : ''}>Multiple Choice</option>
            </select>
          </div>
          <div style="display:flex;align-items:end;padding-bottom:4px;"><button class="icon-btn delete" data-action="removeCheckinQ" data-args='[${qi}]' title="Frage entfernen">✕</button></div>
        </div>
        <div style="font-style:italic;color:var(--text-light);font-size:var(--font-size-p3);margin-bottom:6px;">${typeLabel} — Antworten:</div>
        ${optionsHtml}
        <button class="btn btn-ghost btn-sm" data-action="addCheckinOption" data-args='[${qi}]' style="margin-top:4px;">+ Antwort</button>
      </div>`;
  }).join('');
}

export function addCheckinQuestion() {
  checkinQRows.push({ id: 'q' + (checkinQRows.length + 1), text: '', type: 'single', options: [] });
  renderCheckinQRows();
}

export function removeCheckinQ(qi) {
  checkinQRows.splice(qi, 1);
  renderCheckinQRows();
}

export function updateCheckinQ(qi, field, value) {
  if (checkinQRows[qi]) checkinQRows[qi][field] = value;
  if (field === 'type') renderCheckinQRows(); // re-render to show/hide color pickers
}

export function addCheckinOption(qi) {
  if (!checkinQRows[qi]) return;
  const isMulti = checkinQRows[qi].type === 'multi';
  checkinQRows[qi].options.push(isMulti ? { label: '' } : { label: '', color: '#999' });
  renderCheckinQRows();
}

export function removeCheckinOption(qi, oi) {
  if (!checkinQRows[qi]?.options) return;
  checkinQRows[qi].options.splice(oi, 1);
  renderCheckinQRows();
}

export function updateCheckinOption(qi, oi, field, value) {
  if (!checkinQRows[qi]?.options?.[oi]) return;
  checkinQRows[qi].options[oi][field] = value;
}

export async function saveCheckinQuestions() {
  btnLoading('saveCheckinQBtn', true);
  try {
    const { error } = await sb.from('settings').upsert(
      { key: 'checkin_questions', value: JSON.stringify(checkinQRows) },
      { onConflict: 'key' }
    );
    if (error) throw error;
    if (window.__clearCheckinCache) window.__clearCheckinCache();
    showToast('Check-In Fragen gespeichert.');
  } catch (e) { showToast(trDataErr(e, 'save'), 'error'); }
  finally { btnLoading('saveCheckinQBtn', false); }
}

// ══════════════════════════════════════
// ADMIN: COLORS
// ══════════════════════════════════════

const COLOR_FIELDS = {
  light: {
    bg: 'colorLightBg', beige: 'colorLightBeige', card: 'colorLightCard',
    text: 'colorLightText', textMuted: 'colorLightTextMuted', textLight: 'colorLightTextLight',
    border: 'colorLightBorder', borderLight: 'colorLightBorderLight', line: 'colorLightLine',
    accentDark: 'colorLightAccentDark', accentWarm: 'colorLightAccentWarm',
    accentOlive: 'colorLightAccentOlive', accentRose: 'colorLightAccentRose',
    navBg: 'colorLightNavBg', navText: 'colorLightNavText', navActive: 'colorLightNavActive',
  },
  dark: {
    bg: 'colorDarkBg', beige: 'colorDarkBeige', card: 'colorDarkCard',
    text: 'colorDarkText', textMuted: 'colorDarkTextMuted', textLight: 'colorDarkTextLight',
    border: 'colorDarkBorder', borderLight: 'colorDarkBorderLight', line: 'colorDarkLine',
    accentDark: 'colorDarkAccentDark', accentWarm: 'colorDarkAccentWarm',
    accentOlive: 'colorDarkAccentOlive', accentRose: 'colorDarkAccentRose',
    navBg: 'colorDarkNavBg', navText: 'colorDarkNavText', navActive: 'colorDarkNavActive',
  },
};

const COLOR_DEFAULTS = {
  light: {
    bg: '#C4A99B', beige: '#d1b9ad', card: '#EDE6E2',
    text: '#3B3937', textMuted: '#6b6664', textLight: '#8a8280',
    border: '#d8cfc9', borderLight: '#e0d9d4', line: '#d8cfc9',
    accentDark: '#C4A99B', accentWarm: '#C4A99B',
    accentOlive: '#6b7c5e', accentRose: '#b07a7a',
    navBg: '#EDE6E2', navText: '#6b6664', navActive: '#C4A99B',
  },
  dark: {
    bg: '#1a1816', beige: '#242220', card: '#2a2826',
    text: '#e8e2da', textMuted: '#a09888', textLight: '#706860',
    border: '#3a3632', borderLight: '#322e2a', line: '#3a3632',
    accentDark: '#c8b8a0', accentWarm: '#c8a070',
    accentOlive: '#8ca078', accentRose: '#c08888',
    navBg: '#2a2826', navText: '#a09888', navActive: '#c8b8a0',
  },
};

function readColorForm() {
  const colors = { light: {}, dark: {} };
  for (const mode of ['light', 'dark']) {
    for (const [key, id] of Object.entries(COLOR_FIELDS[mode])) {
      const el = document.getElementById(id);
      colors[mode][key] = el ? el.value : COLOR_DEFAULTS[mode][key];
    }
  }
  return colors;
}

export async function loadColorEditor() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'colors').single();
    if (data?.value) {
      const colors = JSON.parse(data.value);
      for (const mode of ['light', 'dark']) {
        if (!colors[mode]) continue;
        for (const [key, id] of Object.entries(COLOR_FIELDS[mode])) {
          const el = document.getElementById(id);
          if (el && colors[mode][key]) el.value = colors[mode][key];
        }
      }
    }
  } catch (e) { /* defaults used */ }
}

export async function saveColors() {
  const colors = readColorForm();
  btnLoading('saveColorsBtn', true);
  try {
    const { error } = await sb.from('settings').upsert(
      { key: 'colors', value: JSON.stringify(colors) },
      { onConflict: 'key' }
    );
    if (error) throw error;
    applyColors(colors);
    injectDarkColorOverrides(colors);
    showToast('Farben gespeichert.');
  } catch (e) { showToast(trDataErr(e, 'save'), 'error'); }
  finally { btnLoading('saveColorsBtn', false); }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)].join(',');
}

const COLOR_VAR_MAP = {
  bg: '--bg', beige: '--beige', card: '--card',
  text: '--text', textMuted: '--text-muted', textLight: '--text-light',
  border: '--border', borderLight: '--border-light', line: '--line',
  accentDark: '--accent-dark', accentWarm: '--accent-warm',
  accentOlive: '--accent-olive', accentRose: '--accent-rose',
  navBg: '--nav-bg', navText: '--nav-text', navActive: '--nav-active',
};

export function applyColors(colors) {
  if (!colors) return;
  const isDark = document.body.classList.contains('dark');
  const mode = isDark ? 'dark' : 'light';
  const vals = colors[mode];
  if (!vals) return;

  const r = document.documentElement.style;
  for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
    if (vals[key]) r.setProperty(cssVar, vals[key]);
  }
  if (vals.text) {
    const rgb = hexToRgb(vals.text);
    r.setProperty('--shadow', `rgba(${rgb},0.06)`);
    r.setProperty('--shadow-lg', `rgba(${rgb},0.12)`);
  }
  window.__klarColors = colors;
}

export async function loadAndApplyColors() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'colors').single();
    if (data?.value) {
      const colors = JSON.parse(data.value);
      applyColors(colors);
      injectDarkColorOverrides(colors);
    }
  } catch (e) { /* defaults */ }
}

function injectDarkColorOverrides(colors) {
  if (!colors) return;
  const id = 'klarzeit-color-overrides';
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }

  const lines = [];

  const l = colors.light;
  if (l) {
    lines.push(':root {');
    for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
      if (l[key]) lines.push(`  ${cssVar}: ${l[key]};`);
    }
    if (l.text) {
      const rgb = hexToRgb(l.text);
      lines.push(`  --shadow: rgba(${rgb},0.06);`);
      lines.push(`  --shadow-lg: rgba(${rgb},0.12);`);
    }
    lines.push('}');
  }

  const d = colors.dark;
  if (d) {
    lines.push('body.dark {');
    for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
      if (d[key]) lines.push(`  ${cssVar}: ${d[key]};`);
    }
    if (d.text) {
      const rgb = hexToRgb(d.text);
      lines.push(`  --shadow: rgba(${rgb},0.2);`);
      lines.push(`  --shadow-lg: rgba(${rgb},0.3);`);
    }
    lines.push('}');
  }

  style.textContent = lines.join('\n');
}

export function previewColors() {
  const colors = readColorForm();
  applyColors(colors);
  injectDarkColorOverrides(colors);
  showToast('Vorschau aktiv — Änderungen noch nicht gespeichert.');
}

// ══════════════════════════════════════
// IMAGE UPLOAD HELPERS
// ══════════════════════════════════════

export function updateImagePreview(previewId, url) {
  const el = document.getElementById(previewId);
  if (!el) return;
  if (url) {
    const removeFn = previewId.includes('course') ? 'removeCourseImage'
      : previewId.includes('chapter') ? 'removeChapterImage'
      : 'removeLoginBgImage';
    el.innerHTML = `<img src="${esc(url)}" alt="Vorschau"><button class="image-remove-btn" data-action="${removeFn}" data-stop title="Bild entfernen">✕</button>`;
    el.classList.add('has-image');
  } else {
    el.innerHTML = '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>';
    el.classList.remove('has-image');
  }
}

export function initImageUploadZones() {
  [['courseImagePreview', 'courseImageInput'], ['chapterImagePreview', 'chapterImageInput'], ['loginBgPreview', 'loginBgInput']].forEach(([zoneId, inputId]) => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--text-muted)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const input = document.getElementById(inputId);
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        handleImageFileSelect(inputId, zoneId);
      }
    });
  });
}

export function handleImageFileSelect(inputId, previewId) {
  const fileInput = document.getElementById(inputId);
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const el = document.getElementById(previewId);
    el.innerHTML = `<img src="${e.target.result}" alt="Vorschau"><button class="image-remove-btn" data-action="remove${previewId.includes('course') ? 'Course' : 'Chapter'}Image" data-stop title="Bild entfernen">✕</button>`;
    el.classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

export function removeCourseImage() {
  document.getElementById('courseImageUrl').value = '';
  document.getElementById('courseImageInput').value = '';
  updateImagePreview('courseImagePreview', null);
}

export function removeChapterImage() {
  document.getElementById('chapterImageUrl').value = '';
  document.getElementById('chapterImageInput').value = '';
  updateImagePreview('chapterImagePreview', null);
}

export async function saveLoginBg() {
  btnLoading('saveLoginBgBtn', true);
  try {
    let url = document.getElementById('loginBgUrl').value || '';
    const fileInput = document.getElementById('loginBgInput');
    if (fileInput.files.length) {
      // Delete old image if exists
      const { data: old } = await sb.from('settings').select('value').eq('key', 'login_bg').single();
      if (old?.value) await deleteImage(old.value);
      url = await uploadImage(fileInput.files[0], 'login');
    }
    const { error } = await sb.from('settings').upsert({ key: 'login_bg', value: url }, { onConflict: 'key' });
    if (error) throw error;
    document.getElementById('loginBgUrl').value = url;
    // Update auth bg immediately
    const authBg = document.getElementById('authBg');
    if (authBg && url) authBg.style.backgroundImage = `url(${url})`;
    showToast('Login-Hintergrund gespeichert.');
  } catch (e) { console.error(e); showToast(trDataErr(e, 'save'), 'error'); }
  finally { btnLoading('saveLoginBgBtn', false); }
}

export function removeLoginBgImage() {
  document.getElementById('loginBgUrl').value = '';
  document.getElementById('loginBgInput').value = '';
  updateImagePreview('loginBgPreview', null);
}

// ══════════════════════════════════════
// DRAG & DROP (unchanged)
// ══════════════════════════════════════

function initDragDrop(tbodyId, table) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  let dragRow = null;

  tbody.querySelectorAll('tr[draggable]').forEach((row) => {
    row.addEventListener('dragstart', (e) => {
      dragRow = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      dragRow = null;
      tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (row !== dragRow) row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => { row.classList.remove('drag-over'); });
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (!dragRow || dragRow === row) return;

      const rows = Array.from(tbody.querySelectorAll('tr'));
      const fromIdx = rows.indexOf(dragRow);
      const toIdx = rows.indexOf(row);
      if (fromIdx < toIdx) row.after(dragRow); else row.before(dragRow);

      const newRows = Array.from(tbody.querySelectorAll('tr'));
      const updates = newRows.map((r, i) => ({ id: r.dataset.id, sort_order: i }));
      for (const u of updates) {
        await sb.from(table).update({ sort_order: u.sort_order }).eq('id', u.id);
      }
      await loadAllData();
      showToast('Reihenfolge aktualisiert.');
    });
  });
}

// Mixed drag-drop: rows can belong to different tables (data-table attribute per row)
function initMixedDragDrop(tbodyId, exerciseId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  let dragRow = null;

  tbody.querySelectorAll('tr[draggable]').forEach((row) => {
    row.addEventListener('dragstart', (e) => {
      dragRow = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      dragRow = null;
      tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (row !== dragRow) row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => { row.classList.remove('drag-over'); });
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (!dragRow || dragRow === row) return;

      const rows = Array.from(tbody.querySelectorAll('tr'));
      const fromIdx = rows.indexOf(dragRow);
      const toIdx = rows.indexOf(row);
      if (fromIdx < toIdx) row.after(dragRow); else row.before(dragRow);

      const newRows = Array.from(tbody.querySelectorAll('tr'));
      for (let i = 0; i < newRows.length; i++) {
        const r = newRows[i];
        const tbl = r.dataset.table;
        await sb.from(tbl).update({ sort_order: i }).eq('id', r.dataset.id);
      }
      await loadAllData();
      renderAdminContent(exerciseId);
      showToast('Reihenfolge aktualisiert.');
    });
  });
}

// ══════════════════════════════════════
// ADMIN: ONBOARDING EDITOR (unchanged)
// ══════════════════════════════════════

let onboardElements = [];

async function loadOnboardingEditor() {
  const { loadOnboardingData, getOnboardingData } = await import('./onboarding.js');
  await loadOnboardingData();
  const data = getOnboardingData();
  document.getElementById('onboardTitleInput').value = data.title || '';
  document.getElementById('onboardSubtitleInput').value = data.subtitle || '';
  onboardElements = (data.items || []).slice();
  renderOnboardElements();

  // Load login background
  try {
    const { data: bgData } = await sb.from('settings').select('value').eq('key', 'login_bg').single();
    if (bgData?.value) {
      document.getElementById('loginBgUrl').value = bgData.value;
      updateImagePreview('loginBgPreview', bgData.value);
    }
  } catch (e) { /* no login bg set yet */ }
}

function renderOnboardElements() {
  const el = document.getElementById('onboardElementsList');
  if (!onboardElements.length) {
    el.innerHTML = '<p style="font-size:13px;font-style:italic;color:var(--text-light);margin-bottom:12px;">Noch keine Elemente. Füge eines hinzu.</p>';
    return;
  }
  el.innerHTML = onboardElements.map((item, i) =>
    `<div class="onboard-element-card"><div class="element-inputs">` +
    `<input class="form-input" placeholder="Titel" value="${esc(item.title)}" data-change="updateOnboardField" data-args='[${i},"title"]' data-val>` +
    `<textarea class="form-textarea" placeholder="Text" style="min-height:60px;" data-change="updateOnboardField" data-args='[${i},"text"]' data-val>${esc(item.text)}</textarea>` +
    `</div><div class="onboard-element-actions"><button class="icon-btn delete" data-action="removeOnboardElement" data-args='[${i}]'>✕</button></div></div>`
  ).join('');
}

export function addOnboardElement() {
  onboardElements.push({ title: '', text: '' });
  renderOnboardElements();
  const cards = document.querySelectorAll('.onboard-element-card');
  if (cards.length) cards[cards.length - 1].querySelector('input').focus();
}

export async function saveOnboarding() {
  const title = document.getElementById('onboardTitleInput').value.trim();
  const subtitle = document.getElementById('onboardSubtitleInput').value.trim();
  const items = onboardElements.filter((it) => it.title.trim() || it.text.trim());
  const val = JSON.stringify({ title, subtitle, items });

  btnLoading('saveOnboardBtn', true);
  try {
    const { error } = await sb.from('settings').upsert({ key: 'onboarding', value: val }, { onConflict: 'key' });
    if (error) throw error;
    const { setOnboardingData } = await import('./onboarding.js');
    setOnboardingData({ title, subtitle, items });
    showToast('Willkommensseite gespeichert.');
  } catch (e) { showToast(trDataErr(e, 'save'), 'error'); }
  finally { btnLoading('saveOnboardBtn', false); }
}

export function previewOnboarding() {
  import('./onboarding.js').then(({ setOnboardingData }) => {
    setOnboardingData({
      title: document.getElementById('onboardTitleInput').value.trim(),
      subtitle: document.getElementById('onboardSubtitleInput').value.trim(),
      items: onboardElements.filter((it) => it.title.trim() || it.text.trim()),
    });
    import('./navigation.js').then(({ navigateTo }) => navigateTo('onboarding'));
  });
}

// ══════════════════════════════════════
// ADMIN: MEDITATION
// ══════════════════════════════════════

const MEDITATION_BUCKET = 'meditations';
let adminMeditations = [];

export async function loadMeditationEditor() {
  const el = document.getElementById('adminMeditationsList');
  if (el) el.innerHTML = '<p style="color:var(--text-muted);font-style:italic;">Lade …</p>';
  try {
    const { data, error } = await sb.from('meditations').select('*').order('sort_order');
    if (error) throw error;
    adminMeditations = data || [];
    renderAdminMeditations();
  } catch (e) {
    showToast(trDataErr(e, 'load'), 'error');
  }
  initMeditationAudioZone();
}

function renderAdminMeditations() {
  const el = document.getElementById('adminMeditationsList');
  if (!el) return;
  if (!adminMeditations.length) {
    el.innerHTML = '<div class="empty-state" style="text-align:center;padding:24px 0;color:var(--text-muted);">Noch keine Meditationen.</div>';
    return;
  }
  const rows = adminMeditations.map(m => {
    const dur = m.duration_seconds ? `${Math.floor(m.duration_seconds / 60)}:${String(m.duration_seconds % 60).padStart(2, '0')}` : '—';
    return `<tr draggable="true" data-id="${m.id}" data-table="meditations">
      <td><span class="drag-handle">⠿</span></td>
      <td style="font-weight:bold;">${esc(m.title)}${!m.is_active ? ' <span style="color:var(--text-light);font-size:12px;">(inaktiv)</span>' : ''}</td>
      <td style="color:var(--text-muted);font-style:italic;font-size:13px;">${esc(m.description || '—')}</td>
      <td>${dur}</td>
      <td><div class="actions-cell">
        <button class="icon-btn" data-action="editMeditation" data-args='["${m.id}"]'>✎</button>
        <button class="icon-btn delete" data-action="deleteMeditation" data-args='["${m.id}"]'>✕</button>
      </div></td>
    </tr>`;
  }).join('');
  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th style="width:40px;"></th><th>Titel</th><th>Beschreibung</th><th>Dauer</th><th style="text-align:right">Aktionen</th></tr></thead><tbody id="dragMeditations">${rows}</tbody></table></div>`;
  initDragDrop('dragMeditations', 'meditations');
}

function initMeditationAudioZone() {
  const zone = document.getElementById('meditationAudioPreview');
  const input = document.getElementById('meditationAudioInput');
  if (!zone || !input) return;

  zone.onclick = () => input.click();
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      handleMeditationAudioSelect();
    }
  });
}

export function handleMeditationImageSelect() {
  const input = document.getElementById('meditationImageInput');
  const zone = document.getElementById('meditationImagePreview');
  if (!input || !input.files.length) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    zone.innerHTML = `<img src="${e.target.result}" alt="Vorschau"><button class="image-remove-btn" data-action="removeMeditationImage" data-stop title="Bild entfernen">✕</button>`;
    zone.classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

export function removeMeditationImage() {
  document.getElementById('meditationImageUrl').value = '';
  document.getElementById('meditationImageInput').value = '';
  const zone = document.getElementById('meditationImagePreview');
  if (zone) {
    zone.classList.remove('has-image');
    zone.innerHTML = '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>';
  }
}

export function handleMeditationAudioSelect() {
  const input = document.getElementById('meditationAudioInput');
  const zone = document.getElementById('meditationAudioPreview');
  if (!input || !input.files.length) return;
  const file = input.files[0];
  zone.classList.add('has-audio');
  zone.innerHTML = `<span class="audio-upload-filename">🎵 ${esc(file.name)} (${(file.size / 1024 / 1024).toFixed(1)} MB)</span>`;
}

function getAudioDuration(file) {
  return new Promise(resolve => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(Math.round(audio.duration));
      URL.revokeObjectURL(audio.src);
    });
    audio.addEventListener('error', () => resolve(0));
    audio.src = URL.createObjectURL(file);
  });
}

async function uploadMeditationAudio(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['mp3', 'mp4', 'm4a', 'wav', 'ogg'].includes(ext)) {
    throw new Error('Nur Audio-Dateien erlaubt: mp3, m4a, wav, ogg');
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('Audio darf maximal 50 MB gross sein.');
  }
  const name = `audio/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from(MEDITATION_BUCKET).upload(name, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'audio/mpeg',
  });
  if (error) throw error;
  const { data } = sb.storage.from(MEDITATION_BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

async function deleteMeditationAudio(url) {
  if (!url) return;
  try {
    const path = url.split(`/storage/v1/object/public/${MEDITATION_BUCKET}/`)[1];
    if (path) await sb.storage.from(MEDITATION_BUCKET).remove([path]);
  } catch (e) {
    console.warn('Audio delete failed:', e);
  }
}

export async function saveMeditation() {
  const title = document.getElementById('meditationTitleInput').value.trim();
  const desc = document.getElementById('meditationDescInput').value.trim();
  const isActive = document.getElementById('meditationActiveInput').checked;
  const editId = document.getElementById('editMeditationId').value;
  if (!title) { showToast('Bitte Titel eingeben.', 'error'); return; }

  btnLoading('saveMeditationBtn', true);
  try {
    let audio_url = document.getElementById('meditationAudioUrl').value || '';
    let image_url = document.getElementById('meditationImageUrl').value || '';
    let duration_seconds = parseInt(document.getElementById('meditationDuration').value) || 0;
    const fileInput = document.getElementById('meditationAudioInput');
    const imageInput = document.getElementById('meditationImageInput');

    if (imageInput.files.length) {
      if (editId && image_url) await deleteImage(image_url);
      image_url = await uploadImage(imageInput.files[0], 'meditations');
    }

    if (fileInput.files.length) {
      const file = fileInput.files[0];
      duration_seconds = await getAudioDuration(file);
      if (editId && audio_url) await deleteMeditationAudio(audio_url);
      audio_url = await uploadMeditationAudio(file);
    }
    if (!audio_url) { showToast('Bitte MP3-Datei hochladen.', 'error'); btnLoading('saveMeditationBtn', false); return; }

    if (editId) {
      const { error } = await sb.from('meditations').update({
        title, description: desc, audio_url, image_url, duration_seconds, is_active: isActive,
      }).eq('id', editId);
      if (error) throw error;
      showToast('Meditation aktualisiert.');
    } else {
      const { error } = await sb.from('meditations').insert({
        title, description: desc, audio_url, image_url, duration_seconds,
        is_active: isActive, sort_order: adminMeditations.length,
      });
      if (error) throw error;
      showToast('Meditation erstellt.');
    }
    resetMeditationForm();
    if (window.__clearMeditationCache) window.__clearMeditationCache();
    await loadMeditationEditor();
  } catch (e) { showToast(trDataErr(e, 'save'), 'error'); }
  finally { btnLoading('saveMeditationBtn', false); }
}

export function editMeditation(id) {
  const m = adminMeditations.find(x => x.id === id);
  if (!m) return;
  document.getElementById('editMeditationId').value = m.id;
  document.getElementById('meditationTitleInput').value = m.title || '';
  document.getElementById('meditationDescInput').value = m.description || '';
  document.getElementById('meditationActiveInput').checked = m.is_active !== false;
  document.getElementById('meditationAudioUrl').value = m.audio_url || '';
  document.getElementById('meditationImageUrl').value = m.image_url || '';
  document.getElementById('meditationDuration').value = m.duration_seconds || 0;

  // Image preview
  const imgZone = document.getElementById('meditationImagePreview');
  if (m.image_url) {
    imgZone.innerHTML = `<img src="${esc(m.image_url)}" alt="Vorschau"><button class="image-remove-btn" data-action="removeMeditationImage" data-stop title="Bild entfernen">✕</button>`;
    imgZone.classList.add('has-image');
  } else {
    imgZone.classList.remove('has-image');
    imgZone.innerHTML = '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>';
  }

  const zone = document.getElementById('meditationAudioPreview');
  if (m.audio_url) {
    zone.classList.add('has-audio');
    const filename = m.audio_url.split('/').pop();
    zone.innerHTML = `<span class="audio-upload-filename">🎵 ${esc(filename)}</span>`;
  }
  document.getElementById('meditationTitleInput').focus();
  document.getElementById('meditationTitleInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export async function deleteMeditation(id) {
  if (!confirm('Meditation wirklich löschen?')) return;
  const m = adminMeditations.find(x => x.id === id);
  try {
    if (m?.audio_url) await deleteMeditationAudio(m.audio_url);
    if (m?.image_url) await deleteImage(m.image_url);
    const { error } = await sb.from('meditations').delete().eq('id', id);
    if (error) throw error;
    showToast('Meditation gelöscht.');
    if (window.__clearMeditationCache) window.__clearMeditationCache();
    await loadMeditationEditor();
  } catch (e) { showToast(trDataErr(e, 'delete'), 'error'); }
}

export function resetMeditationForm() {
  document.getElementById('editMeditationId').value = '';
  document.getElementById('meditationTitleInput').value = '';
  document.getElementById('meditationDescInput').value = '';
  document.getElementById('meditationActiveInput').checked = true;
  document.getElementById('meditationAudioUrl').value = '';
  document.getElementById('meditationImageUrl').value = '';
  document.getElementById('meditationDuration').value = '0';
  document.getElementById('meditationAudioInput').value = '';
  document.getElementById('meditationImageInput').value = '';
  const zone = document.getElementById('meditationAudioPreview');
  if (zone) {
    zone.classList.remove('has-audio');
    zone.innerHTML = '<span class="audio-upload-label">MP3 hierher ziehen oder klicken</span>';
  }
  const imgZone = document.getElementById('meditationImagePreview');
  if (imgZone) {
    imgZone.classList.remove('has-image');
    imgZone.innerHTML = '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>';
  }
}

export { onboardElements, renderOnboardElements };

// ══════════════════════════════════════
// ADMIN: PRO-FRAGEN
// ══════════════════════════════════════

export async function loadAdminProQuestions() {
  const container = document.getElementById('adminProQuestionsList');
  if (!container) return;

  try {
    const { data, error } = await sb
      .from('pro_questions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const questions = data || [];

    if (!questions.length) {
      container.innerHTML = '<p style="font-style:italic;color:var(--text-light);padding:20px 0;">Noch keine Pro-Fragen eingereicht.</p>';
      return;
    }

    // Fetch user emails for display
    const userIds = [...new Set(questions.map(q => q.user_id))];
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p.display_name || 'Unbekannt'; });

    container.innerHTML = questions.map(q => {
      const d = new Date(q.created_at);
      const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const userName = profileMap[q.user_id] || q.user_id.slice(0, 8);

      return `
        <div class="admin-message-card">
          <div class="admin-message-header">
            <span class="admin-message-type" style="color:var(--accent-olive);">Pro-Frage</span>
            <span class="admin-message-date">${esc(dateStr)}</span>
          </div>
          <div class="admin-message-sender">${esc(userName)}</div>
          <div class="admin-message-body">${esc(q.question_text)}</div>
        </div>`;
    }).join('');
  } catch (e) {
    console.error('Pro questions load error:', e);
    container.innerHTML = '<p style="color:var(--error);">Fehler beim Laden der Pro-Fragen.</p>';
  }
}
