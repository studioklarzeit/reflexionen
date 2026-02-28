import { sb } from './config.js';
import { state } from './state.js';
import { esc, btnLoading, showToast, showSaving, showSaved, showSaveErr, trDataErr, imgTransform } from './utils.js';
import { getChapterQuestions, ensureContentData } from './data.js';

// ══════════════════════════════════════
// EXERCISES LIST (Cards — intermediate view)
// ══════════════════════════════════════

export function renderExercisesList() {
  const course = state.cacheData.courses.find((c) => c.id === state.currentCourseId);
  const chapter = state.cacheData.chapters.find((ch) => ch.id === state.currentChapterId);

  if (!course || !chapter) {
    import('./navigation.js').then((nav) => nav.navigateTo('courses'));
    return;
  }

  document.getElementById('exercisesBreadcrumb').innerHTML =
    `<button class="breadcrumb-link" data-action="navigateTo" data-args='["courses"]'>Kurse</button>` +
    `<span class="breadcrumb-sep">›</span>` +
    `<button class="breadcrumb-link" data-action="navigateTo" data-args='["coursePlayer",{"courseId":"${state.currentCourseId}"}]'>${esc(course.name)}</button>` +
    `<span class="breadcrumb-sep">›</span><span>${esc(chapter.name)}</span>`;

  // Compute chapter-level progress
  const chapterQuestions = getChapterQuestions(state.currentChapterId);
  const totalQ = chapterQuestions.length;
  const answeredQ = chapterQuestions.filter((q) => state.cacheAnswers[q.id] && state.cacheAnswers[q.id].trim()).length;
  const chapterPct = totalQ ? Math.round(answeredQ / totalQ * 100) : 0;

  const exercises = state.cacheData.exercises.filter((ex) => ex.chapter_id === state.currentChapterId);

  // Hero banner
  const heroEl = document.getElementById('exercisesHero');
  if (heroEl) {
    const heroImg = chapter.image_url
      ? `<div class="chapter-hero-bg lazy-bg" data-bg="${esc(imgTransform(chapter.image_url, 900))}"></div>`
      : '';
    heroEl.innerHTML =
      `${heroImg}` +
      `<div class="chapter-hero-content">` +
        `<h1 class="chapter-hero-title">${esc(chapter.name)}</h1>` +
        (chapter.description ? `<p class="chapter-hero-desc">${esc(chapter.description)}</p>` : '') +
        `<div class="chapter-hero-progress">` +
          `<div class="chapter-hero-bar"><div class="chapter-hero-bar-fill" style="width:${chapterPct}%"></div></div>` +
          `<span class="chapter-hero-meta">${chapterPct}% · ${exercises.length} Lektionen</span>` +
        `</div>` +
      `</div>`;
    heroEl.style.display = '';
    window.observeLazyBgs?.();
  }

  // Hide default title section (hero replaces it)
  const titleSection = document.getElementById('exercisesTitleSection');
  if (titleSection) titleSection.style.display = 'none';

  document.getElementById('exercisesEyebrow').textContent = '';
  document.getElementById('exercisesTitle').textContent = '';
  document.getElementById('exercisesDesc').textContent = '';
  const el = document.getElementById('exercisesList');

  if (!exercises.length) {
    el.innerHTML = '<div class="empty-state">Noch keine Übungen in diesem Kapitel.</div>';
    return;
  }

  el.innerHTML = exercises.map((ex, i) => {
    const questions = state.cacheData.questions.filter((q) => q.exercise_id === ex.id);
    const total = questions.length;
    const ans = questions.filter((q) => state.cacheAnswers[q.id] && state.cacheAnswers[q.id].trim()).length;
    const pc = ans === 0 ? 'none' : (ans >= total ? 'done' : 'partial');

    return `<div class="list-card" data-action="navigateTo" data-args='["questions",{"courseId":"${state.currentCourseId}","chapterId":"${state.currentChapterId}","exerciseId":"${ex.id}"}]'>
      <div class="list-card-content">
        <div class="list-card-eyebrow">Übung ${String(i + 1).padStart(2, '0')} · ${total} Fragen</div>
        <div class="list-card-title">${esc(ex.name)}</div>
        ${ex.description ? `<div class="list-card-desc">${esc(ex.description)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="list-card-meta"><span class="progress-dot ${pc}"></span>${ans}/${total}</span>
        <span class="list-card-arrow">→</span>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
// QUESTIONS VIEW (Inputs — detail view)
// ══════════════════════════════════════

export async function renderQuestionsView() {
  await ensureContentData();
  const course = state.cacheData.courses.find((c) => c.id === state.currentCourseId);
  const chapter = state.cacheData.chapters.find((ch) => ch.id === state.currentChapterId);
  const exercise = state.cacheData.exercises.find((ex) => ex.id === state.currentExerciseId);

  if (!course || !chapter || !exercise) {
    import('./navigation.js').then((nav) => nav.navigateTo('courses'));
    return;
  }

  document.getElementById('questionsBreadcrumb').innerHTML =
    `<button class="breadcrumb-link" data-action="navigateTo" data-args='["courses"]'>Kurse</button>` +
    `<span class="breadcrumb-sep">›</span>` +
    `<button class="breadcrumb-link" data-action="navigateTo" data-args='["coursePlayer",{"courseId":"${state.currentCourseId}"}]'>${esc(course.name)}</button>` +
    `<span class="breadcrumb-sep">›</span>` +
    `<button class="breadcrumb-link" data-action="navigateTo" data-args='["exercises",{"courseId":"${state.currentCourseId}","chapterId":"${state.currentChapterId}"}]'>${esc(chapter.name)}</button>` +
    `<span class="breadcrumb-sep">›</span><span>${esc(exercise.name)}</span>`;

  // Compute progress for hero
  const questions = state.cacheData.questions.filter((q) => q.exercise_id === state.currentExerciseId);
  const totalQ = questions.length;
  const ansQ = questions.filter((q) => state.cacheAnswers[q.id] && String(state.cacheAnswers[q.id]).trim()).length;
  const pctQ = totalQ ? Math.round(ansQ / totalQ * 100) : 0;

  // Exercise index within chapter
  const chapterExercises = state.cacheData.exercises.filter((ex) => ex.chapter_id === state.currentChapterId);
  const exIdx = chapterExercises.findIndex((ex) => ex.id === state.currentExerciseId);
  const exNum = exIdx >= 0 ? String(exIdx + 1).padStart(2, '0') : '';

  // Hero banner
  const heroEl = document.getElementById('questionsHero');
  if (heroEl) {
    heroEl.innerHTML =
      `<div class="exercise-hero-content">` +
        `<div class="exercise-hero-eyebrow">Übung ${exNum}${totalQ ? ' · ' + totalQ + ' Fragen' : ''}</div>` +
        `<h1 class="exercise-hero-title">${esc(exercise.name)}</h1>` +
        (exercise.description ? `<p class="exercise-hero-desc">${esc(exercise.description)}</p>` : '') +
        `<div class="exercise-hero-progress">` +
          `<div class="exercise-hero-bar"><div class="exercise-hero-bar-fill" id="heroProgressFill" style="width:${pctQ}%"></div></div>` +
          `<span class="exercise-hero-meta">${ansQ} von ${totalQ}</span>` +
        `</div>` +
      `</div>`;
    heroEl.style.display = '';
  }

  // Hide old title section and section header (hero replaces them)
  const titleSection = document.getElementById('questionsTitleSection');
  if (titleSection) titleSection.style.display = 'none';
  const sectionHeader = document.getElementById('questionsSectionHeader');
  if (sectionHeader) sectionHeader.style.display = 'none';
  const progressWrap = document.getElementById('questionsProgressWrap');
  if (progressWrap) progressWrap.style.display = 'none';

  document.getElementById('questionsSummary').classList.remove('visible');
  document.getElementById('questionsCompletion').classList.remove('visible');

  const contentBlocks = (state.cacheData.contentBlocks || []).filter((b) => b.exercise_id === state.currentExerciseId);
  const grid = document.getElementById('questionsGrid');

  if (!questions.length && !contentBlocks.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Noch keine Inhalte in dieser Übung.</div>';
    document.getElementById('questionsMeta').textContent = '';
    return;
  }

  // Merge questions and content blocks into one sorted list
  const items = [
    ...questions.map((q) => ({ ...q, _kind: 'question' })),
    ...contentBlocks.map((b) => ({ ...b, _kind: 'content' })),
  ].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  const chk = '<svg class="check-icon" width="11" height="8" viewBox="0 0 11 8" fill="none"><polyline points="1,4 4,7 10,1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  grid.innerHTML = items.map((item) => {
    if (item._kind === 'content') {
      return renderContentBlock(item);
    }

    const q = item;
    const ans = state.cacheAnswers[q.id] || '';
    const cc = ans.trim() ? 'completed' : '';
    const wc = q.wide ? 'card-wide' : '';
    const type = q.type || 'text';
    const opts = q.options || [];
    let body = '';

    if (type === 'text') {
      body = `<textarea id="answer-${q.id}" placeholder="${esc(q.placeholder || 'Deine Antwort …')}" data-input="handleInput" data-args='["${q.id}"]' data-el rows="4">${esc(ans)}</textarea>`;
    } else if (type === 'choice' || type === 'multichoice') {
      const inputType = type === 'choice' ? 'radio' : 'checkbox';
      const selected = ans ? ans.split('|||') : [];
      body = '<div class="choice-list">' + (Array.isArray(opts) ? opts : []).map((o) => {
        const checked = selected.includes(o);
        return `<div class="choice-item${checked ? ' selected' : ''}" data-action="handleChoice" data-args='["${q.id}","${esc(o)}","${type}"]' data-el>` +
          `<input type="${inputType}" name="q-${q.id}" ${checked ? 'checked' : ''} tabindex="-1">` +
          `<label>${esc(o)}</label></div>`;
      }).join('') + '</div>';
    } else if (type === 'scale') {
      const so = typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
      const min = so.min || 1, max = so.max || 10, step = so.step || 1;
      const lMin = so.labelMin || min, lMax = so.labelMax || max;
      const val = ans || Math.round((min + max) / 2);
      body = `<div class="scale-wrap"><div class="scale-labels"><span>${esc(String(lMin))}</span><span>${esc(String(lMax))}</span></div>` +
        `<input type="range" class="scale-slider" id="answer-${q.id}" min="${min}" max="${max}" step="${step}" value="${val}" data-input="handleScale" data-args='["${q.id}"]' data-el>` +
        `<div class="scale-value" id="sval-${q.id}">${val}</div></div>`;
    }

    return `<div class="question-card ${cc} ${wc}" id="card-${q.id}">` +
      `<div class="card-top"><div class="card-meta"><span class="card-label">${esc(q.label || '')}</span>` +
      `<div class="card-check" id="check-${q.id}">${chk}</div></div>` +
      `<div class="card-question">${esc(q.question)}</div>` +
      (q.hint ? `<div class="card-hint">${esc(q.hint)}</div>` : '') +
      `</div>${body}</div>`;
  }).join('');

  updateQuestionProgress();
  updateNextExerciseBar();
}

// ── Content block renderer ──

function renderContentBlock(block) {
  const t = block.type;
  const c = block.content || '';
  if (t === 'heading') {
    return `<div class="content-block content-heading">${esc(c)}</div>`;
  }
  if (t === 'text') {
    return `<div class="content-block content-text">${esc(c).replace(/\n/g, '<br>')}</div>`;
  }
  if (t === 'text_italic') {
    return `<div class="content-block content-text content-text-italic"><em>${esc(c).replace(/\n/g, '<br>')}</em></div>`;
  }
  if (t === 'text_bold') {
    return `<div class="content-block content-text content-text-bold"><strong>${esc(c).replace(/\n/g, '<br>')}</strong></div>`;
  }
  if (t === 'quote') {
    return `<div class="content-block content-quote">„${esc(c)}"</div>`;
  }
  if (t === 'divider') {
    return `<div class="content-block content-divider"><span>· · ·</span></div>`;
  }
  return '';
}

// ── INPUT HANDLERS ──

export function handleInput(id, el) {
  document.getElementById('card-' + id).classList.toggle('completed', el.value.trim().length > 0);
  state.cacheAnswers[id] = el.value;
  updateQuestionProgress();
  autoSave();
}

export function handleChoice(qId, val, type, el) {
  if (type === 'choice') {
    state.cacheAnswers[qId] = val;
    el.closest('.choice-list').querySelectorAll('.choice-item').forEach((ci) => {
      ci.classList.remove('selected');
      ci.querySelector('input').checked = false;
    });
    el.classList.add('selected');
    el.querySelector('input').checked = true;
  } else {
    const cur = state.cacheAnswers[qId] ? state.cacheAnswers[qId].split('|||') : [];
    const idx = cur.indexOf(val);
    if (idx > -1) {
      cur.splice(idx, 1);
      el.classList.remove('selected');
      el.querySelector('input').checked = false;
    } else {
      cur.push(val);
      el.classList.add('selected');
      el.querySelector('input').checked = true;
    }
    state.cacheAnswers[qId] = cur.join('|||');
  }
  document.getElementById('card-' + qId).classList.toggle('completed', !!state.cacheAnswers[qId]);
  updateQuestionProgress();
  autoSave();
}

export function handleScale(id, el) {
  document.getElementById('sval-' + id).textContent = el.value;
  state.cacheAnswers[id] = el.value;
  document.getElementById('card-' + id).classList.add('completed');
  updateQuestionProgress();
  autoSave();
}

// ── PROGRESS ──

function updateQuestionProgress() {
  const questions = state.cacheData.questions.filter((q) => q.exercise_id === state.currentExerciseId);
  const total = questions.length;
  if (!total) return;
  let ans = 0;
  questions.forEach((q) => { if (state.cacheAnswers[q.id] && String(state.cacheAnswers[q.id]).trim()) ans++; });
  const pct = (ans / total * 100);
  document.getElementById('questionsMeta').textContent = ans + ' von ' + total + ' beantwortet';
  document.getElementById('questionsProgressFill').style.width = pct + '%';
  // Update hero progress
  const heroFill = document.getElementById('heroProgressFill');
  if (heroFill) heroFill.style.width = pct + '%';
  const heroMeta = document.querySelector('.exercise-hero-meta');
  if (heroMeta) heroMeta.textContent = ans + ' von ' + total;
  document.getElementById('questionsCompletion').classList.toggle('visible', ans === total);
}

// ── SAVE ANSWERS ──

async function saveAnswersToSupabase() {
  if (!state.currentUser) return;
  const questions = state.cacheData.questions.filter((q) => q.exercise_id === state.currentExerciseId);
  const ups = [];

  questions.forEach((q) => {
    let val = state.cacheAnswers[q.id] || '';
    const ta = document.getElementById('answer-' + q.id);
    if (ta && (q.type || 'text') === 'text') val = ta.value;
    ups.push({
      user_id: state.currentUser.id,
      question_id: q.id,
      answer_text: val,
      updated_at: new Date().toISOString(),
    });
    state.cacheAnswers[q.id] = val;
  });

  if (ups.length) {
    const { error } = await sb.from('answers').upsert(ups, { onConflict: 'user_id,question_id' });
    if (error) throw error;
  }
}

export async function saveQuestions() {
  btnLoading('saveQuestionsBtn', true);
  showSaving();
  try {
    await saveAnswersToSupabase();
    showSaved();
    showToast('Antworten gespeichert.');
    showQuestionSummary();
  } catch (e) {
    console.error(e);
    showSaveErr();
    showToast(trDataErr(e, 'answers'), 'error');
  } finally {
    btnLoading('saveQuestionsBtn', false);
  }
}

function autoSave() {
  clearTimeout(state.saveTimeout);
  state.saveTimeout = setTimeout(async () => {
    showSaving();
    try {
      await saveAnswersToSupabase();
      showSaved();
    } catch (e) {
      console.error(e);
      showSaveErr();
      if (/JWT|token|expired/i.test(e.message || '')) {
        showToast('Sitzung abgelaufen.', 'error');
        const { handleLogout } = await import('./auth.js');
        setTimeout(handleLogout, 2000);
      }
    }
  }, 2500);
}

// ── SUMMARY ──

export function showQuestionSummary() {
  const questions = state.cacheData.questions.filter((q) => q.exercise_id === state.currentExerciseId);
  const el = document.getElementById('summaryEntries');
  const sec = document.getElementById('questionsSummary');
  let html = '', any = false;

  questions.forEach((q) => {
    let a = state.cacheAnswers[q.id] || '';
    const ta = document.getElementById('answer-' + q.id);
    if (ta && (q.type || 'text') === 'text') a = ta.value;
    if (a.trim()) {
      any = true;
      const display = a.replace(/\|\|\|/g, ', ');
      html += `<div class="summary-entry"><div class="summary-q">${esc(q.label || q.question)}</div>` +
        `<div class="summary-a">${esc(display).replace(/\n/g, '<br>')}</div></div>`;
    }
  });

  el.innerHTML = any ? html : '<p style="font-style:italic;color:var(--text-light);font-size:15px;">Noch keine Antworten vorhanden.</p>';
  sec.classList.add('visible');
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── PDF EXPORT ──

// ── PDF STYLES ──

const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Marcellus&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap');
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'PT Serif', Georgia, serif; color: #3B3937; background: #fff; line-height: 1.6; font-size: 11pt; padding: 18mm 20mm 24mm; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  h1, h2, h3 { font-family: 'Marcellus', Georgia, serif; font-weight: 400; line-height: 1.3; letter-spacing: -0.01em; }

  /* Running footer on every printed page */
  .pdf-running-footer { position: fixed; bottom: 6mm; left: 20mm; right: 20mm; font-size: 7.5pt; color: #a89e92; display: flex; justify-content: space-between; border-top: 1px solid #e0d9d4; padding-top: 3mm; }
  .pdf-running-footer .pdf-rf-brand { font-family: 'Marcellus', Georgia, serif; color: #C4A99B; }

  /* Cover page */
  .pdf-cover { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: calc(297mm - 44mm); text-align: center; page-break-after: always; }
  .pdf-cover-brand { font-family: 'Marcellus', Georgia, serif; font-size: 11pt; color: #C4A99B; letter-spacing: 1px; margin-bottom: 48px; }
  .pdf-cover-brand span { opacity: 0.5; }
  .pdf-cover h1 { font-size: 28pt; margin-bottom: 8px; }
  .pdf-cover .pdf-cover-subtitle { font-size: 14pt; color: #8a8280; font-style: italic; margin-bottom: 40px; }
  .pdf-cover .pdf-cover-meta { font-size: 9pt; color: #a89e92; margin-bottom: 24px; }
  .pdf-cover .pdf-cover-progress { font-size: 10pt; color: #6b6664; }
  .pdf-cover .pdf-cover-bar { width: 200px; height: 4px; background: #e8e2da; border-radius: 2px; margin: 8px auto 0; overflow: hidden; }
  .pdf-cover .pdf-cover-bar-fill { height: 100%; background: #C4A99B; border-radius: 2px; }

  /* Table of contents */
  .pdf-toc { page-break-after: always; }
  .pdf-toc h2 { font-size: 16pt; color: #3B3937; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1.5px solid #C4A99B; }
  .pdf-toc-chapter { font-family: 'Marcellus', Georgia, serif; font-size: 12pt; color: #C4A99B; margin: 18px 0 6px; }
  .pdf-toc-exercise { font-size: 10pt; color: #6b6664; padding: 4px 0 4px 16px; border-left: 2px solid #e8e2da; margin-bottom: 2px; }
  .pdf-toc-exercise span { font-size: 8pt; color: #a89e92; margin-left: 6px; }

  /* Summary */
  .pdf-summary { page-break-before: always; }
  .pdf-summary h2 { font-size: 16pt; color: #3B3937; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1.5px solid #C4A99B; }
  .pdf-summary-group { margin-bottom: 20px; }
  .pdf-summary-group-title { font-family: 'Marcellus', Georgia, serif; font-size: 11pt; color: #C4A99B; margin-bottom: 10px; }
  .pdf-summary-item { margin-bottom: 10px; padding-left: 12px; border-left: 2px solid #e8e2da; }
  .pdf-summary-q { font-size: 8.5pt; color: #8a8280; margin-bottom: 1px; }
  .pdf-summary-a { font-size: 9.5pt; color: #3B3937; line-height: 1.5; }

  /* Logo */
  .pdf-logo { font-family: 'Marcellus', Georgia, serif; font-size: 10pt; color: #3B3937; margin-bottom: 24px; letter-spacing: -0.02em; }
  .pdf-logo span { font-weight: 300; opacity: 0.45; font-size: 0.85em; }

  /* Header */
  .pdf-header { border-bottom: 1.5px solid #C4A99B; padding-bottom: 20px; margin-bottom: 28px; }
  .pdf-header .pdf-eyebrow { font-size: 8pt; text-transform: uppercase; letter-spacing: 1.5px; color: #C4A99B; margin-bottom: 8px; }
  .pdf-header h1 { font-size: 20pt; color: #3B3937; margin-bottom: 4px; }
  .pdf-header .pdf-subtitle { font-size: 11pt; color: #8a8280; font-style: italic; }
  .pdf-header .pdf-progress { font-size: 9pt; color: #C4A99B; margin-top: 10px; display: flex; align-items: center; gap: 10px; }
  .pdf-header .pdf-progress-bar { flex: 0 0 120px; height: 3px; background: #e8e2da; border-radius: 2px; overflow: hidden; }
  .pdf-header .pdf-progress-fill { height: 100%; background: #C4A99B; border-radius: 2px; }

  /* Content blocks */
  .pdf-exercise-title { font-size: 13pt; color: #3B3937; margin: 28px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e0d9d4; break-after: avoid; }
  .pdf-chapter-title { font-size: 15pt; color: #C4A99B; margin: 32px 0 12px; break-after: avoid; }
  .pdf-content-heading { font-size: 13pt; color: #3B3937; margin: 24px 0 8px; break-after: avoid; }
  .pdf-content-text { font-size: 10pt; line-height: 1.7; color: #6b6664; margin-bottom: 10px; break-inside: avoid; break-after: avoid; }
  .pdf-content-quote { font-size: 11pt; font-style: italic; color: #8a8280; margin: 18px 0; padding: 12px 20px; border-left: 3px solid #C4A99B; line-height: 1.6; break-inside: avoid; break-after: avoid; }
  .pdf-content-divider { text-align: center; color: #d8cfc9; margin: 24px 0; letter-spacing: 8px; font-size: 10pt; break-after: avoid; }

  /* Question cards */
  .pdf-question { margin-bottom: 18px; padding: 14px 16px; border-left: 3px solid #C4A99B; background: #f8f5f2; border-radius: 0 6px 6px 0; break-inside: avoid; }
  .pdf-question .pdf-q-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.8px; color: #C4A99B; margin-bottom: 3px; }
  .pdf-question .pdf-q-text { font-family: 'Marcellus', Georgia, serif; font-size: 11pt; color: #3B3937; margin-bottom: 4px; }
  .pdf-question .pdf-q-hint { font-size: 9pt; color: #8a8280; font-style: italic; margin-bottom: 6px; }
  .pdf-question .pdf-q-answer { font-size: 10pt; line-height: 1.7; color: #3B3937; padding-top: 6px; border-top: 1px solid #e8e2da; }
  .pdf-question .pdf-q-date { font-size: 7.5pt; color: #C4A99B; margin-top: 4px; }
  .pdf-question .pdf-q-empty { font-size: 10pt; color: #d8cfc9; font-style: italic; }

  /* Last-page footer */
  .pdf-end-footer { margin-top: 40px; padding-top: 16px; border-top: 1.5px solid #C4A99B; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: #a89e92; }
  .pdf-end-footer .pdf-brand { font-family: 'Marcellus', Georgia, serif; font-size: 9pt; color: #C4A99B; letter-spacing: 0.5px; }
`;

// ── PDF RENDER HELPER ──

async function renderPdfFromHtml(innerHtml, opt) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html><head>
  <title>\u200B</title>
  <style>${PDF_STYLES}</style>
</head><body>${innerHtml}</body></html>`);
  doc.close();

  // Wait for fonts to load instead of guessing with setTimeout
  try {
    await iframe.contentDocument.fonts.ready;
  } catch (_) {
    await new Promise(r => setTimeout(r, 600));
  }

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  // Clean up after print dialog closes
  const cleanup = () => setTimeout(() => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  }, 500);
  iframe.contentWindow.onafterprint = cleanup;
  // Fallback if onafterprint doesn't fire
  setTimeout(cleanup, 30000);
}

// ── PDF BUILDING BLOCKS ──

function pdfRunningFooter(dateStr) {
  return `<div class="pdf-running-footer"><span class="pdf-rf-brand">Studio Klarzeit</span><span>${dateStr}</span></div>`;
}

function pdfEndFooter() {
  const d = new Date().toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<div class="pdf-end-footer"><span class="pdf-brand">Studio Klarzeit</span><span>Exportiert am ${d}</span></div>`;
}

function pdfCoverPage(title, subtitle, answeredCount, totalCount) {
  const d = new Date().toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
  const pct = totalCount ? Math.round(answeredCount / totalCount * 100) : 0;
  return `<div class="pdf-cover">
    <div class="pdf-cover-brand">Studio Klarzeit <span>\u2014 Reflexionen</span></div>
    <h1>${title}</h1>
    ${subtitle ? `<div class="pdf-cover-subtitle">${subtitle}</div>` : ''}
    <div class="pdf-cover-meta">${d}</div>
    ${totalCount ? `<div class="pdf-cover-progress">${answeredCount} von ${totalCount} Fragen beantwortet
      <div class="pdf-cover-bar"><div class="pdf-cover-bar-fill" style="width:${pct}%"></div></div>
    </div>` : ''}
  </div>`;
}

function pdfTocHtml(chapters, exercises, questions) {
  let html = '<div class="pdf-toc"><h2>Inhalt</h2>';
  chapters.forEach((ch) => {
    const chExercises = exercises.filter((ex) => ex.chapter_id === ch.id);
    if (!chExercises.length) return;
    html += `<div class="pdf-toc-chapter">${esc(ch.name)}</div>`;
    chExercises.forEach((ex) => {
      const exQ = questions.filter((q) => q.exercise_id === ex.id);
      const ans = exQ.filter((q) => state.cacheAnswers[q.id] && String(state.cacheAnswers[q.id]).trim()).length;
      html += `<div class="pdf-toc-exercise">${esc(ex.name)}<span>${ans}/${exQ.length}</span></div>`;
    });
  });
  html += '</div>';
  return html;
}

function pdfSummaryHtml(exerciseList) {
  let any = false;
  let html = '<div class="pdf-summary"><h2>Zusammenfassung</h2>';
  exerciseList.forEach((ex) => {
    const questions = state.cacheData.questions.filter((q) => q.exercise_id === ex.id);
    const answered = questions.filter((q) => state.cacheAnswers[q.id] && String(state.cacheAnswers[q.id]).trim());
    if (!answered.length) return;
    any = true;
    html += `<div class="pdf-summary-group"><div class="pdf-summary-group-title">${esc(ex.name)}</div>`;
    answered.forEach((q) => {
      const a = state.cacheAnswers[q.id].replace(/\|\|\|/g, ', ');
      html += `<div class="pdf-summary-item"><div class="pdf-summary-q">${esc(q.label || q.question)}</div>`;
      html += `<div class="pdf-summary-a">${esc(a)}</div></div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  return any ? html : '';
}

function pdfProgressHtml(answeredCount, totalCount) {
  if (!totalCount) return '';
  const pct = Math.round(answeredCount / totalCount * 100);
  return `<div class="pdf-progress">${answeredCount} von ${totalCount} beantwortet<div class="pdf-progress-bar"><div class="pdf-progress-fill" style="width:${pct}%"></div></div></div>`;
}

function formatAnswerDate(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleDateString('de-CH', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) { return ''; }
}

function pdfContentBlockHtml(item) {
  if (item.type === 'heading') return `<h3 class="pdf-content-heading">${esc(item.content)}</h3>`;
  if (item.type === 'text') return `<p class="pdf-content-text">${esc(item.content).replace(/\n/g, '<br>')}</p>`;
  if (item.type === 'text_italic') return `<p class="pdf-content-text" style="font-style:italic;">${esc(item.content).replace(/\n/g, '<br>')}</p>`;
  if (item.type === 'text_bold') return `<p class="pdf-content-text" style="font-weight:bold;">${esc(item.content).replace(/\n/g, '<br>')}</p>`;
  if (item.type === 'quote') return `<div class="pdf-content-quote">\u201E${esc(item.content)}\u201C</div>`;
  if (item.type === 'divider') return '<div class="pdf-content-divider">\u00B7 \u00B7 \u00B7</div>';
  return '';
}

function pdfQuestionHtml(q, answer, dateStr) {
  const display = answer.trim()
    ? esc(answer.replace(/\|\|\|/g, ', ')).replace(/\n/g, '<br>')
    : '';
  let h = '<div class="pdf-question">';
  if (q.label) h += `<div class="pdf-q-label">${esc(q.label)}</div>`;
  h += `<div class="pdf-q-text">${esc(q.question)}</div>`;
  if (q.hint) h += `<div class="pdf-q-hint">${esc(q.hint)}</div>`;
  if (display) {
    h += `<div class="pdf-q-answer">${display}</div>`;
    if (dateStr) h += `<div class="pdf-q-date">Bearbeitet am ${dateStr}</div>`;
  } else {
    h += '<div class="pdf-q-empty">\u2014 Noch nicht beantwortet \u2014</div>';
  }
  h += '</div>';
  return h;
}

function buildExercisePdfHtml(exerciseId, answeredOnly) {
  const questions = state.cacheData.questions.filter((q) => q.exercise_id === exerciseId);
  const contentBlocks = (state.cacheData.contentBlocks || []).filter((b) => b.exercise_id === exerciseId);
  const items = [
    ...questions.map((q) => ({ ...q, _kind: 'question' })),
    ...contentBlocks.map((b) => ({ ...b, _kind: 'content' })),
  ].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  let html = '';
  items.forEach((item) => {
    if (item._kind === 'content') {
      html += pdfContentBlockHtml(item);
    } else {
      const a = state.cacheAnswers[item.id] || '';
      if (answeredOnly && !a.trim()) return;
      const dateStr = formatAnswerDate(state.cacheAnswerDates[item.id]);
      html += pdfQuestionHtml(item, a, dateStr);
    }
  });
  return html;
}

function countAnswered(questionList) {
  return questionList.filter((q) => state.cacheAnswers[q.id] && String(state.cacheAnswers[q.id]).trim()).length;
}

// ── PDF: Single exercise ──

export async function exportPDF(answeredOnly) {
  const course = state.cacheData.courses.find((c) => c.id === state.currentCourseId);
  const chapter = state.cacheData.chapters.find((ch) => ch.id === state.currentChapterId);
  const exercise = state.cacheData.exercises.find((ex) => ex.id === state.currentExerciseId);
  if (!course || !chapter || !exercise) return;

  // Read current textarea values into state before export
  const questions = state.cacheData.questions.filter((q) => q.exercise_id === state.currentExerciseId);
  questions.forEach((q) => {
    const ta = document.getElementById('answer-' + q.id);
    if (ta && (q.type || 'text') === 'text') state.cacheAnswers[q.id] = ta.value;
  });

  const answered = countAnswered(questions);
  const d = new Date().toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });

  let html = pdfRunningFooter(d);
  html += '<div class="pdf-logo">Studio Klarzeit <span>\u2014 Reflexionen</span></div>';
  html += '<div class="pdf-header">';
  html += `<div class="pdf-eyebrow">${esc(course.name)} \u203A ${esc(chapter.name)}</div>`;
  html += `<h1>${esc(exercise.name)}</h1>`;
  html += pdfProgressHtml(answered, questions.length);
  html += '</div>';
  html += buildExercisePdfHtml(state.currentExerciseId, answeredOnly);

  // Summary
  const summaryHtml = pdfSummaryHtml([exercise]);
  if (summaryHtml) html += summaryHtml;

  html += pdfEndFooter();

  showToast('PDF wird erstellt \u2026');
  try {
    await renderPdfFromHtml(html, { filename: `Klarzeit \u2014 ${exercise.name}` });
  } catch (e) {
    console.error(e);
    showToast('Fehler beim PDF-Export.', 'error');
  }
}

// ── PDF: Chapter (all exercises) ──

export async function exportChapterPDF(answeredOnly) {
  const course = state.cacheData.courses.find((c) => c.id === state.currentCourseId);
  const chapter = state.cacheData.chapters.find((ch) => ch.id === state.currentChapterId);
  if (!course || !chapter) return;

  const exercises = state.cacheData.exercises.filter((ex) => ex.chapter_id === chapter.id);
  const allQ = state.cacheData.questions.filter((q) => exercises.some((ex) => ex.id === q.exercise_id));
  const answered = countAnswered(allQ);
  const d = new Date().toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });

  let html = pdfRunningFooter(d);
  html += pdfCoverPage(esc(chapter.name), esc(course.name), answered, allQ.length);

  html += '<div class="pdf-logo">Studio Klarzeit <span>\u2014 Reflexionen</span></div>';
  html += '<div class="pdf-header">';
  html += `<div class="pdf-eyebrow">${esc(course.name)}</div>`;
  html += `<h1>${esc(chapter.name)}</h1>`;
  html += pdfProgressHtml(answered, allQ.length);
  html += '</div>';

  exercises.forEach((ex) => {
    html += `<h2 class="pdf-exercise-title">${esc(ex.name)}</h2>`;
    html += buildExercisePdfHtml(ex.id, answeredOnly);
  });

  const summaryHtml = pdfSummaryHtml(exercises);
  if (summaryHtml) html += summaryHtml;

  html += pdfEndFooter();

  showToast('Kapitel-PDF wird erstellt \u2026');
  try {
    await renderPdfFromHtml(html, { filename: `Klarzeit \u2014 ${chapter.name}` });
  } catch (e) {
    console.error(e);
    showToast('Fehler beim PDF-Export.', 'error');
  }
}

// ── PDF: Course (all chapters + exercises) ──

export async function exportCoursePDF(answeredOnly) {
  const course = state.cacheData.courses.find((c) => c.id === state.currentCourseId);
  if (!course) return;

  const chapters = state.cacheData.chapters.filter((ch) => ch.course_id === course.id);
  const exercises = state.cacheData.exercises.filter((ex) => chapters.some((ch) => ch.id === ex.chapter_id));
  const allQ = state.cacheData.questions.filter((q) => exercises.some((ex) => ex.id === q.exercise_id));
  const answered = countAnswered(allQ);
  const d = new Date().toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });

  let html = pdfRunningFooter(d);
  html += pdfCoverPage(esc(course.name), null, answered, allQ.length);
  html += pdfTocHtml(chapters, exercises, allQ);

  chapters.forEach((ch) => {
    const chExercises = exercises.filter((ex) => ex.chapter_id === ch.id);
    if (!chExercises.length) return;
    html += `<h2 class="pdf-chapter-title">${esc(ch.name)}</h2>`;
    chExercises.forEach((ex) => {
      html += `<h3 class="pdf-exercise-title">${esc(ex.name)}</h3>`;
      html += buildExercisePdfHtml(ex.id, answeredOnly);
    });
  });

  const summaryHtml = pdfSummaryHtml(exercises);
  if (summaryHtml) html += summaryHtml;

  html += pdfEndFooter();

  showToast('Kurs-PDF wird erstellt \u2026');
  try {
    await renderPdfFromHtml(html, { filename: `Klarzeit \u2014 ${course.name}` });
  } catch (e) {
    console.error(e);
    showToast('Fehler beim PDF-Export.', 'error');
  }
}

// ── NEXT EXERCISE ──

export function getNextExercise() {
  if (!state.currentChapterId || !state.currentExerciseId) return null;
  const exercises = state.cacheData.exercises.filter((ex) => ex.chapter_id === state.currentChapterId);
  const idx = exercises.findIndex((ex) => ex.id === state.currentExerciseId);
  if (idx >= 0 && idx < exercises.length - 1) return exercises[idx + 1];
  return null;
}

export async function saveAndNextQuestion() {
  btnLoading('saveNextBtn', true);
  showSaving();
  try {
    await saveAnswersToSupabase();
    showSaved();
    const next = getNextExercise();
    if (next) {
      showToast('Gespeichert! Weiter zur nächsten Übung.');
      const { navigateTo } = await import('./navigation.js');
      navigateTo('questions', { courseId: state.currentCourseId, chapterId: state.currentChapterId, exerciseId: next.id });
    } else {
      showToast('Antworten gespeichert.');
      showQuestionSummary();
    }
  } catch (e) {
    console.error(e);
    showSaveErr();
    showToast(trDataErr(e, 'answers'), 'error');
  } finally {
    btnLoading('saveNextBtn', false);
  }
}

export async function goToNextExercise() {
  const next = getNextExercise();
  if (next) {
    const { navigateTo } = await import('./navigation.js');
    navigateTo('questions', { courseId: state.currentCourseId, chapterId: state.currentChapterId, exerciseId: next.id });
  }
}

function updateNextExerciseBar() {
  const next = getNextExercise();
  const bar = document.getElementById('nextExerciseBar');
  const saveNext = document.getElementById('saveNextBtn');
  if (next) {
    const exercises = state.cacheData.exercises.filter((ex) => ex.chapter_id === state.currentChapterId);
    const idx = exercises.findIndex((ex) => ex.id === next.id);
    const exNum = idx >= 0 ? String(idx + 1).padStart(2, '0') : '';
    const questions = state.cacheData.questions.filter((q) => q.exercise_id === next.id);
    document.getElementById('nextExerciseEyebrow').textContent = `Nächste Übung${exNum ? ' · Übung ' + exNum : ''}${questions.length ? ' · ' + questions.length + ' Fragen' : ''}`;
    document.getElementById('nextExerciseName').textContent = next.name;
    bar.style.display = '';
    saveNext.style.display = 'inline-flex';
  } else {
    bar.style.display = 'none';
    saveNext.style.display = 'none';
  }
}
