import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, trDataErr, imgTransform } from './utils.js';

let cachedMeditations = null;
let currentAudio = null;
let currentMeditationId = null;
let isPlaying = false;
let progressInterval = null;

function formatTime(s) {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function stopAudioCleanup() {
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  isPlaying = false;
  currentMeditationId = null;
}

async function computeStreak() {
  try {
    const { data } = await sb.from('meditation_logs')
      .select('completed_at')
      .eq('user_id', state.currentUser.id)
      .order('completed_at', { ascending: false });
    if (!data || !data.length) return 0;

    const dates = [...new Set(data.map(r => r.completed_at.slice(0, 10)))].sort().reverse();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;

    let streak = 0;
    let checkDate = new Date(dates[0]);
    for (const d of dates) {
      const expected = checkDate.toISOString().slice(0, 10);
      if (d === expected) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (d < expected) {
        break;
      }
    }
    return streak;
  } catch { return 0; }
}

async function logMeditationComplete(meditationId, listenedSeconds) {
  try {
    await sb.from('meditation_logs').insert({
      user_id: state.currentUser.id,
      meditation_id: meditationId,
      listened_seconds: Math.round(listenedSeconds),
    });
  } catch (e) {
    console.warn('Meditation log failed:', e);
  }
}

// ── OVERVIEW: Image Card Grid ──

export async function renderMeditation() {
  const el = document.getElementById('meditationContent');
  if (!el) return;
  el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px 0;">Lade Meditationen …</p>';

  try {
    if (!cachedMeditations) {
      const { data, error } = await sb.from('meditations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      cachedMeditations = data || [];
    }

    const streak = await computeStreak();

    let html = '';

    if (streak > 0) {
      html += `<div class="meditation-streak">
        <span class="meditation-streak-count">${streak}</span>
        <span class="meditation-streak-label">Tag${streak !== 1 ? 'e' : ''} in Folge</span>
      </div>`;
    }

    if (!cachedMeditations.length) {
      html += '<div class="empty-state" style="text-align:center;padding:40px 0;color:var(--text-muted);">Noch keine Meditationen verfügbar.</div>';
    } else {
      html += '<div class="grid-list image-grid meditation-grid">';
      for (const m of cachedMeditations) {
        const dur = m.duration_seconds ? formatTime(m.duration_seconds) : '';
        const img = m.image_url
          ? `<div class="card-image"><img src="${esc(imgTransform(m.image_url, 400, 75))}" alt="${esc(m.title)}" loading="lazy"></div>`
          : `<div class="card-image card-image-placeholder"><span>✦</span></div>`;
        html += `<div class="image-card" data-action="openMeditationDetail" data-args='["${m.id}"]'>
          ${img}
          <div class="image-card-body">
            <div class="image-card-title">${esc(m.title)}</div>
            ${m.description ? `<div class="image-card-desc">${esc(m.description)}</div>` : ''}
            ${dur ? `<div class="image-card-time">${dur}</div>` : ''}
          </div>
        </div>`;
      }
      html += '</div>';
    }

    el.innerHTML = html;
  } catch (e) {
    console.error(e);
    el.innerHTML = '<p style="text-align:center;color:var(--error);padding:40px 0;">Fehler beim Laden der Meditationen.</p>';
    showToast(trDataErr(e, 'load'), 'error');
  }
}

// ── DETAIL: Immersive Player View ──

export async function openMeditationDetail(id) {
  const m = cachedMeditations?.find(x => x.id === id);
  if (!m) return;

  // Stop any playing audio first
  stopAudioCleanup();

  // Remove any existing fullscreen overlay
  const existing = document.getElementById('medFullscreen');
  if (existing) existing.remove();

  const dur = m.duration_seconds ? formatTime(m.duration_seconds) : '';
  const bgStyle = m.image_url ? `background-image:url('${esc(imgTransform(m.image_url, 1200))}')` : '';

  // Hide header + tab bar for immersive fullscreen
  document.getElementById('mainHeader').style.display = 'none';
  const tabBar = document.getElementById('tabBar');
  if (tabBar) { tabBar.style.display = 'none'; document.body.classList.remove('has-dock'); }

  // Append directly to body to avoid parent transform breaking position:fixed
  const wrapper = document.createElement('div');
  wrapper.id = 'medFullscreen';
  wrapper.innerHTML = `
    <div class="med-fullscreen" ${bgStyle ? `style="${bgStyle}"` : ''}>
      <div class="med-fullscreen-overlay"></div>
      <button class="med-fullscreen-back" data-action="closeMeditationDetail">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="med-fullscreen-center">
        <button class="med-fullscreen-play" id="meditationPlayBtn" data-action="togglePlayPause">
          <svg id="meditationPlayIcon" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
        </button>
        <h2 class="med-fullscreen-title">${esc(m.title)}</h2>
        ${m.description ? `<p class="med-fullscreen-desc">${esc(m.description)}</p>` : ''}
        ${dur ? `<div class="med-fullscreen-duration">${dur}</div>` : ''}
      </div>
      <div class="med-fullscreen-bottom">
        <div class="med-fullscreen-progress-wrap" data-action="seekMeditation" data-ev>
          <div class="med-fullscreen-progress-bar" id="meditationProgress"></div>
        </div>
        <div class="med-fullscreen-time">
          <span id="meditationCurrentTime">0:00</span>
          <span id="meditationTotalTime">${dur || '--:--'}</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  // Start audio — fetch as blob to avoid opaque load errors
  currentMeditationId = id;

  try {
    const resp = await fetch(m.audio_url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);

    currentAudio = new Audio(blobUrl);

    currentAudio.addEventListener('loadedmetadata', () => {
      const tt = document.getElementById('meditationTotalTime');
      if (tt) tt.textContent = formatTime(currentAudio.duration);
    });

    currentAudio.addEventListener('ended', () => {
      isPlaying = false;
      updatePlayIcon();
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
      const bar = document.getElementById('meditationProgress');
      if (bar) bar.style.width = '100%';
      logMeditationComplete(id, currentAudio.duration);
      URL.revokeObjectURL(blobUrl);
    });

    currentAudio.addEventListener('error', () => {
      showToast('Audio konnte nicht abgespielt werden.', 'error');
    });

    await currentAudio.play();
    isPlaying = true;
    updatePlayIcon();
    startProgressUpdate();

    // MediaSession: lock-screen artwork + controls
    if ('mediaSession' in navigator) {
      const artwork = m.image_url
        ? [{ src: m.image_url, sizes: '512x512', type: 'image/jpeg' }]
        : [];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: m.title,
        artist: 'Studio Klarzeit',
        album: 'Meditation',
        artwork,
      });
      navigator.mediaSession.setActionHandler('play', () => { currentAudio.play(); isPlaying = true; updatePlayIcon(); });
      navigator.mediaSession.setActionHandler('pause', () => { currentAudio.pause(); isPlaying = false; updatePlayIcon(); });
      navigator.mediaSession.setActionHandler('seekbackward', () => { currentAudio.currentTime = Math.max(0, currentAudio.currentTime - 15); });
      navigator.mediaSession.setActionHandler('seekforward', () => { currentAudio.currentTime = Math.min(currentAudio.duration, currentAudio.currentTime + 15); });
    }
  } catch (e) {
    console.error('Meditation audio error:', e, 'URL:', m.audio_url);
    showToast('Audio konnte nicht geladen werden.', 'error');
  }
}

export function closeMeditationDetail() {
  if (currentAudio && currentMeditationId && isFinite(currentAudio.duration)) {
    const pct = currentAudio.currentTime / currentAudio.duration;
    if (pct >= 0.8) {
      logMeditationComplete(currentMeditationId, currentAudio.currentTime);
    }
  }
  stopAudioCleanup();

  // Remove fullscreen overlay from body
  const fs = document.getElementById('medFullscreen');
  if (fs) fs.remove();

  // Restore header + tab bar
  document.getElementById('mainHeader').style.display = 'flex';
  const tabBar = document.getElementById('tabBar');
  if (tabBar) { tabBar.style.display = ''; document.body.classList.add('has-dock'); }

  renderMeditation();
}

export function togglePlayPause() {
  if (!currentAudio) return;
  if (isPlaying) {
    currentAudio.pause();
    isPlaying = false;
  } else {
    currentAudio.play();
    isPlaying = true;
  }
  updatePlayIcon();
}

function updatePlayIcon() {
  const icon = document.getElementById('meditationPlayIcon');
  if (!icon) return;
  if (isPlaying) {
    icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  } else {
    icon.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
  }
}

function startProgressUpdate() {
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (!currentAudio || !isFinite(currentAudio.duration)) return;
    const pct = (currentAudio.currentTime / currentAudio.duration) * 100;
    const bar = document.getElementById('meditationProgress');
    if (bar) bar.style.width = pct + '%';
    const ct = document.getElementById('meditationCurrentTime');
    if (ct) ct.textContent = formatTime(currentAudio.currentTime);
  }, 250);
}

export function seekMeditation(event) {
  if (!currentAudio || !isFinite(currentAudio.duration)) return;
  const wrap = event.currentTarget;
  const rect = wrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  currentAudio.currentTime = pct * currentAudio.duration;
}

export function stopMeditation() {
  closeMeditationDetail();
}

export function clearMeditationCache() {
  cachedMeditations = null;
}
