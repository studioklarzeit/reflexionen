// src/contact.js — Kontaktseite: Frage, Kursthema, Kontakt

import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, trDataErr } from './utils.js';

/*
  Supabase table:
  CREATE TABLE contact_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_email text,
    type text NOT NULL CHECK (type IN ('question', 'topic', 'contact')),
    subject text,
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can insert own" ON contact_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can read own" ON contact_messages FOR SELECT USING (auth.uid() = user_id);
  -- Admin policies (admin = is_admin in profiles):
  CREATE POLICY "Admin can read all" ON contact_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
  CREATE POLICY "Admin can delete all" ON contact_messages FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
*/

const FORMS = [
  {
    type: 'question',
    title: 'Frage einreichen',
    description: 'Du kommst bei einer Übung nicht weiter oder möchtest etwas besser verstehen? Schreib deine Frage — sie wird persönlich beantwortet.',
    placeholder: 'Deine Frage …',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    hasSubject: false,
  },
  {
    type: 'topic',
    title: 'Kursthema vorschlagen',
    description: 'Dir fehlt ein Thema oder du wünschst dir einen Schwerpunkt? Dein Vorschlag fliesst direkt in die Kursplanung ein.',
    placeholder: 'Dein Themenvorschlag …',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    hasSubject: false,
  },
  {
    type: 'contact',
    title: 'Kontakt aufnehmen',
    description: 'Feedback, technische Probleme oder etwas ganz anderes — schreib uns gerne.',
    placeholder: 'Deine Nachricht …',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    hasSubject: true,
  },
];

export async function renderContact() {
  const container = document.getElementById('contactContent');
  if (!container) return;

  // Load user's own messages
  let messages = [];
  try {
    const { data, error } = await sb
      .from('contact_messages')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    messages = data || [];
  } catch (e) { /* ignore */ }

  container.innerHTML = `
    <div class="meditation-quote">Fragen, Ideen oder Feedback — wir freuen uns auf deine Nachricht.</div>
    <div class="contact-grid">
      ${FORMS.map(f => renderFormCard(f)).join('')}
    </div>
    ${renderMessageHistory(messages)}
  `;
}

function renderMessageHistory(messages) {
  if (!messages.length) return '';

  const typeLabels = { question: 'Frage', topic: 'Themenvorschlag', contact: 'Kontakt' };

  const cards = messages.map(m => {
    const d = new Date(m.created_at);
    const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const label = typeLabels[m.type] || m.type;

    return `
      <div class="contact-history-card">
        <div class="contact-history-header">
          <span class="contact-history-type">${esc(label)}</span>
          <span class="contact-history-date">${esc(dateStr)}</span>
        </div>
        ${m.subject ? `<div class="contact-history-subject">${esc(m.subject)}</div>` : ''}
        <div class="contact-history-body">${esc(m.message)}</div>
      </div>`;
  }).join('');

  return `
    <div class="contact-history">
      <div class="contact-history-title">Deine abgeschickten Nachrichten</div>
      ${cards}
    </div>`;
}

function renderFormCard(form) {
  const subjectField = form.hasSubject
    ? `<input class="form-input contact-subject" id="contact-subject-${form.type}" type="text" placeholder="Betreff (optional)" maxlength="120">`
    : '';

  return `
    <div class="contact-card" id="contactCard-${form.type}">
      <div class="contact-card-header">
        <span class="contact-card-icon">${form.icon}</span>
        <h3 class="contact-card-title">${esc(form.title)}</h3>
      </div>
      <p class="contact-card-desc">${esc(form.description)}</p>
      <div class="contact-form">
        ${subjectField}
        <textarea class="form-textarea contact-message" id="contact-msg-${form.type}" placeholder="${esc(form.placeholder)}" rows="4" maxlength="2000" data-input="updateContactCounter" data-el="${form.type}"></textarea>
        <div class="contact-form-footer">
          <span class="contact-char-count" id="contact-count-${form.type}">0 / 2000</span>
          <button class="btn btn-primary btn-sm" id="contact-btn-${form.type}" data-action="submitContactForm" data-args='["${form.type}"]'>
            <span class="btn-text">Absenden</span>
          </button>
        </div>
      </div>
      <div class="contact-success" id="contact-success-${form.type}" style="display:none;">
        <span class="contact-success-icon">✓</span>
        <span class="contact-success-text">Danke — deine Nachricht ist angekommen.</span>
      </div>
    </div>`;
}

export async function submitContactForm(type) {
  const msgEl = document.getElementById(`contact-msg-${type}`);
  const subjectEl = document.getElementById(`contact-subject-${type}`);
  const btn = document.getElementById(`contact-btn-${type}`);
  const successEl = document.getElementById(`contact-success-${type}`);

  const message = msgEl?.value?.trim();
  if (!message) {
    showToast('Bitte schreib eine Nachricht.', 'error');
    return;
  }

  const subject = subjectEl?.value?.trim() || null;

  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Wird gesendet …';

  try {
    const { error } = await sb.from('contact_messages').insert({
      user_id: state.currentUser.id,
      sender_email: state.currentUser.email,
      type,
      subject,
      message,
    });
    if (error) throw error;

    // Show success, hide form
    msgEl.value = '';
    if (subjectEl) subjectEl.value = '';

    successEl.style.display = 'flex';
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 4000);

    showToast('Nachricht gesendet.');
    // Re-render history
    refreshHistory();
  } catch (e) {
    showToast(trDataErr(e, 'send'), 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Absenden';
  }
}

async function refreshHistory() {
  try {
    const { data, error } = await sb
      .from('contact_messages')
      .select('*')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const existing = document.querySelector('.contact-history');
    const html = renderMessageHistory(data || []);

    if (existing) {
      existing.outerHTML = html;
    } else if (html) {
      const grid = document.querySelector('.contact-grid');
      if (grid) grid.insertAdjacentHTML('afterend', html);
    }
  } catch (e) { /* ignore */ }
}

// Character counter for contact textareas
export function updateContactCounter(type) {
  const textarea = document.getElementById(`contact-msg-${type}`);
  const counter = document.getElementById(`contact-count-${type}`);
  if (textarea && counter) counter.textContent = `${textarea.value.length} / 2000`;
}
