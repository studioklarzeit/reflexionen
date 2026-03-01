// src/theme.js — Typography & Colors loading (extracted for fast init)
// These are needed at app startup, before admin panel loads.

import { sb } from './config.js';

const TYPO_LEVELS = ['h1','h2','h3','h4','h5','p1','p2','p3'];

export function applyTypography(typo) {
  if (!typo) return;
  const r = document.documentElement.style;

  const loadFont = (name) => {
    const id = 'gfont-' + name.replace(/\s/g, '-');
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap`;
      document.head.appendChild(link);
    }
  };

  if (typo.fontHeading) { loadFont(typo.fontHeading); r.setProperty('--font-heading', `'${typo.fontHeading}', serif`); }
  if (typo.fontBody) { loadFont(typo.fontBody); r.setProperty('--font-body', `'${typo.fontBody}', serif`); }

  const parseStyle = (s) => {
    const map = { 'normal':'400', 'italic':'400i', 'bold':'700', 'bold-italic':'700i' };
    const v = map[s] || s || '400';
    const isItalic = v.endsWith('i');
    return { weight: isItalic ? v.slice(0, -1) : v, italic: isItalic };
  };

  TYPO_LEVELS.forEach(lv => {
    if (typo[lv]) r.setProperty('--font-size-' + lv, typo[lv] + 'rem');
    if (typo[lv + 'Color']) r.setProperty('--font-color-' + lv, typo[lv + 'Color']);
    const style = typo[lv + 'Style'];
    if (style) {
      const { weight, italic } = parseStyle(style);
      r.setProperty('--font-style-' + lv, italic ? 'italic' : 'normal');
      r.setProperty('--font-weight-' + lv, weight);
    }
    if (typo[lv + 'Pt']) r.setProperty('--font-pt-' + lv, typo[lv + 'Pt'] + 'px');
    if (typo[lv + 'Pb']) r.setProperty('--font-pb-' + lv, typo[lv + 'Pb'] + 'px');
  });

  // Update preview if visible (admin panel)
  TYPO_LEVELS.forEach(lv => {
    const el = document.querySelector('.typo-preview-' + lv);
    if (el) {
      if (typo[lv + 'Color']) el.style.color = typo[lv + 'Color'];
      const style = typo[lv + 'Style'];
      if (style) {
        const { weight, italic } = parseStyle(style);
        el.style.fontStyle = italic ? 'italic' : 'normal';
        el.style.fontWeight = weight;
      }
    }
  });
}

export async function loadAndApplyTypography() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'typography').single();
    if (data?.value) applyTypography(JSON.parse(data.value));
  } catch (e) { /* defaults */ }
}

// ── Colors ──

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)].join(',');
}

const COLOR_VAR_MAP = {
  bg: '--bg', beige: '--beige', card: '--card',
  border: '--border', borderLight: '--border-light',
  text: '--text', textMuted: '--text-muted', textLight: '--text-light',
  line: '--line', accentDark: '--accent-dark',
  accentWarm: '--accent-warm',
  accentOlive: '--accent-olive', accentRose: '--accent-rose',
  navBg: '--nav-bg', navText: '--nav-text', navActive: '--nav-active',
};

export function applyColors(colors) {
  if (!colors) return;
  const isDark = document.body.classList.contains('dark');
  const mode = isDark ? 'dark' : 'light';
  const vals = colors[mode];
  if (!vals) return;

  const r = document.documentElement.style;
  for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
    if (vals[key]) r.setProperty(cssVar, vals[key]);
  }
  if (vals.text) {
    const rgb = hexToRgb(vals.text);
    r.setProperty('--shadow', `rgba(${rgb},0.06)`);
    r.setProperty('--shadow-lg', `rgba(${rgb},0.12)`);
  }
  window.__klarColors = colors;
}

export function injectDarkColorOverrides(colors) {
  if (!colors) return;
  const id = 'klarzeit-color-overrides';
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }

  const lines = [];
  const l = colors.light;
  if (l) {
    lines.push(':root {');
    for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
      if (l[key]) lines.push(`  ${cssVar}: ${l[key]};`);
    }
    if (l.text) { const rgb = hexToRgb(l.text); lines.push(`  --shadow: rgba(${rgb},0.06);`, `  --shadow-lg: rgba(${rgb},0.12);`); }
    lines.push('}');
  }
  const d = colors.dark;
  if (d) {
    lines.push('body.dark {');
    for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
      if (d[key]) lines.push(`  ${cssVar}: ${d[key]};`);
    }
    if (d.text) { const rgb = hexToRgb(d.text); lines.push(`  --shadow: rgba(${rgb},0.2);`, `  --shadow-lg: rgba(${rgb},0.3);`); }
    lines.push('}');
  }
  style.textContent = lines.join('\n');
}

export async function loadAndApplyColors() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'colors').single();
    if (data?.value) {
      const colors = JSON.parse(data.value);
      applyColors(colors);
      injectDarkColorOverrides(colors);
    }
  } catch (e) { /* defaults */ }
}

// ── Course Palette Override ──

export function applyCoursePalette(paletteColors) {
  if (!paletteColors) return;
  const id = 'klarzeit-course-palette';
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }

  const lines = [];
  const l = paletteColors.light;
  if (l) {
    lines.push(':root {');
    for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
      if (l[key]) lines.push(`  ${cssVar}: ${l[key]};`);
    }
    if (l.text) { const rgb = hexToRgb(l.text); lines.push(`  --shadow: rgba(${rgb},0.06);`, `  --shadow-lg: rgba(${rgb},0.12);`); }
    lines.push('}');
  }
  const d = paletteColors.dark;
  if (d) {
    lines.push('body.dark {');
    for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
      if (d[key]) lines.push(`  ${cssVar}: ${d[key]};`);
    }
    if (d.text) { const rgb = hexToRgb(d.text); lines.push(`  --shadow: rgba(${rgb},0.2);`, `  --shadow-lg: rgba(${rgb},0.3);`); }
    lines.push('}');
  }
  style.textContent = lines.join('\n');
}

export function restoreGlobalColors() {
  const el = document.getElementById('klarzeit-course-palette');
  if (el) el.remove();
}

// Re-export TYPO_LEVELS for admin editor
export { TYPO_LEVELS, COLOR_VAR_MAP, hexToRgb };
