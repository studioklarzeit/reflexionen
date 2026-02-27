import { sb } from './config.js';
import { state } from './state.js';
import { esc } from './utils.js';

let onboardingData = {
  title: 'Willkommen bei Studio Klarzeit',
  subtitle: 'Schön, dass du hier bist. Bevor du loslegst, ein paar Hinweise.',
  items: [],
};

export function getOnboardingData() { return onboardingData; }
export function setOnboardingData(data) { onboardingData = data; }

export async function loadOnboardingData() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'onboarding').single();
    if (data && data.value) onboardingData = JSON.parse(data.value);
  } catch (_) { /* use defaults */ }
}

export function renderOnboarding() {
  document.getElementById('onboardingTitle').textContent = onboardingData.title || 'Willkommen bei Studio Klarzeit';
  document.getElementById('onboardingSubtitle').textContent = onboardingData.subtitle || 'Schön, dass du hier bist.';
  const el = document.getElementById('onboardingItems');

  if (!onboardingData.items || !onboardingData.items.length) {
    el.innerHTML = '<div class="onboarding-item"><div class="onboarding-item-title">Nimm dir Zeit</div>' +
      '<div class="onboarding-item-text">Es gibt keine richtigen oder falschen Antworten. Die Übungen sind für dich — beantworte sie so ehrlich wie möglich.</div></div>';
    return;
  }

  el.innerHTML = onboardingData.items.map((item) =>
    `<div class="onboarding-item"><div class="onboarding-item-title">${esc(item.title)}</div>` +
    `<div class="onboarding-item-text">${esc(item.text)}</div></div>`
  ).join('');
}

export function dismissOnboarding() {
  if (state.currentUser) localStorage.setItem('klarzeit_onboarded_' + state.currentUser.id, '1');
  import('./navigation.js').then(({ navigateTo }) => navigateTo('courses'));
}
