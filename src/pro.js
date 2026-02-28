// src/pro.js — Monatsreflektionen: Frage einreichen + Kapitel-Übersicht

import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, imgTransform } from './utils.js';

let chapterProgressCache = {};

// Reflektionen is free for all logged-in users
export function isProMember() {
  return !!state.currentUser;
}

export function getProCourse() {
  return state.cacheData.courses.find(c =>
    c.name?.toLowerCase().includes('reflektion')
  ) || null;
}

export async function renderPro() {
  const container = document.getElementById('proContent');
  if (!container) return;

  const proCourse = getProCourse();

  // Load chapter progress
  await loadProChapterProgress();

  // Load user's own questions
  let questions = [];
  try {
    const { data, error } = await sb
      .from('pro_questions')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    questions = data || [];
  } catch (e) { /* ignore */ }

  const chaptersHtml = proCourse ? renderProChapters(proCourse) : '';

  container.innerHTML = `
    <div class="meditation-quote">Monatliche Impulse und persönliche Antworten auf deine Fragen.</div>
    <div class="contact-card" id="contactCard-proQuestion">
      <div class="contact-card-header">
        <span class="contact-card-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </span>
        <h3 class="contact-card-title">Frage einreichen</h3>
      </div>
      <p class="contact-card-desc">Stelle deine Frage — sie wird in der nächsten Reflektion persönlich beantwortet.</p>
      <div class="contact-form">
        <textarea class="form-textarea contact-message" id="proQuestionInput" placeholder="Deine Frage …" rows="4" maxlength="2000"></textarea>
        <div class="contact-form-footer">
          <span></span>
          <button class="btn btn-primary btn-sm" id="proSubmitBtn" data-action="submitProQuestion">
            <span class="btn-text">Absenden</span>
          </button>
        </div>
      </div>
      <div class="contact-success" id="proSuccess" style="display:none;">
        <span class="contact-success-icon">✓</span>
        <span class="contact-success-text">Danke — deine Frage ist eingegangen.</span>
      </div>
    </div>

    ${chaptersHtml}

    ${renderQuestionHistory(questions)}
  `;

}

function renderProChapters(course) {
  const chapters = state.cacheData.chapters
    .filter(ch => ch.course_id === course.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (!chapters.length) return '';

  const cards = chapters.map((ch, i) => {
    const prog = chapterProgressCache[ch.id];
    const isComplete = prog?.completed;
    const pillCls = isComplete ? 'pill-done' : '';
    const pillLabel = isComplete ? '✓' : `${i + 1}`;

    const img = ch.image_url
      ? `<div class="card-image"><img src="${esc(imgTransform(ch.image_url, 800, 75))}" alt="${esc(ch.name)}" loading="lazy"></div>`
      : `<div class="card-image card-image-placeholder"><span>✦</span></div>`;

    return `<div class="image-card" data-action="navigateTo" data-args='["chapterPlayer",{"courseId":"${course.id}","chapterId":"${ch.id}"}]'>
      ${img}
      <div class="image-card-body">
        <div class="image-card-header">
          <div class="image-card-title">${esc(ch.name)}</div>
          <div class="progress-pill ${pillCls}">${pillLabel}</div>
        </div>
        ${ch.description ? `<div class="image-card-desc">${esc(ch.description)}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
    <div class="grid-list image-grid" style="margin-top:40px;">
      ${cards}
    </div>`;
}

async function loadProChapterProgress() {
  if (!state.currentUser) return;
  try {
    const { data } = await sb
      .from('chapter_progress')
      .select('*')
      .eq('user_id', state.currentUser.id);
    chapterProgressCache = {};
    (data || []).forEach(p => { chapterProgressCache[p.chapter_id] = p; });
  } catch (e) { /* ignore */ }
}

function renderQuestionHistory(questions) {
  if (!questions.length) return '';

  const cards = questions.map(q => {
    const d = new Date(q.created_at);
    const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
      <div class="pro-history-card">
        <div class="pro-history-date">${esc(dateStr)}</div>
        <div class="pro-history-text">${esc(q.question_text)}</div>
      </div>`;
  }).join('');

  return `
    <div class="pro-history">
      <div class="pro-history-title">Deine eingereichten Fragen</div>
      ${cards}
    </div>`;
}

export async function submitProQuestion() {
  const input = document.getElementById('proQuestionInput');
  const btn = document.getElementById('proSubmitBtn');
  const successEl = document.getElementById('proSuccess');

  const text = input?.value?.trim();
  if (!text) {
    showToast('Bitte schreib eine Frage.', 'error');
    return;
  }

  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Wird gesendet …';

  try {
    const { error } = await sb.from('pro_questions').insert({
      user_id: state.currentUser.id,
      question_text: text,
    });
    if (error) throw error;

    input.value = '';

    successEl.style.display = 'flex';
    setTimeout(() => { successEl.style.display = 'none'; }, 4000);

    showToast('Frage eingereicht.');
    refreshProHistory();
  } catch (e) {
    console.error('Pro question error:', e);
    showToast('Fehler beim Senden. Bitte versuche es erneut.', 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Absenden';
  }
}

async function refreshProHistory() {
  try {
    const { data, error } = await sb
      .from('pro_questions')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const existing = document.querySelector('.pro-history');
    const html = renderQuestionHistory(data || []);

    if (existing) {
      existing.outerHTML = html;
    } else if (html) {
      const grid = document.querySelector('.pro-form-section');
      if (grid) grid.insertAdjacentHTML('afterend', html);
    }
  } catch (e) { /* ignore */ }
}
