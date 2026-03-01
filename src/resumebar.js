// src/resumebar.js — "Weitermachen" Resume Bar (above bottom tab bar)

import { state } from './state.js';
import { navigateTo } from './navigation.js';
import { esc } from './utils.js';

const STORAGE_KEY = 'klarzeit_resume_point';

// ── Persist resume point ──

export function saveResumePoint(data) {
  if (!state.currentUser) return;
  try {
    const point = {
      ...data,
      userId: state.currentUser.id,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(point));
  } catch (_) {}
}

export function getResumePoint() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const point = JSON.parse(raw);
    // Only show if it belongs to the current user
    if (point.userId !== state.currentUser?.id) return null;
    // Expire after 30 days
    if (Date.now() - point.timestamp > 30 * 24 * 60 * 60 * 1000) return null;
    return point;
  } catch (_) { return null; }
}

export function clearResumePoint() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

// ── Icons ──

const ICONS = {
  audio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"/></svg>',
  lesson: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  exercise: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  meditation: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
};

// ── Render & Update ──

// Views where the bar should be visible
const HOME_VIEWS = ['courses', 'tools', 'meditation', 'pro', 'contact', 'profile'];

export function updateResumeBar(currentView) {
  const bar = document.getElementById('resumeBar');
  if (!bar) return;

  const point = getResumePoint();

  // Hide if no resume point, or if user is already viewing that content, or not a "home" view
  if (!point || !HOME_VIEWS.includes(currentView)) {
    bar.style.display = 'none';
    return;
  }

  // Don't show if the user is already on the resume target
  if (point.type === 'lesson' && currentView === 'chapterPlayer' && state.currentChapterId === point.chapterId) {
    bar.style.display = 'none';
    return;
  }
  if (point.type === 'exercise' && currentView === 'questions' && state.currentExerciseId === point.exerciseId) {
    bar.style.display = 'none';
    return;
  }

  const icon = ICONS[point.type] || ICONS.lesson;
  const label = point.type === 'audio' ? 'Weiterhören' :
                point.type === 'meditation' ? 'Weiterhören' :
                point.type === 'exercise' ? 'Weiter üben' : 'Weiterlesen';

  bar.innerHTML = `
    <button class="resume-bar-main" data-action="resumeLastActivity">
      <span class="resume-bar-icon">${icon}</span>
      <span class="resume-bar-text">
        <span class="resume-bar-label">${label}</span>
        <span class="resume-bar-title">${esc(point.title)}</span>
      </span>
    </button>
    <button class="resume-bar-close" data-action="dismissResumeBar" aria-label="Schliessen">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  bar.style.display = 'flex';
}

// ── Actions ──

export function resumeLastActivity() {
  const point = getResumePoint();
  if (!point) return;

  switch (point.type) {
    case 'audio':
    case 'lesson':
      navigateTo('chapterPlayer', { courseId: point.courseId, chapterId: point.chapterId });
      break;
    case 'exercise':
      navigateTo('questions', { courseId: point.courseId, chapterId: point.chapterId, exerciseId: point.exerciseId });
      break;
    case 'meditation':
      // Navigate to meditation first, then open detail
      navigateTo('meditation');
      setTimeout(() => {
        import('./meditation.js').then(m => m.openMeditationDetail(point.meditationId));
      }, 400);
      break;
    default:
      navigateTo('courses');
  }
}

export function dismissResumeBar() {
  clearResumePoint();
  const bar = document.getElementById('resumeBar');
  if (bar) bar.style.display = 'none';
}
