// src/events.js — Zentrales Event-Delegation-System
// Ersetzt ALLE inline onclick/onchange/oninput/onsubmit/onkeydown Handler.
// Ermöglicht Entfernung von 'unsafe-inline' aus der CSP.
//
// Konventionen:
//   data-action="fnName"                — click handler
//   data-change="fnName"                — change handler
//   data-input="fnName"                 — input handler
//   data-submit="fnName"                — form submit handler
//   data-keyaction="fnName" data-key="Enter" — keydown handler
//
// Argumente:
//   data-args='["a","b"]'  — JSON-Array mit Argumenten
//   data-el                — Element selbst als letztes Argument (ersetzt `this`)
//   data-ev                — Event als erstes Argument
//   data-val               — Element .value als letztes Argument (für Inputs)
//   data-stop              — e.stopPropagation()
//   data-prevent           — e.preventDefault()

// ── Action Registry (allowlist — only registered functions can be dispatched) ──
const _actions = new Map();

export function registerActions(obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'function') _actions.set(k, v);
  }
}

export function initEventDelegation() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.hasAttribute('data-stop')) e.stopPropagation();
    if (el.hasAttribute('data-prevent') || el.tagName === 'A') e.preventDefault();
    dispatch(el, e, 'action');
  });

  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    dispatch(el, e, 'change');
  });

  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (!el) return;
    dispatch(el, e, 'input');
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-submit]');
    if (!form) return;
    e.preventDefault();
    dispatch(form, e, 'submit');
  });

  document.addEventListener('keydown', (e) => {
    const el = e.target.closest('[data-keyaction]');
    if (!el) return;
    if (el.dataset.key && e.key !== el.dataset.key) return;
    dispatch(el, e, 'keyaction');
  });
}

function dispatch(el, event, type) {
  const attr = `data-${type}`;
  const actionStr = el.getAttribute(attr);
  if (!actionStr) return;

  const actionNames = actionStr.split('|');
  for (const name of actionNames) {
    const key = name.trim();
    const fn = _actions.get(key);
    if (!fn) { console.warn(`[events] Unknown action: ${key}`); continue; }

    const args = buildArgs(el, event);
    fn(...args);
  }
}

function buildArgs(el, event) {
  const args = [];

  // Event als erstes Argument
  if (el.hasAttribute('data-ev')) args.push(event);

  // Explizite JSON-Args
  if (el.dataset.args) {
    try { args.push(...JSON.parse(el.dataset.args)); } catch { /* */ }
  }

  // Element-Referenz (ersetzt `this`)
  if (el.hasAttribute('data-el')) args.push(el);

  // Input-Value
  if (el.hasAttribute('data-val')) args.push(el.value);

  return args;
}

// ── Utility-Aktionen für ehemals inline JS ──
// These are registered both on window (for direct calls) and in the action registry (for data-action dispatch)

const _utilActions = {
  removeParent: (el) => el?.parentElement?.remove(),
  toggleParentClass: (cls, el) => el?.parentElement?.classList.toggle(cls),
  triggerClickOn: (id) => document.getElementById(id)?.click(),
  copyAndToast: (text) => { navigator.clipboard.writeText(text); window.showToast?.('Link kopiert!'); },
  mobileMenuNav: (route) => { window.closeMobileMenu?.(); window.navigateTo?.(route); },
  pubMobileNav: (route) => { window.navigateTo?.(route); window.togglePublicMobileNav?.(); },
  toggleDarkAndLabel: () => { window.toggleDarkMode?.(); window.updateMobileDarkLabel?.(); },
  removeOnboardElement: (index) => { window.onboardElements?.splice(index, 1); window.renderOnboardElements?.(); },
  toggleFaqOpen: (el) => el?.parentElement?.classList.toggle('open'),
  updateOnboardField: (index, field, value) => { if (window.onboardElements?.[index]) window.onboardElements[index][field] = value; },
};

// Register utility actions in both window and action registry
Object.assign(window, _utilActions);
registerActions(_utilActions);
