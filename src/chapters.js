import { state } from './state.js';
import { esc, imgTransform } from './utils.js';
import { getChapterQuestions } from './data.js';

function progressPillHtml(pct) {
  const cls = pct >= 100 ? 'pill-done' : pct > 0 ? 'pill-active' : '';
  const label = pct >= 100 ? '✓' : pct + '%';
  return `<div class="progress-pill ${cls}">${label}</div>`;
}

function formatTime(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `0:${String(m).padStart(2, '0')}`;
}

export function renderChaptersList() {
  const course = state.cacheData.courses.find((c) => c.id === state.currentCourseId);

  if (!course) {
    import('./navigation.js').then((nav) => nav.navigateTo('courses'));
    return;
  }

  document.getElementById('chaptersBreadcrumb').innerHTML =
    `<button class="breadcrumb-link" data-action="navigateTo" data-args='["courses"]'>Übungen</button>` +
    `<span class="breadcrumb-sep">›</span><span>${esc(course.name)}</span>`;

  // Title section: show as fallback when no hero image
  const titleSection = document.getElementById('chaptersTitleSection');
  if (course.image_url) {
    document.getElementById('chaptersEyebrow').textContent = '';
    document.getElementById('chaptersTitle').textContent = '';
    document.getElementById('chaptersDesc').textContent = '';
    if (titleSection) titleSection.style.display = 'none';
  } else {
    document.getElementById('chaptersEyebrow').textContent = 'Übungen';
    document.getElementById('chaptersTitle').textContent = course.name;
    document.getElementById('chaptersDesc').textContent = course.description || '';
    if (titleSection) titleSection.style.display = '';
  }

  const chapters = state.cacheData.chapters.filter((ch) => ch.course_id === state.currentCourseId);
  const el = document.getElementById('chaptersList');

  if (!chapters.length) {
    el.innerHTML = '<div class="empty-state">Noch keine Kapitel vorhanden.</div>';
    return;
  }

  // Compute course-level progress
  const totalQuestions = chapters.reduce((sum, ch) => sum + getChapterQuestions(ch.id).length, 0);
  const totalAnswered = chapters.reduce((sum, ch) => {
    const qs = getChapterQuestions(ch.id);
    return sum + qs.filter((q) => state.cacheAnswers[q.id] && state.cacheAnswers[q.id].trim()).length;
  }, 0);
  const coursePct = totalQuestions ? Math.round(totalAnswered / totalQuestions * 100) : 0;
  const totalMinutes = chapters.reduce((sum, ch) => sum + (ch.estimated_minutes || 0), 0);
  const timeStr = formatTime(totalMinutes);

  // Hero banner
  const heroEl = document.getElementById('chaptersHero');
  if (heroEl) {
    if (course.image_url) {
      heroEl.innerHTML =
        `<div class="chapter-hero-bg lazy-bg" data-bg="${esc(imgTransform(course.image_url, 900))}"></div>` +
        `<div class="chapter-hero-content">` +
          `<h1 class="chapter-hero-title">${esc(course.name)}</h1>` +
          (course.description ? `<p class="chapter-hero-desc">${esc(course.description)}</p>` : '') +
          `<div class="chapter-hero-progress">` +
            `<div class="chapter-hero-bar"><div class="chapter-hero-bar-fill" style="width:${coursePct}%"></div></div>` +
            `<span class="chapter-hero-meta">${coursePct}%</span>` +
          `</div>` +
        `</div>`;
      heroEl.style.display = '';
      window.observeLazyBgs?.();
    } else {
      heroEl.innerHTML = '';
      heroEl.style.display = 'none';
    }
  }

  // Section header — hidden when hero is visible (title already in hero)
  const sectionHeaderEl = document.getElementById('chaptersSectionHeader');
  if (sectionHeaderEl) {
    sectionHeaderEl.style.display = 'none';
  }

  el.innerHTML = chapters.map((ch, i) => {
    const exs = state.cacheData.exercises.filter((ex) => ex.chapter_id === ch.id);
    const questions = getChapterQuestions(ch.id);
    const total = questions.length;
    const ans = questions.filter((q) => state.cacheAnswers[q.id] && state.cacheAnswers[q.id].trim()).length;
    const pct = total ? Math.round(ans / total * 100) : 0;

    const timeDisplay = formatTime(ch.estimated_minutes);

    const img = ch.image_url
      ? `<div class="card-image"><img src="${esc(imgTransform(ch.image_url, 800, 75))}" alt="${esc(ch.name)}" loading="lazy"></div>`
      : `<div class="card-image card-image-placeholder"><span>✦</span></div>`;

    return `<div class="image-card" data-action="navigateTo" data-args='["exercises",{"courseId":"${state.currentCourseId}","chapterId":"${ch.id}"}]'>
      ${img}
      <div class="image-card-body">
        <div class="image-card-header">
          <div class="image-card-title">${esc(ch.name)}</div>
          ${progressPillHtml(pct)}
        </div>
        ${ch.description ? `<div class="image-card-desc">${esc(ch.description)}</div>` : ''}
        ${timeDisplay ? `<div class="image-card-time">${timeDisplay}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}
