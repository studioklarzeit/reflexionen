import { sb } from './config.js';
import { state } from './state.js';
import { navigateTo } from './navigation.js';
import { showToast, esc, imgTransform } from './utils.js';
import { canAccessCourse, getChapterQuestions, ensureContentData } from './data.js';

let currentAudio = null;
let progressInterval = null;

function formatTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ══════════════════════════════════════
// COURSE PLAYER: Chapter Overview
// ══════════════════════════════════════

export async function renderCoursePlayer() {
  const course = state.cacheData.courses.find(c => c.id === state.currentCourseId);
  if (!course) return;

  // Check access
  if (!canAccessCourse(course)) {
    showToast('Kein Zugriff auf diesen Kurs.', 'error');
    navigateTo('courses');
    return;
  }

  const chapters = state.cacheData.chapters
    .filter(ch => ch.course_id === state.currentCourseId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const totalChapters = chapters.length;
  const completedChapters = chapters.filter(ch => state.chapterProgress[ch.id]?.completed).length;
  const pct = totalChapters ? Math.round((completedChapters / totalChapters) * 100) : 0;

  // Hero
  const heroEl = document.getElementById('coursePlayerHero');
  if (heroEl && course.image_url) {
    heroEl.style.display = 'block';
    heroEl.innerHTML = `
      <div class="chapter-hero-bg lazy-bg" data-bg="${esc(imgTransform(course.image_url, 900))}"></div>
      <div class="chapter-hero-content">
        <h1 class="chapter-hero-title">${esc(course.name)}</h1>
        ${course.description ? `<p class="chapter-hero-desc">${esc(course.description)}</p>` : ''}
        <div class="chapter-hero-progress">
          <div class="chapter-hero-bar"><div class="chapter-hero-bar-fill" style="width:${pct}%"></div></div>
          <span class="chapter-hero-meta">${pct}%</span>
        </div>
      </div>
    `;
    window.observeLazyBgs?.();
  }

  // Title section
  const titleEl = document.getElementById('coursePlayerTitleSection');
  if (titleEl) {
    titleEl.innerHTML = `
      <span class="eyebrow">Kurs</span>
      <h1 class="page-title">${esc(course.name)}</h1>
      ${course.description ? `<p class="page-intro">${esc(course.description)}</p>` : ''}
    `;
    if (course.image_url) titleEl.style.display = 'none';
    else titleEl.style.display = '';
  }

  // Breadcrumb
  const bcEl = document.getElementById('coursePlayerBreadcrumb');
  if (bcEl) {
    bcEl.innerHTML = `
      <button class="breadcrumb-link" data-action="navigateTo" data-args='["courses"]'>Kurse</button>
      <span class="breadcrumb-sep">›</span>
      <span>${esc(course.name)}</span>
    `;
  }

  // ── Lektionen (chapters + "Alle Übungen" card at end) ──
  const listEl = document.getElementById('coursePlayerChaptersList');
  const lektionenHeader = document.getElementById('coursePlayerLektionenHeader');

  if (lektionenHeader) lektionenHeader.style.display = chapters.length ? '' : 'none';

  if (listEl) {
    if (!chapters.length) {
      listEl.innerHTML = '<div class="empty-state">Noch keine Lektionen verfügbar.</div>';
    } else {
      // Chapter cards
      const chapterCards = chapters.map((ch, i) => {
        const prog = state.chapterProgress[ch.id];
        const isComplete = prog?.completed;
        const typeLabel = ch.chapter_type === 'vorwort' ? 'Vorwort' :
                          ch.chapter_type === 'abschluss' ? 'Abschlusswort' : '';
        const pillCls = isComplete ? 'pill-done' : '';
        const pillLabel = isComplete ? '✓' : `${i + 1}`;

        const img = ch.image_url
          ? `<div class="card-image"><img src="${esc(imgTransform(ch.image_url, 800, 75))}" alt="${esc(ch.name)}" loading="lazy"></div>`
          : `<div class="card-image card-image-placeholder"><span>✦</span></div>`;

        return `<div class="image-card" data-action="openChapterPlayer" data-args='["${ch.id}"]'>
          ${img}
          <div class="image-card-body">
            <div class="image-card-header">
              <div class="image-card-title">${esc(ch.name)}</div>
              <div class="progress-pill ${pillCls}">${pillLabel}</div>
            </div>
            ${typeLabel ? `<div class="image-card-type">${typeLabel}</div>` : ''}
            ${ch.description ? `<div class="image-card-desc">${esc(ch.description)}</div>` : ''}
          </div>
        </div>`;
      });

      // "Alle Übungen" card (only if course has exercises)
      const hasExercises = chapters.some(ch =>
        state.cacheData.exercises.some(ex => ex.chapter_id === ch.id)
      );
      if (hasExercises) {
        const allQuestions = chapters.reduce((arr, ch) => arr.concat(getChapterQuestions(ch.id)), []);
        const totalQ = allQuestions.length;
        const answeredQ = allQuestions.filter(q => state.cacheAnswers[q.id] && state.cacheAnswers[q.id].trim()).length;
        const exPct = totalQ ? Math.round(answeredQ / totalQ * 100) : 0;
        const pillCls = exPct >= 100 ? 'pill-done' : exPct > 0 ? 'pill-active' : '';
        const pillLabel = exPct >= 100 ? '✓' : exPct + '%';

        chapterCards.push(`<div class="image-card" data-action="navigateTo" data-args='["chapters",{"courseId":"${state.currentCourseId}"}]'>
          <div class="card-image card-image-placeholder"><span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span></div>
          <div class="image-card-body">
            <div class="image-card-header">
              <div class="image-card-title">Alle Übungen</div>
              <div class="progress-pill ${pillCls}">${pillLabel}</div>
            </div>
            <div class="image-card-desc">Alle Reflexionsübungen zu diesem Kurs</div>
          </div>
        </div>`);
      }

      listEl.innerHTML = chapterCards.join('');
    }
  }

  // ── Vertiefungen (extension courses) ──
  const extensionsListEl = document.getElementById('coursePlayerExtensionsList');
  const extensionsHeader = document.getElementById('coursePlayerExtensionsHeader');
  const extensions = state.cacheData.courses.filter(c => c.parent_course_id === course.id);

  if (extensionsHeader) extensionsHeader.style.display = extensions.length ? '' : 'none';

  if (extensionsListEl) {
    if (!extensions.length) {
      extensionsListEl.innerHTML = '';
    } else {
      extensionsListEl.innerHTML = extensions.map(ext => {
        const hasAccess = canAccessCourse(ext);
        const img = ext.image_url
          ? `<div class="card-image"><img src="${esc(imgTransform(ext.image_url, 800, 75))}" alt="${esc(ext.name)}" loading="lazy"></div>`
          : `<div class="card-image card-image-placeholder"><span>✦</span></div>`;

        const dataAttrs = hasAccess
          ? `data-action="navigateTo" data-args='["coursePlayer",{"courseId":"${ext.id}"}]'`
          : (ext.sales_slug ? `data-action="navigateTo" data-args='["salesDetail",{"slug":"${esc(ext.sales_slug)}"}]'` : '');

        const lockOverlay = hasAccess ? '' : `<div class="image-card-lock-overlay"><svg class="image-card-lock-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>`;

        return `<div class="image-card${hasAccess ? '' : ' image-card-locked'}" ${dataAttrs}>
          ${img}
          ${lockOverlay}
          <div class="image-card-body">
            <div class="image-card-header">
              <div class="image-card-title">${esc(ext.name)}</div>
            </div>
            ${ext.description ? `<div class="image-card-desc">${esc(ext.description)}</div>` : ''}
            ${!hasAccess ? `<button class="btn btn-sm btn-outline image-card-cta">Mehr erfahren</button>` : ''}
          </div>
        </div>`;
      }).join('');
    }
  }
}

// ══════════════════════════════════════
// CHAPTER PLAYER: Audio + Text + Exercise Link
// ══════════════════════════════════════

export function openChapterPlayer(chapterId) {
  navigateTo('chapterPlayer', { courseId: state.currentCourseId, chapterId });
}

export async function renderChapterPlayer() {
  const chapter = state.cacheData.chapters.find(ch => ch.id === state.currentChapterId);
  if (!chapter) return;

  const course = state.cacheData.courses.find(c => c.id === state.currentCourseId);
  if (!course) return;

  // Ensure content data is loaded (lazy)
  await ensureContentData();

  const prog = state.chapterProgress[chapter.id];

  // Breadcrumb — Pro course links back to Monatsreflektionen page
  const isProCourse = course.name?.toLowerCase().includes('monatsreflektion');
  const bcEl = document.getElementById('chapterPlayerBreadcrumb');
  if (bcEl) {
    bcEl.innerHTML = isProCourse
      ? `<button class="breadcrumb-link" data-action="navigateTo" data-args='["pro"]'>Monatsreflektionen</button>
         <span class="breadcrumb-sep">›</span>
         <span>${esc(chapter.name)}</span>`
      : `<button class="breadcrumb-link" data-action="navigateTo" data-args='["courses"]'>Kurse</button>
         <span class="breadcrumb-sep">›</span>
         <button class="breadcrumb-link" data-action="navigateTo" data-args='["coursePlayer",{"courseId":"${course.id}"}]'>${esc(course.name)}</button>
         <span class="breadcrumb-sep">›</span>
         <span>${esc(chapter.name)}</span>`;
  }

  const el = document.getElementById('chapterPlayerContent');
  if (!el) return;

  const dur = chapter.audio_duration_seconds ? formatTime(chapter.audio_duration_seconds) : '';

  // Check if chapter has linked exercises
  const exercises = state.cacheData.exercises.filter(ex => ex.chapter_id === chapter.id);
  const hasExercises = exercises.length > 0 && (chapter.chapter_type === 'standard' || !chapter.chapter_type);

  const heroImg = chapter.image_url || course.image_url || '';
  const typeLabel = chapter.chapter_type === 'vorwort' ? 'Vorwort' :
                    chapter.chapter_type === 'abschluss' ? 'Abschlusswort' : 'Lektion';

  el.innerHTML = `
    <div class="chapter-player">
      ${heroImg ? `
        <div class="chapter-detail-hero">
          <img src="${esc(imgTransform(heroImg, 900))}" alt="${esc(chapter.name)}" loading="lazy">
          <div class="chapter-detail-hero-overlay">
            <span class="chapter-detail-hero-eyebrow">${typeLabel}</span>
            <h1 class="chapter-detail-hero-title">${esc(chapter.name)}</h1>
          </div>
        </div>
      ` : `
        <div class="chapter-detail-header">
          <span class="chapter-detail-hero-eyebrow">${typeLabel}</span>
          <h1 class="chapter-detail-hero-title">${esc(chapter.name)}</h1>
        </div>
      `}

      ${chapter.audio_url ? `
        <div class="chapter-audio-section">
          <div class="chapter-audio-player">
            <button class="chapter-audio-play" id="chapterPlayBtn" data-action="toggleChapterAudio">
              <svg id="chapterPlayIcon" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="28" height="28"><polygon points="5,3 19,12 5,21"/></svg>
            </button>
            <div class="chapter-audio-info">
              <div class="chapter-audio-time">
                <span id="chapterCurrentTime">0:00</span> / <span id="chapterTotalTime">${dur || '--:--'}</span>
              </div>
            </div>
            <div class="chapter-audio-progress-wrap" data-action="seekChapterAudio" data-ev>
              <div class="chapter-audio-progress-bar" id="chapterProgress"></div>
            </div>
          </div>
        </div>
      ` : ''}

      ${renderChapterContentSection(chapter)}

      ${hasExercises ? `
        <div class="chapter-exercise-link" data-action="navigateTo" data-args='["exercises",{"courseId":"${course.id}","chapterId":"${chapter.id}"}]'>
          <div class="chapter-exercise-link-inner">
            <div class="chapter-exercise-link-content">
              <div class="chapter-exercise-link-eyebrow">Reflexion</div>
              <h4>Zu den Übungen</h4>
              <p>Wende das Gelernte an mit den Reflexionsfragen zu diesem Kapitel.</p>
            </div>
            <span class="chapter-exercise-link-arrow">→</span>
          </div>
        </div>
      ` : ''}

      <div class="chapter-nav-buttons">
        ${getPrevChapter(chapter) ? `<button class="btn btn-ghost btn-sm" data-action="openChapterPlayer" data-args='["${getPrevChapter(chapter).id}"]'>← Vorheriges Kapitel</button>` : '<span></span>'}
        <button class="btn btn-primary btn-sm" data-action="markChapterCompleteAndNext" data-args='["${chapter.id}"]'>
          ${getNextChapter(chapter) ? 'Nächstes Kapitel →' : 'Kurs abschliessen'}
        </button>
      </div>
    </div>
  `;

  // Init audio
  if (chapter.audio_url) {
    stopChapterAudio();
    currentAudio = new Audio(chapter.audio_url);
    currentAudio.preload = 'auto';

    // Resume position
    if (prog?.audio_position_seconds && !prog.completed) {
      currentAudio.currentTime = prog.audio_position_seconds;
    }

    currentAudio.addEventListener('loadedmetadata', () => {
      const tt = document.getElementById('chapterTotalTime');
      if (tt) tt.textContent = formatTime(currentAudio.duration);
    });

    currentAudio.addEventListener('ended', () => {
      updatePlayIcon(false);
      clearInterval(progressInterval);
      saveChapterProgress(chapter.id, Math.round(currentAudio.duration), false);
    });

    // MediaSession: lock-screen artwork + controls
    if ('mediaSession' in navigator) {
      const artworkUrl = chapter.image_url || course.image_url || '';
      const artwork = artworkUrl
        ? [{ src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapter.name || chapter.title || 'Kapitel',
        artist: 'Studio Klarzeit',
        album: course.title || 'Kurs',
        artwork,
      });
      navigator.mediaSession.setActionHandler('play', () => toggleChapterAudio());
      navigator.mediaSession.setActionHandler('pause', () => toggleChapterAudio());
      navigator.mediaSession.setActionHandler('seekbackward', () => { currentAudio.currentTime = Math.max(0, currentAudio.currentTime - 15); updateAudioProgress(); });
      navigator.mediaSession.setActionHandler('seekforward', () => { currentAudio.currentTime = Math.min(currentAudio.duration || 0, currentAudio.currentTime + 15); updateAudioProgress(); });
    }
  }
}

function renderChapterContentSection(chapter) {
  // Block-based content (new system)
  const blocks = (state.cacheData.chapterContentBlocks || [])
    .filter(b => b.chapter_id === chapter.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (blocks.length) {
    const html = blocks.map(block => {
      const c = block.content || '';
      if (block.type === 'heading') return `<div class="content-block content-heading">${esc(c)}</div>`;
      if (block.type === 'subheading') return `<div class="content-block content-subheading">${esc(c)}</div>`;
      if (block.type === 'text') return `<div class="content-block content-text">${esc(c).replace(/\n/g, '<br>')}</div>`;
      if (block.type === 'text_italic') return `<div class="content-block content-text content-text-italic"><em>${esc(c).replace(/\n/g, '<br>')}</em></div>`;
      if (block.type === 'text_bold') return `<div class="content-block content-text content-text-bold"><strong>${esc(c).replace(/\n/g, '<br>')}</strong></div>`;
      if (block.type === 'quote') return `<div class="content-block content-quote">„${esc(c)}"</div>`;
      if (block.type === 'divider') return `<div class="content-block content-divider"><span>· · ·</span></div>`;
      if (block.type === 'image') return `<div class="content-block content-image"><img src="${esc(imgTransform(c, 900))}" alt="" loading="lazy"></div>`;
      return '';
    }).join('');
    return `<div class="chapter-text-section"><div class="chapter-text-content">${html}</div></div>`;
  }

  // Fallback: old markdown-style chapter_text
  if (chapter.chapter_text) {
    const html = chapter.chapter_text
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p)
      .map(p => {
        if (p.startsWith('### ')) return `<h4>${esc(p.slice(4))}</h4>`;
        if (p.startsWith('## ')) return `<h3>${esc(p.slice(3))}</h3>`;
        if (p.startsWith('# ')) return `<h2>${esc(p.slice(2))}</h2>`;
        if (p.startsWith('> ')) return `<blockquote>${esc(p.slice(2))}</blockquote>`;
        if (p.startsWith('---')) return '<hr>';
        return `<p>${esc(p).replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
    return `<div class="chapter-text-section"><div class="chapter-text-content">${html}</div></div>`;
  }

  return '';
}

function getPrevChapter(chapter) {
  const chapters = state.cacheData.chapters
    .filter(ch => ch.course_id === chapter.course_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const idx = chapters.findIndex(ch => ch.id === chapter.id);
  return idx > 0 ? chapters[idx - 1] : null;
}

function getNextChapter(chapter) {
  const chapters = state.cacheData.chapters
    .filter(ch => ch.course_id === chapter.course_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const idx = chapters.findIndex(ch => ch.id === chapter.id);
  return idx < chapters.length - 1 ? chapters[idx + 1] : null;
}

// ══════════════════════════════════════
// AUDIO CONTROLS
// ══════════════════════════════════════

export function toggleChapterAudio() {
  if (!currentAudio) return;
  if (currentAudio.paused) {
    currentAudio.play();
    updatePlayIcon(true);
    progressInterval = setInterval(updateAudioProgress, 250);
  } else {
    currentAudio.pause();
    updatePlayIcon(false);
    clearInterval(progressInterval);
    // Save position on pause
    const chapterId = state.currentChapterId;
    if (chapterId) saveChapterProgress(chapterId, Math.round(currentAudio.currentTime), false);
  }
}

function updatePlayIcon(isPlaying) {
  const icon = document.getElementById('chapterPlayIcon');
  if (!icon) return;
  icon.innerHTML = isPlaying
    ? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
    : '<polygon points="5,3 19,12 5,21"/>';
}

function updateAudioProgress() {
  if (!currentAudio || !isFinite(currentAudio.duration)) return;
  const pct = (currentAudio.currentTime / currentAudio.duration) * 100;
  const bar = document.getElementById('chapterProgress');
  if (bar) bar.style.width = pct + '%';
  const ct = document.getElementById('chapterCurrentTime');
  if (ct) ct.textContent = formatTime(currentAudio.currentTime);
}

export function seekChapterAudio(event) {
  if (!currentAudio || !isFinite(currentAudio.duration)) return;
  const wrap = event.currentTarget;
  const rect = wrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  currentAudio.currentTime = pct * currentAudio.duration;
  updateAudioProgress();
}

export function stopChapterAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  clearInterval(progressInterval);
  progressInterval = null;
}

// ══════════════════════════════════════
// PROGRESS TRACKING
// ══════════════════════════════════════

async function saveChapterProgress(chapterId, positionSeconds, completed) {
  if (!state.currentUser) return;
  const record = {
    user_id: state.currentUser.id,
    chapter_id: chapterId,
    audio_position_seconds: positionSeconds || 0,
    completed: completed || false,
    updated_at: new Date().toISOString(),
  };
  if (completed) record.completed_at = new Date().toISOString();

  await sb.from('chapter_progress').upsert(record, { onConflict: 'user_id,chapter_id' });
  state.chapterProgress[chapterId] = { ...state.chapterProgress[chapterId], ...record };
}

export async function markChapterCompleteAndNext(chapterId) {
  const chapter = state.cacheData.chapters.find(ch => ch.id === chapterId);
  if (!chapter) return;

  // Stop audio
  stopChapterAudio();

  // Mark complete
  const pos = currentAudio ? Math.round(currentAudio.duration || 0) : 0;
  await saveChapterProgress(chapterId, pos, true);

  // Navigate to next chapter or back to course/pro
  const next = getNextChapter(chapter);
  if (next) {
    openChapterPlayer(next.id);
  } else {
    const course = state.cacheData.courses.find(c => c.id === chapter.course_id);
    const isProCourse = course?.name?.toLowerCase().includes('monatsreflektion');
    showToast('Kurs abgeschlossen.');
    if (isProCourse) {
      navigateTo('pro');
    } else {
      navigateTo('coursePlayer', { courseId: chapter.course_id });
    }
  }
}
