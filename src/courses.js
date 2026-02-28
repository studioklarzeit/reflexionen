import { state } from './state.js';
import { esc, imgTransform } from './utils.js';
import { canAccessCourse, getCourseQuestions } from './data.js';

function progressPillHtml(pct) {
  const cls = pct >= 100 ? 'pill-done' : pct > 0 ? 'pill-active' : 'pill-empty';
  const label = pct >= 100 ? '✓' : pct + '%';
  return `<div class="progress-pill ${cls}">${label}</div>`;
}

function formatTime(totalMinutes) {
  if (!totalMinutes) return '';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `0:${String(m).padStart(2, '0')}`;
}

export function renderCoursesList() {
  const el = document.getElementById('coursesList');
  // Show all courses (not just accessible ones), hide extension courses
  const courses = state.cacheData.courses.filter(c => !c.parent_course_id);

  if (!courses.length) {
    el.innerHTML = '<div class="empty-state">Noch keine Kurse vorhanden.</div>';
    return;
  }

  el.innerHTML = courses.map((c) => {
    const hasAccess = canAccessCourse(c);
    const chs = state.cacheData.chapters.filter((ch) => ch.course_id === c.id);
    const questions = getCourseQuestions(c.id);
    const total = questions.length;
    const ans = questions.filter((q) => state.cacheAnswers[q.id] && state.cacheAnswers[q.id].trim()).length;
    const pct = total ? Math.round(ans / total * 100) : 0;

    const totalMinutes = chs.reduce((sum, ch) => sum + (ch.estimated_minutes || 0), 0);
    const timeStr = formatTime(totalMinutes);

    const img = c.image_url
      ? `<div class="card-image"><img src="${esc(imgTransform(c.image_url, 800, 75))}" alt="${esc(c.name)}" loading="lazy"></div>`
      : `<div class="card-image card-image-placeholder"><span>✦</span></div>`;

    if (hasAccess) {
      return `<div class="image-card" data-action="navigateTo" data-args='["coursePlayer",{"courseId":"${c.id}"}]'>
        ${img}
        <div class="image-card-body">
          <div class="image-card-header">
            <div class="image-card-title">${esc(c.name)}</div>
            ${progressPillHtml(pct)}
          </div>
          ${c.description ? `<div class="image-card-desc">${esc(c.description)}</div>` : ''}
          ${timeStr ? `<div class="image-card-time">${timeStr}</div>` : ''}
        </div>
      </div>`;
    }

    // Locked course card
    const dataAttrs = c.sales_slug
      ? `data-action="navigateTo" data-args='["salesDetail",{"slug":"${esc(c.sales_slug)}"}]'`
      : '';

    return `<div class="image-card image-card-locked" ${dataAttrs}>
      ${img}
      <div class="image-card-lock-overlay">
        <svg class="image-card-lock-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div class="image-card-body">
        <div class="image-card-header">
          <div class="image-card-title">${esc(c.name)}</div>
        </div>
        ${c.description ? `<div class="image-card-desc">${esc(c.description)}</div>` : ''}
        <button class="btn btn-sm btn-outline image-card-cta">Mehr erfahren</button>
      </div>
    </div>`;
  }).join('');
}
