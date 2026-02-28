import { sb } from './config.js';
import { state } from './state.js';
import { showToast } from './utils.js';

// ── NOTIFICATION BADGE ──

export async function loadNotificationCount() {
  if (!state.currentUser) return;
  try {
    const { count, error } = await sb
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', state.currentUser.id)
      .eq('is_read', false);
    if (error) throw error;
    updateBadge(count || 0);
  } catch (e) {
    console.error('Notification count error:', e);
  }
}

function updateBadge(count) {
  const badges = document.querySelectorAll('.notification-badge');
  badges.forEach(b => {
    if (count > 0) {
      b.textContent = count > 9 ? '9+' : count;
      b.style.display = 'flex';
    } else {
      b.style.display = 'none';
    }
  });
}

// ── NOTIFICATION LIST (rendered inside profile) ──

export async function renderNotifications(containerId) {
  const el = document.getElementById(containerId);
  if (!el || !state.currentUser) return;

  el.innerHTML = '<div class="empty-state" style="padding:16px;"><div class="spinner" style="margin-bottom:8px;"></div></div>';

  try {
    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    if (!data || !data.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-style:italic;padding:8px 0;">Keine Nachrichten.</p>';
      return;
    }

    el.innerHTML = data.map(n => {
      const date = new Date(n.created_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const unreadClass = n.is_read ? '' : ' notification-unread';
      return `<div class="notification-item${unreadClass}" id="notif-${n.id}">
        <div class="notification-header">
          ${n.subject ? `<strong class="notification-subject">${escHtml(n.subject)}</strong>` : ''}
          <span class="notification-date">${date}</span>
        </div>
        <p class="notification-message">${escHtml(n.message)}</p>
        ${!n.is_read ? `<button class="btn btn-ghost btn-sm" style="margin-top:6px;font-size:11px;" data-action="markNotificationRead" data-args='["${n.id}"]'>Als gelesen markieren</button>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    console.error('Render notifications error:', e);
    el.innerHTML = '<p style="color:var(--accent-rose);">Fehler beim Laden.</p>';
  }
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML.replace(/\n/g, '<br>');
}

export async function markNotificationRead(id) {
  try {
    const { error } = await sb
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;

    const item = document.getElementById('notif-' + id);
    if (item) {
      item.classList.remove('notification-unread');
      const btn = item.querySelector('[data-action="markNotificationRead"]');
      if (btn) btn.remove();
    }
    loadNotificationCount();
  } catch (e) {
    showToast('Fehler.', 'error');
  }
}
