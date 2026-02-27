import { sb } from './config.js';
import { esc, showToast } from './utils.js';
import { uploadImage } from './upload.js';

// ── STATE ──

let currentPageId = null;
let currentBlogId = null;
let currentSections = [];
let editingSectionIndex = -1;

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero', icon: 'star' },
  { value: 'text', label: 'Text', icon: 'align-left' },
  { value: 'text_italic', label: 'Text kursiv', icon: 'italic' },
  { value: 'text_bold', label: 'Text fett', icon: 'bold' },
  { value: 'profile', label: 'Profil', icon: 'user' },
  { value: 'features', label: 'Features', icon: 'grid' },
  { value: 'testimonials', label: 'Testimonials', icon: 'message-circle' },
  { value: 'cta', label: 'Call to Action', icon: 'zap' },
  { value: 'image', label: 'Bild', icon: 'image' },
  { value: 'accordion', label: 'Akkordeon', icon: 'list' },
  { value: 'faq', label: 'FAQ', icon: 'help-circle' },
  { value: 'divider', label: 'Trennlinie', icon: 'minus' },
  { value: 'spacer', label: 'Abstand', icon: 'maximize' },
];

function sectionIcon(type) {
  const icons = {
    hero: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    text: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
    text_italic: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
    text_bold: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>',
    profile: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    features: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    testimonials: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    blog_title: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>',
    blog_subtitle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>',
    blog_cta: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    cta: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    accordion: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><line x1="19" y1="10" x2="19" y2="14"/></svg>',
    faq: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    divider: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    spacer: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  };
  return icons[type] || '';
}

function sectionLabel(type) {
  const blogLabels = { blog_title: 'Titel', blog_subtitle: 'Untertitel', blog_cta: 'Call to Action' };
  if (blogLabels[type]) return blogLabels[type];
  const t = SECTION_TYPES.find(s => s.value === type);
  return t ? t.label : type;
}

// ══════════════════════════════════════
// PAGE MANAGEMENT
// ══════════════════════════════════════

export async function loadPageEditor() {
  const el = document.getElementById('adminPagesList');
  if (!el) return;
  el.innerHTML = '<div class="empty-state">Lade Seiten...</div>';

  const { data: pages, error } = await sb
    .from('pages')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('loadPageEditor:', error);
    el.innerHTML = '<div class="empty-state">Fehler beim Laden.</div>';
    return;
  }

  if (!pages || !pages.length) {
    el.innerHTML = '<div class="empty-state">Noch keine Seiten angelegt.</div>';
    return;
  }

  el.innerHTML = pages.map(p => `
    <div class="drag-item" draggable="true" data-id="${p.id}" data-sort="${p.sort_order}">
      <span class="drag-handle" title="Ziehen zum Sortieren">&#x2807;</span>
      <div style="flex:1;min-width:0;">
        <strong>${esc(p.title)}</strong>
        <span style="color:var(--text-muted);font-size:13px;margin-left:8px;">/${esc(p.slug)}</span>
      </div>
      <span class="badge ${p.is_published ? 'badge-success' : 'badge-muted'}" style="margin-right:8px;">
        ${p.is_published ? 'Live' : 'Entwurf'}
      </span>
      <div class="actions-cell">
        <button class="icon-btn" data-action="editPage" data-args='["${p.id}"]' title="Bearbeiten">&#x270E;</button>
        <button class="icon-btn delete" data-action="deletePage" data-args='["${p.id}"]' title="Loeschen">&#x2715;</button>
      </div>
    </div>
  `).join('');

  initPageDragDrop();
}

export async function savePage() {
  const title = document.getElementById('pageNameInput')?.value.trim();
  const slug = document.getElementById('pageSlugInput')?.value.trim();
  const meta_description = document.getElementById('pageMetaDescInput')?.value.trim() || '';
  const is_published = document.getElementById('pagePublishedInput')?.checked || false;
  const editId = document.getElementById('editPageId')?.value || null;

  if (!title || !slug) {
    showToast('Titel und Slug sind Pflichtfelder.', 'error');
    return;
  }

  const row = { title, slug, meta_description, is_published };
  let result;

  if (editId) {
    result = await sb.from('pages').update(row).eq('id', editId).select().single();
  } else {
    // Get max sort_order for new page
    const { data: maxRow } = await sb.from('pages').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
    row.sort_order = (maxRow?.sort_order ?? -1) + 1;
    row.sections = [];
    result = await sb.from('pages').insert(row).select().single();
  }

  if (result.error) {
    console.error('savePage:', result.error);
    showToast('Fehler beim Speichern der Seite.', 'error');
    return;
  }

  showToast('Seite gespeichert.');
  currentPageId = result.data.id;
  await loadPageEditor();
  loadPageSections(currentPageId);
}

export async function editPage(id) {
  const { data: page, error } = await sb.from('pages').select('*').eq('id', id).single();
  if (error || !page) {
    showToast('Seite nicht gefunden.', 'error');
    return;
  }

  document.getElementById('editPageId').value = page.id;
  document.getElementById('pageNameInput').value = page.title || '';
  document.getElementById('pageSlugInput').value = page.slug || '';
  document.getElementById('pageMetaDescInput').value = page.meta_description || '';
  document.getElementById('pagePublishedInput').checked = !!page.is_published;

  currentPageId = page.id;
  loadPageSections(page.id);
}

export async function deletePage(id) {
  if (!confirm('Seite wirklich loeschen? Alle Inhalte gehen verloren.')) return;
  const { error } = await sb.from('pages').delete().eq('id', id);
  if (error) {
    console.error('deletePage:', error);
    showToast('Fehler beim Loeschen.', 'error');
    return;
  }
  showToast('Seite geloescht.');
  if (currentPageId === id) {
    currentPageId = null;
    currentSections = [];
    const secEl = document.getElementById('pageSectionsEditor');
    if (secEl) secEl.style.display = 'none';
  }
  resetPageForm();
  loadPageEditor();
}

export function resetPageForm() {
  const f = document.getElementById('editPageId');
  if (f) f.value = '';
  const n = document.getElementById('pageNameInput');
  if (n) n.value = '';
  const s = document.getElementById('pageSlugInput');
  if (s) s.value = '';
  const m = document.getElementById('pageMetaDescInput');
  if (m) m.value = '';
  const p = document.getElementById('pagePublishedInput');
  if (p) p.checked = false;
  currentPageId = null;
}

// ══════════════════════════════════════
// SECTION MANAGEMENT
// ══════════════════════════════════════

export async function loadPageSections(pageId) {
  const wrap = document.getElementById('pageSectionsEditor');
  if (!wrap) return;
  wrap.style.display = 'block';

  currentPageId = pageId;
  editingSectionIndex = -1;

  const { data: page, error } = await sb.from('pages').select('sections').eq('id', pageId).single();
  if (error) {
    console.error('loadPageSections:', error);
    showToast('Fehler beim Laden der Sektionen.', 'error');
    return;
  }

  currentSections = Array.isArray(page?.sections) ? page.sections : [];
  renderSectionsList();
  resetSectionForm();
}

function renderSectionsList() {
  const el = document.getElementById('adminSectionsList');
  if (!el) return;

  if (!currentSections.length) {
    el.innerHTML = '<div class="empty-state">Noch keine Sektionen. Fuege die erste hinzu.</div>';
    return;
  }

  el.innerHTML = currentSections.map((sec, i) => {
    const preview = getSectionPreview(sec);
    return `
      <div class="drag-item section-card" draggable="true" data-id="${i}" data-sort="${i}">
        <span class="drag-handle" title="Ziehen zum Sortieren">&#x2807;</span>
        <div class="section-card-header">
          ${sectionIcon(sec.type)}
          <strong style="margin-left:6px;">${esc(sectionLabel(sec.type))}</strong>
        </div>
        <div class="section-card-preview">${esc(preview)}</div>
        <div class="actions-cell">
          <button class="icon-btn" data-action="editSection" data-args='[${i}]' title="Bearbeiten">&#x270E;</button>
          <button class="icon-btn delete" data-action="deleteSection" data-args='[${i}]' title="Loeschen">&#x2715;</button>
        </div>
      </div>
    `;
  }).join('');

  initSectionDragDrop();
}

function getSectionPreview(sec) {
  const c = sec.content || sec;
  switch (sec.type) {
    case 'hero': return c.heading || '';
    case 'text': return (c.text || c.body || '').substring(0, 80);
    case 'profile': return c.name || c.heading || 'Profil';
    case 'features': return c.heading || `${(c.items || []).length} Features`;
    case 'testimonials': return c.heading || `${(c.items || []).length} Testimonials`;
    case 'cta': return c.heading || '';
    case 'image': return c.alt || c.caption || 'Bild';
    case 'accordion': return c.heading || `${(c.items || []).length} Eintraege`;
    case 'faq': return c.heading || `${(c.items || []).length} Fragen`;
    case 'divider': return 'Trennlinie';
    case 'spacer': return `${c.height || 40}px Abstand`;
    default: return sec.type;
  }
}

export function addSection() {
  const typeSelect = document.getElementById('sectionTypeSelect');
  if (!typeSelect) return;
  const type = typeSelect.value;
  if (!type) {
    showToast('Bitte Sektionstyp auswaehlen.', 'error');
    return;
  }

  editingSectionIndex = -1;
  renderSectionFields(type, {});
}

export function onSectionTypeChange() {
  const type = document.getElementById('sectionTypeSelect')?.value;
  if (!type) {
    const wrap = document.getElementById('sectionFieldsWrap');
    if (wrap) wrap.innerHTML = '';
    return;
  }
  // Only render fields if we're in "add new" mode (not editing existing)
  if (editingSectionIndex === -1) {
    renderSectionFields(type, {});
  }
}

function renderSectionFields(type, content) {
  const wrap = document.getElementById('sectionFieldsWrap');
  if (!wrap) return;

  const renderers = {
    hero: renderHeroFields,
    text: renderTextFields,
    text_italic: renderTextFields,
    text_bold: renderTextFields,
    profile: renderProfileFields,
    features: renderFeaturesFields,
    testimonials: renderTestimonialsFields,
    cta: renderCtaFields,
    image: renderImageFields,
    accordion: renderAccordionFields,
    faq: renderFaqFields,
    divider: renderDividerFields,
    spacer: renderSpacerFields,
  };

  const renderer = renderers[type];
  if (!renderer) {
    wrap.innerHTML = '<div class="empty-state">Unbekannter Sektionstyp.</div>';
    return;
  }

  wrap.innerHTML = renderer(content || {}) + `
    <div class="actions" style="margin-top:16px;">
      <button class="btn" data-action="saveSectionFields">Sektion speichern</button>
      <button class="btn btn-ghost" data-action="resetSectionForm">Abbrechen</button>
    </div>
  `;

  initPageBuilderImageZones();
}

export async function saveSectionFields() {
  const type = document.getElementById('sectionTypeSelect')?.value;
  if (!type) {
    showToast('Kein Sektionstyp gewaehlt.', 'error');
    return;
  }

  const content = readSectionContent(type);
  if (!content) return;

  // Handle image upload for hero & image sections
  const imgInput = document.getElementById('pbImageInput');
  if (imgInput && imgInput.files.length) {
    try {
      const url = await uploadImage(imgInput.files[0], 'pages');
      if (type === 'hero') content.hero_image = url;
      if (type === 'profile') content.image = url;
      if (type === 'image') content.url = url;
    } catch (e) {
      console.error('Image upload:', e);
      showToast('Fehler beim Bildupload.', 'error');
      return;
    }
  }

  const section = { type, content, sort_order: 0 };

  if (editingSectionIndex >= 0 && editingSectionIndex < currentSections.length) {
    currentSections[editingSectionIndex] = section;
  } else {
    currentSections.push(section);
  }

  // Re-index sort_order
  currentSections.forEach((s, i) => { s.sort_order = i; });

  const { error } = await sb.from('pages').update({ sections: currentSections }).eq('id', currentPageId);
  if (error) {
    console.error('saveSectionFields:', error);
    showToast('Fehler beim Speichern.', 'error');
    return;
  }

  showToast('Sektion gespeichert.');
  renderSectionsList();
  resetSectionForm();
}

export function editSection(index) {
  if (index < 0 || index >= currentSections.length) return;
  const sec = currentSections[index];
  editingSectionIndex = index;

  const typeSelect = document.getElementById('sectionTypeSelect');
  if (typeSelect) typeSelect.value = sec.type;

  renderSectionFields(sec.type, sec.content || sec);
}

export async function deleteSection(index) {
  if (index < 0 || index >= currentSections.length) return;
  if (!confirm('Sektion wirklich entfernen?')) return;

  currentSections.splice(index, 1);
  currentSections.forEach((s, i) => { s.sort_order = i; });

  const { error } = await sb.from('pages').update({ sections: currentSections }).eq('id', currentPageId);
  if (error) {
    console.error('deleteSection:', error);
    showToast('Fehler beim Loeschen.', 'error');
    return;
  }

  showToast('Sektion entfernt.');
  renderSectionsList();
  resetSectionForm();
}

export function resetSectionForm() {
  editingSectionIndex = -1;
  const typeSelect = document.getElementById('sectionTypeSelect');
  if (typeSelect) typeSelect.value = '';
  const wrap = document.getElementById('sectionFieldsWrap');
  if (wrap) wrap.innerHTML = '';
}

// ── READ SECTION CONTENT ──

function readSectionContent(type) {
  const val = (id) => document.getElementById(id)?.value.trim() || '';

  switch (type) {
    case 'hero':
      return {
        label: val('pbHeroLabel'),
        heading: val('pbHeroHeading'),
        description: val('pbHeroDescription'),
        subheading: val('pbHeroSubheading'),
        cta_text: val('pbHeroCtaText'),
        cta_link: val('pbHeroCtaLink'),
        cta_text_2: val('pbHeroCtaText2'),
        cta_link_2: val('pbHeroCtaLink2'),
        hero_image: val('pbHeroImage'),
        stats: [
          { label: val('pbHeroStat1Label'), value: val('pbHeroStat1Value') },
          { label: val('pbHeroStat2Label'), value: val('pbHeroStat2Value') },
          { label: val('pbHeroStat3Label'), value: val('pbHeroStat3Value') },
        ],
      };
    case 'blog_title':
    case 'blog_subtitle':
    case 'text':
    case 'text_italic':
    case 'text_bold':
      return { title: val('pbTextTitle'), subtitle: val('pbTextSubtitle'), text: val('pbText') };
    case 'blog_cta':
      return {
        text: val('pbText'),
        button_text: val('pbCtaBtnText'),
        button_link: val('pbCtaBtnLink'),
      };
    case 'profile':
      return {
        heading: val('pbProfileHeading'),
        image: val('pbProfileImage'),
        name: val('pbProfileName'),
        subtitle: val('pbProfileSubtitle'),
        text: val('pbProfileText'),
      };
    case 'features':
      return {
        heading: val('pbFeaturesHeading'),
        items: readDynamicItems('pbFeaturesList', ['icon', 'title', 'description']),
      };
    case 'testimonials':
      return {
        heading: val('pbTestimonialsHeading'),
        items: readDynamicItems('pbTestimonialsList', ['quote', 'author', 'role']),
      };
    case 'cta':
      return {
        heading: val('pbCtaHeading'),
        subheading: val('pbCtaSubheading'),
        button_text: val('pbCtaBtnText'),
        button_link: val('pbCtaBtnLink'),
      };
    case 'image':
      return {
        url: val('pbImageUrl'),
        alt: val('pbImageAlt'),
        caption: val('pbImageCaption'),
      };
    case 'accordion':
      return {
        heading: val('pbAccordionHeading'),
        items: readDynamicItems('pbAccordionList', ['title', 'description']),
      };
    case 'faq':
      return {
        heading: val('pbFaqHeading'),
        items: readDynamicItems('pbFaqList', ['question', 'answer']),
      };
    case 'divider':
      return {};
    case 'spacer':
      return { height: parseInt(val('pbSpacerHeight'), 10) || 40 };
    default:
      return {};
  }
}

function readDynamicItems(listId, fields) {
  const list = document.getElementById(listId);
  if (!list) return [];
  const items = [];
  list.querySelectorAll('.dynamic-item').forEach(row => {
    const item = {};
    fields.forEach(f => {
      const input = row.querySelector(`[data-field="${f}"]`);
      if (input) item[f] = input.value.trim();
    });
    // Only add item if at least one field has content
    if (fields.some(f => item[f])) items.push(item);
  });
  return items;
}

// ── SECTION TYPE FIELD RENDERERS ──

function renderHeroFields(content) {
  const stats = content.stats || [{}, {}, {}];
  return `
    <div class="form-group">
      <label class="form-label">Label (klein, oben)</label>
      <input type="text" class="form-input" id="pbHeroLabel" value="${esc(content.label || '')}" placeholder="z.B. Studio Klarzeit — Elin Graf">
    </div>
    <div class="form-group">
      <label class="form-label">Ueberschrift</label>
      <input type="text" class="form-input" id="pbHeroHeading" value="${esc(content.heading || '')}" placeholder="Ueberschrift">
    </div>
    <div class="form-group">
      <label class="form-label">Beschreibung</label>
      <textarea class="form-textarea" id="pbHeroDescription" rows="3" placeholder="Beschreibungstext">${esc(content.description || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Kursiver Subtext</label>
      <textarea class="form-textarea" id="pbHeroSubheading" rows="2" placeholder="Kursiver Text unter der Beschreibung">${esc(content.subheading || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">CTA-Button 1</label>
      <div style="display:flex;gap:8px;">
        <input type="text" class="form-input" id="pbHeroCtaText" value="${esc(content.cta_text || '')}" placeholder="Button-Text" style="flex:1;">
        <input type="text" class="form-input" id="pbHeroCtaLink" value="${esc(content.cta_link || '')}" placeholder="Link" style="flex:1;">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">CTA-Button 2 (Outline)</label>
      <div style="display:flex;gap:8px;">
        <input type="text" class="form-input" id="pbHeroCtaText2" value="${esc(content.cta_text_2 || '')}" placeholder="Button-Text" style="flex:1;">
        <input type="text" class="form-input" id="pbHeroCtaLink2" value="${esc(content.cta_link_2 || '')}" placeholder="Link" style="flex:1;">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Hero-Bild (rechte Seite)</label>
      <input type="hidden" id="pbHeroImage" value="${esc(content.hero_image || '')}">
      <input type="file" id="pbImageInput" accept="image/*" style="display:none;" data-change="handlePbImageSelect">
      <div class="image-upload-zone" id="pbImagePreview" data-action="triggerClickOn" data-args='["pbImageInput"]'>
        ${content.hero_image
          ? `<img src="${esc(content.hero_image)}" alt="Vorschau"><button class="image-remove-btn" data-action="removePbImage" data-args='["pbHeroImage"]' data-stop title="Bild entfernen">&#x2715;</button>`
          : '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>'}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Info-Zeile (3 Eintraege)</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <input type="text" class="form-input" id="pbHeroStat1Label" value="${esc(stats[0]?.label || '')}" placeholder="Label 1">
        <input type="text" class="form-input" id="pbHeroStat1Value" value="${esc(stats[0]?.value || '')}" placeholder="Wert 1">
        <input type="text" class="form-input" id="pbHeroStat2Label" value="${esc(stats[1]?.label || '')}" placeholder="Label 2">
        <input type="text" class="form-input" id="pbHeroStat2Value" value="${esc(stats[1]?.value || '')}" placeholder="Wert 2">
        <input type="text" class="form-input" id="pbHeroStat3Label" value="${esc(stats[2]?.label || '')}" placeholder="Label 3">
        <input type="text" class="form-input" id="pbHeroStat3Value" value="${esc(stats[2]?.value || '')}" placeholder="Wert 3">
      </div>
    </div>
  `;
}

function renderTextFields(content) {
  return `
    <div class="form-group">
      <label class="form-label">Titel (optional)</label>
      <input type="text" class="form-input" id="pbTextTitle" value="${esc(content.title || '')}" placeholder="Optionaler Titel">
    </div>
    <div class="form-group">
      <label class="form-label">Untertitel (optional)</label>
      <input type="text" class="form-input" id="pbTextSubtitle" value="${esc(content.subtitle || '')}" placeholder="Optionaler Untertitel">
    </div>
    <div class="form-group">
      <label class="form-label">Text</label>
      <textarea class="form-textarea" id="pbText" rows="10" placeholder="Text eingeben... (Zeilenumbrueche werden uebernommen)">${esc(content.text || '')}</textarea>
    </div>
  `;
}

function renderProfileFields(content) {
  return `
    <div class="form-group">
      <label class="form-label">Ueberschrift (optional)</label>
      <input type="text" class="form-input" id="pbProfileHeading" value="${esc(content.heading || '')}" placeholder="z.B. Ueber die Autorin">
    </div>
    <div class="form-group">
      <label class="form-label">Profilbild</label>
      <input type="hidden" id="pbProfileImage" value="${esc(content.image || '')}">
      <input type="file" id="pbImageInput" accept="image/*" style="display:none;" data-change="handlePbImageSelect">
      <div class="image-upload-zone" id="pbImagePreview" data-action="triggerClickOn" data-args='["pbImageInput"]'>
        ${content.image
          ? `<img src="${esc(content.image)}" alt="Vorschau"><button class="image-remove-btn" data-action="removePbImage" data-args='["pbProfileImage"]' data-stop title="Bild entfernen">&#x2715;</button>`
          : '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>'}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="pbProfileName" value="${esc(content.name || '')}" placeholder="Name">
    </div>
    <div class="form-group">
      <label class="form-label">Untertitel</label>
      <input type="text" class="form-input" id="pbProfileSubtitle" value="${esc(content.subtitle || '')}" placeholder="z.B. Titel, Beruf">
    </div>
    <div class="form-group">
      <label class="form-label">Text</label>
      <textarea class="form-textarea" id="pbProfileText" rows="8" placeholder="Beschreibung (Zeilenumbrueche werden uebernommen)">${esc(content.text || '')}</textarea>
    </div>
  `;
}

function renderFeaturesFields(content) {
  const items = content.items || [];
  return `
    <div class="form-group">
      <label class="form-label">Ueberschrift</label>
      <input type="text" class="form-input" id="pbFeaturesHeading" value="${esc(content.heading || '')}" placeholder="Features-Ueberschrift">
    </div>
    <div class="form-group">
      <label class="form-label">Features</label>
      <div id="pbFeaturesList">
        ${items.map((item, i) => renderFeatureItem(item, i)).join('')}
      </div>
      <button class="btn btn-ghost" data-action="addDynamicItem" data-args='["pbFeaturesList","feature"]' style="margin-top:8px;">+ Feature hinzufuegen</button>
    </div>
  `;
}

function renderFeatureItem(item, index) {
  return `
    <div class="dynamic-item" data-index="${index}">
      <div style="display:flex;gap:8px;align-items:start;margin-bottom:8px;">
        <div style="flex:1;">
          <textarea class="form-textarea" data-field="icon" rows="2" placeholder="Icon (SVG oder Emoji)">${esc(item.icon || '')}</textarea>
        </div>
        <button class="icon-btn delete" data-action="removeDynamicItem" data-el title="Entfernen">&#x2715;</button>
      </div>
      <input type="text" class="form-input" data-field="title" value="${esc(item.title || '')}" placeholder="Titel" style="margin-bottom:6px;">
      <textarea class="form-textarea" data-field="description" rows="2" placeholder="Beschreibung">${esc(item.description || '')}</textarea>
    </div>
  `;
}

function renderTestimonialsFields(content) {
  const items = content.items || [];
  return `
    <div class="form-group">
      <label class="form-label">Ueberschrift</label>
      <input type="text" class="form-input" id="pbTestimonialsHeading" value="${esc(content.heading || '')}" placeholder="Testimonials-Ueberschrift">
    </div>
    <div class="form-group">
      <label class="form-label">Testimonials</label>
      <div id="pbTestimonialsList">
        ${items.map((item, i) => renderTestimonialItem(item, i)).join('')}
      </div>
      <button class="btn btn-ghost" data-action="addDynamicItem" data-args='["pbTestimonialsList","testimonial"]' style="margin-top:8px;">+ Testimonial hinzufuegen</button>
    </div>
  `;
}

function renderTestimonialItem(item, index) {
  return `
    <div class="dynamic-item" data-index="${index}">
      <div style="display:flex;gap:8px;align-items:start;margin-bottom:8px;">
        <textarea class="form-textarea" data-field="quote" rows="3" placeholder="Zitat" style="flex:1;">${esc(item.quote || '')}</textarea>
        <button class="icon-btn delete" data-action="removeDynamicItem" data-el title="Entfernen">&#x2715;</button>
      </div>
      <div style="display:flex;gap:8px;">
        <input type="text" class="form-input" data-field="author" value="${esc(item.author || '')}" placeholder="Name" style="flex:1;">
        <input type="text" class="form-input" data-field="role" value="${esc(item.role || '')}" placeholder="Rolle / Titel" style="flex:1;">
      </div>
    </div>
  `;
}

function renderCtaFields(content) {
  return `
    <div class="form-group">
      <label class="form-label">Ueberschrift</label>
      <input type="text" class="form-input" id="pbCtaHeading" value="${esc(content.heading || '')}" placeholder="Ueberschrift">
    </div>
    <div class="form-group">
      <label class="form-label">Unterueberschrift</label>
      <input type="text" class="form-input" id="pbCtaSubheading" value="${esc(content.subheading || '')}" placeholder="Unterueberschrift">
    </div>
    <div class="form-group">
      <label class="form-label">Button-Text</label>
      <input type="text" class="form-input" id="pbCtaBtnText" value="${esc(content.button_text || '')}" placeholder="z.B. Jetzt starten">
    </div>
    <div class="form-group">
      <label class="form-label">Button-Link</label>
      <input type="text" class="form-input" id="pbCtaBtnLink" value="${esc(content.button_link || '')}" placeholder="/kurs/abc">
    </div>
  `;
}

function renderImageFields(content) {
  return `
    <div class="form-group">
      <label class="form-label">Bild</label>
      <input type="hidden" id="pbImageUrl" value="${esc(content.url || '')}">
      <input type="file" id="pbImageInput" accept="image/*" style="display:none;" data-change="handlePbImageSelect">
      <div class="image-upload-zone" id="pbImagePreview" data-action="triggerClickOn" data-args='["pbImageInput"]'>
        ${content.url
          ? `<img src="${esc(content.url)}" alt="Vorschau"><button class="image-remove-btn" data-action="removePbImage" data-args='["pbImageUrl"]' data-stop title="Bild entfernen">&#x2715;</button>`
          : '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>'}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Alt-Text</label>
      <input type="text" class="form-input" id="pbImageAlt" value="${esc(content.alt || '')}" placeholder="Bildbeschreibung">
    </div>
    <div class="form-group">
      <label class="form-label">Bildunterschrift</label>
      <input type="text" class="form-input" id="pbImageCaption" value="${esc(content.caption || '')}" placeholder="Optionale Bildunterschrift">
    </div>
  `;
}

function renderDividerFields(_content) {
  return '<p style="color:var(--text-muted);font-style:italic;">Trennlinie hat keine weiteren Einstellungen.</p>';
}

function renderSpacerFields(content) {
  return `
    <div class="form-group">
      <label class="form-label">Hoehe (px)</label>
      <input type="number" class="form-input" id="pbSpacerHeight" value="${content.height || 40}" min="0" max="500" placeholder="40">
    </div>
  `;
}

// ── IMAGE HELPERS ──

function initPageBuilderImageZones() {
  const zone = document.getElementById('pbImagePreview');
  if (!zone) return;
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--text-muted)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const input = document.getElementById('pbImageInput');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handlePbImageSelect();
    }
  });
}

export function handlePbImageSelect() {
  const input = document.getElementById('pbImageInput');
  const file = input?.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const zone = document.getElementById('pbImagePreview');
    if (!zone) return;
    // Determine which hidden URL field to use based on current section type
    const type = document.getElementById('sectionTypeSelect')?.value;
    const hiddenId = type === 'hero' ? 'pbHeroImage' : type === 'profile' ? 'pbProfileImage' : 'pbImageUrl';
    zone.innerHTML = `<img src="${e.target.result}" alt="Vorschau"><button class="image-remove-btn" data-action="removePbImage" data-args='["${hiddenId}"]' data-stop title="Bild entfernen">&#x2715;</button>`;
    zone.classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

export function removePbImage(hiddenFieldId) {
  const hidden = document.getElementById(hiddenFieldId);
  if (hidden) hidden.value = '';
  const input = document.getElementById('pbImageInput');
  if (input) input.value = '';
  const zone = document.getElementById('pbImagePreview');
  if (zone) {
    zone.classList.remove('has-image');
    zone.innerHTML = '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>';
  }
}

// ── DYNAMIC LIST HELPERS ──

export function addDynamicItem(listId, type) {
  const list = document.getElementById(listId);
  if (!list) return;
  const index = list.querySelectorAll('.dynamic-item').length;
  const html = type === 'feature' ? renderFeatureItem({}, index)
    : type === 'testimonial' ? renderTestimonialItem({}, index)
    : type === 'accordion' ? renderAccordionItem({}, index)
    : type === 'faq' ? renderFaqItem({}, index)
    : '';
  list.insertAdjacentHTML('beforeend', html);
}

export function removeDynamicItem(btn) {
  const item = btn.closest('.dynamic-item');
  if (item) item.remove();
}

// ══════════════════════════════════════
// BLOG POST MANAGEMENT
// ══════════════════════════════════════

export async function loadBlogEditor() {
  const el = document.getElementById('adminBlogList');
  if (!el) return;
  el.innerHTML = '<div class="empty-state">Lade Blog-Beitraege...</div>';

  const { data: posts, error } = await sb
    .from('blog_posts')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('loadBlogEditor:', error);
    el.innerHTML = '<div class="empty-state">Fehler beim Laden.</div>';
    return;
  }

  if (!posts || !posts.length) {
    el.innerHTML = '<div class="empty-state">Noch keine Blog-Beitraege.</div>';
    return;
  }

  el.innerHTML = posts.map(p => {
    const date = p.published_at ? new Date(p.published_at).toLocaleDateString('de-DE') : '---';
    return `
      <div class="drag-item" data-id="${p.id}">
        <div style="flex:1;min-width:0;">
          <strong>${esc(p.title)}</strong>
          <span style="color:var(--text-muted);font-size:13px;margin-left:8px;">/${esc(p.slug)}</span>
        </div>
        <span style="color:var(--text-muted);font-size:13px;margin-right:8px;">${date}</span>
        <span class="badge ${p.is_published ? 'badge-success' : 'badge-muted'}" style="margin-right:8px;">
          ${p.is_published ? 'Live' : 'Entwurf'}
        </span>
        <div class="actions-cell">
          <button class="icon-btn" data-action="editBlogPost" data-args='["${p.id}"]' title="Bearbeiten">&#x270E;</button>
          <button class="icon-btn delete" data-action="deleteBlogPost" data-args='["${p.id}"]' title="Loeschen">&#x2715;</button>
        </div>
      </div>
    `;
  }).join('');
}

export async function saveBlogPost() {
  const title = document.getElementById('blogTitleInput')?.value.trim();
  const slug = document.getElementById('blogSlugInput')?.value.trim();
  const excerpt = document.getElementById('blogExcerptInput')?.value.trim() || '';
  const meta_description = document.getElementById('blogMetaDescInput')?.value.trim() || '';
  const author = document.getElementById('blogAuthorInput')?.value.trim() || '';
  const is_published = document.getElementById('blogPublishedInput')?.checked || false;
  let cover_image = document.getElementById('blogCoverImageUrl')?.value || '';
  const editId = document.getElementById('editBlogId')?.value || null;

  if (!title || !slug) {
    showToast('Titel und Slug sind Pflichtfelder.', 'error');
    return;
  }

  // Upload cover image if a new file was selected
  const coverInput = document.getElementById('blogCoverImageInput');
  if (coverInput && coverInput.files.length) {
    try {
      cover_image = await uploadImage(coverInput.files[0], 'blog');
      document.getElementById('blogCoverImageUrl').value = cover_image;
    } catch (e) {
      console.error('Cover image upload:', e);
      showToast('Fehler beim Bildupload.', 'error');
      return;
    }
  }

  const row = { title, slug, excerpt, meta_description, author, is_published, cover_image };
  if (is_published && !editId) {
    row.published_at = new Date().toISOString();
  }

  let result;

  if (editId) {
    // If toggling to published for the first time, set published_at
    if (is_published) {
      const { data: existing } = await sb.from('blog_posts').select('published_at').eq('id', editId).single();
      if (!existing?.published_at) row.published_at = new Date().toISOString();
    }
    result = await sb.from('blog_posts').update(row).eq('id', editId).select().single();
  } else {
    row.content = [];
    result = await sb.from('blog_posts').insert(row).select().single();
  }

  if (result.error) {
    console.error('saveBlogPost:', result.error);
    showToast('Fehler beim Speichern.', 'error');
    return;
  }

  showToast('Blog-Beitrag gespeichert.');
  currentBlogId = result.data.id;
  await loadBlogEditor();
  loadBlogSections(currentBlogId);
}

export async function editBlogPost(id) {
  const { data: post, error } = await sb.from('blog_posts').select('*').eq('id', id).single();
  if (error || !post) {
    showToast('Beitrag nicht gefunden.', 'error');
    return;
  }

  document.getElementById('editBlogId').value = post.id;
  document.getElementById('blogTitleInput').value = post.title || '';
  document.getElementById('blogSlugInput').value = post.slug || '';
  document.getElementById('blogExcerptInput').value = post.excerpt || '';
  document.getElementById('blogMetaDescInput').value = post.meta_description || '';
  document.getElementById('blogAuthorInput').value = post.author || '';
  document.getElementById('blogPublishedInput').checked = !!post.is_published;
  document.getElementById('blogCoverImageUrl').value = post.cover_image || '';

  // Show existing cover image in preview
  const preview = document.getElementById('blogCoverImagePreview');
  if (preview) {
    if (post.cover_image) {
      preview.innerHTML = `<img src="${esc(post.cover_image)}" alt="Vorschau"><button class="image-remove-btn" data-action="removeBlogCoverImage" data-stop title="Bild entfernen">&#x2715;</button>`;
      preview.classList.add('has-image');
    } else {
      preview.innerHTML = '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>';
      preview.classList.remove('has-image');
    }
  }

  currentBlogId = post.id;
  loadBlogSections(post.id);
}

export async function deleteBlogPost(id) {
  if (!confirm('Blog-Beitrag wirklich loeschen?')) return;
  const { error } = await sb.from('blog_posts').delete().eq('id', id);
  if (error) {
    console.error('deleteBlogPost:', error);
    showToast('Fehler beim Loeschen.', 'error');
    return;
  }
  showToast('Blog-Beitrag geloescht.');
  if (currentBlogId === id) {
    currentBlogId = null;
    currentSections = [];
    const secEl = document.getElementById('blogSectionsEditor');
    if (secEl) secEl.style.display = 'none';
  }
  resetBlogForm();
  loadBlogEditor();
}

export function removeBlogCoverImage() {
  document.getElementById('blogCoverImageUrl').value = '';
  document.getElementById('blogCoverImageInput').value = '';
  const preview = document.getElementById('blogCoverImagePreview');
  if (preview) {
    preview.innerHTML = '<span class="image-upload-label">Bild hierher ziehen oder klicken</span>';
    preview.classList.remove('has-image');
  }
}

export function resetBlogForm() {
  const fields = ['editBlogId', 'blogTitleInput', 'blogSlugInput', 'blogExcerptInput', 'blogMetaDescInput', 'blogAuthorInput', 'blogCoverImageUrl'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const pub = document.getElementById('blogPublishedInput');
  if (pub) pub.checked = false;
  currentBlogId = null;
}

// ── BLOG SECTIONS (reuses page section logic) ──

export function onBlogSectionTypeChange() {
  const type = document.getElementById('blogSectionTypeSelect')?.value;
  const wrap = document.getElementById('blogSectionFieldsWrap');
  if (!type || !wrap) { if (wrap) wrap.innerHTML = ''; return; }
  if (editingSectionIndex === -1) {
    renderBlogSectionFields(type, {});
  }
}

function renderBlogSectionFields(type, content) {
  const wrap = document.getElementById('blogSectionFieldsWrap');
  if (!wrap) return;

  const renderers = {
    blog_title: renderTextFields,
    blog_subtitle: renderTextFields,
    text: renderTextFields,
    text_italic: renderTextFields,
    text_bold: renderTextFields,
    image: renderImageFields,
    blog_cta: renderBlogCtaFields,
    divider: renderDividerFields,
  };

  const renderer = renderers[type];
  if (!renderer) {
    wrap.innerHTML = '<div class="empty-state">Unbekannter Blocktyp.</div>';
    return;
  }
  wrap.innerHTML = renderer(content || {});
  initPageBuilderImageZones();
}

function renderBlogCtaFields(content) {
  return `
    <div class="form-group">
      <label class="form-label">Text</label>
      <textarea class="form-textarea" id="pbText" rows="3" placeholder="CTA-Text eingeben...">${esc(content.text || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Button-Text</label>
      <input type="text" class="form-input" id="pbCtaBtnText" value="${esc(content.button_text || '')}" placeholder="z.B. Jetzt starten">
    </div>
    <div class="form-group">
      <label class="form-label">Button-Link</label>
      <input type="text" class="form-input" id="pbCtaBtnLink" value="${esc(content.button_link || '')}" placeholder="z.B. / oder /kontakt">
    </div>
  `;
}

export function resetBlogSectionForm() {
  editingSectionIndex = -1;
  const typeSelect = document.getElementById('blogSectionTypeSelect');
  if (typeSelect) typeSelect.value = 'text';
  const wrap = document.getElementById('blogSectionFieldsWrap');
  if (wrap) wrap.innerHTML = '';
}

export async function loadBlogSections(postId) {
  const wrap = document.getElementById('blogSectionsEditor');
  if (!wrap) return;
  wrap.style.display = 'block';

  currentBlogId = postId;
  editingSectionIndex = -1;

  const { data: post, error } = await sb.from('blog_posts').select('content').eq('id', postId).single();
  if (error) {
    console.error('loadBlogSections:', error);
    showToast('Fehler beim Laden der Sektionen.', 'error');
    return;
  }

  currentSections = Array.isArray(post?.content) ? post.content : [];
  renderBlogSectionsList();
  resetSectionForm();
}

function renderBlogSectionsList() {
  const el = document.getElementById('adminBlogSectionsList');
  if (!el) return;

  if (!currentSections.length) {
    el.innerHTML = '<div class="empty-state">Noch keine Inhalte. Fuege die erste Sektion hinzu.</div>';
    return;
  }

  el.innerHTML = currentSections.map((sec, i) => {
    const preview = getSectionPreview(sec);
    return `
      <div class="drag-item section-card" draggable="true" data-id="${i}" data-sort="${i}">
        <span class="drag-handle" title="Ziehen zum Sortieren">&#x2807;</span>
        <div class="section-card-header">
          ${sectionIcon(sec.type)}
          <strong style="margin-left:6px;">${esc(sectionLabel(sec.type))}</strong>
        </div>
        <div class="section-card-preview">${esc(preview)}</div>
        <div class="actions-cell">
          <button class="icon-btn" data-action="editBlogSection" data-args='[${i}]' title="Bearbeiten">&#x270E;</button>
          <button class="icon-btn delete" data-action="deleteBlogSection" data-args='[${i}]' title="Loeschen">&#x2715;</button>
        </div>
      </div>
    `;
  }).join('');

  initBlogSectionDragDrop();
}

export function editBlogSection(index) {
  if (index < 0 || index >= currentSections.length) return;
  const sec = currentSections[index];
  editingSectionIndex = index;

  const typeSelect = document.getElementById('blogSectionTypeSelect');
  if (typeSelect) typeSelect.value = sec.type;

  renderBlogSectionFields(sec.type, sec.content || sec);
}

export async function deleteBlogSection(index) {
  if (index < 0 || index >= currentSections.length) return;
  if (!confirm('Sektion wirklich entfernen?')) return;

  currentSections.splice(index, 1);
  currentSections.forEach((s, i) => { s.sort_order = i; });

  const { error } = await sb.from('blog_posts').update({ content: currentSections }).eq('id', currentBlogId);
  if (error) {
    console.error('deleteBlogSection:', error);
    showToast('Fehler beim Loeschen.', 'error');
    return;
  }

  showToast('Sektion entfernt.');
  renderBlogSectionsList();
  resetBlogSectionForm();
}

export async function saveBlogSectionFields() {
  const type = document.getElementById('blogSectionTypeSelect')?.value;
  if (!type) {
    showToast('Kein Blocktyp gewaehlt.', 'error');
    return;
  }

  const content = readSectionContent(type);
  if (!content) return;

  // Handle image upload
  const imgInput = document.getElementById('pbImageInput');
  if (imgInput && imgInput.files.length) {
    try {
      const url = await uploadImage(imgInput.files[0], 'blog');
      if (type === 'image') content.url = url;
    } catch (e) {
      console.error('Image upload:', e);
      showToast('Fehler beim Bildupload.', 'error');
      return;
    }
  }

  const section = { type, content, sort_order: 0 };

  if (editingSectionIndex >= 0 && editingSectionIndex < currentSections.length) {
    currentSections[editingSectionIndex] = section;
  } else {
    currentSections.push(section);
  }

  currentSections.forEach((s, i) => { s.sort_order = i; });

  const { error } = await sb.from('blog_posts').update({ content: currentSections }).eq('id', currentBlogId);
  if (error) {
    console.error('saveBlogSectionFields:', error);
    showToast('Fehler beim Speichern.', 'error');
    return;
  }

  showToast('Block gespeichert.');
  renderBlogSectionsList();
  resetBlogSectionForm();
}

// ── FAQ ITEM RENDERER ──

function renderAccordionFields(content) {
  const items = content.items || [];
  return `
    <div class="form-group">
      <label class="form-label">Ueberschrift</label>
      <input type="text" class="form-input" id="pbAccordionHeading" value="${esc(content.heading || '')}" placeholder="Akkordeon-Ueberschrift">
    </div>
    <div class="form-group">
      <label class="form-label">Eintraege</label>
      <div id="pbAccordionList">
        ${items.map((item, i) => renderAccordionItem(item, i)).join('')}
      </div>
      <button class="btn btn-ghost" data-action="addDynamicItem" data-args='["pbAccordionList","accordion"]' style="margin-top:8px;">+ Eintrag hinzufuegen</button>
    </div>
  `;
}

function renderAccordionItem(item, index) {
  return `
    <div class="dynamic-item" data-index="${index}">
      <div style="display:flex;gap:8px;align-items:start;margin-bottom:8px;">
        <input type="text" class="form-input" data-field="title" value="${esc(item.title || '')}" placeholder="Titel" style="flex:1;">
        <button class="icon-btn delete" data-action="removeDynamicItem" data-el title="Entfernen">&#x2715;</button>
      </div>
      <textarea class="form-textarea" data-field="description" rows="3" placeholder="Beschreibung">${esc(item.description || '')}</textarea>
    </div>
  `;
}

function renderFaqFields(content) {
  const items = content.items || [];
  return `
    <div class="form-group">
      <label class="form-label">Ueberschrift</label>
      <input type="text" class="form-input" id="pbFaqHeading" value="${esc(content.heading || '')}" placeholder="FAQ-Ueberschrift">
    </div>
    <div class="form-group">
      <label class="form-label">Fragen</label>
      <div id="pbFaqList">
        ${items.map((item, i) => renderFaqItem(item, i)).join('')}
      </div>
      <button class="btn btn-ghost" data-action="addDynamicItem" data-args='["pbFaqList","faq"]' style="margin-top:8px;">+ Frage hinzufuegen</button>
    </div>
  `;
}

function renderFaqItem(item, index) {
  return `
    <div class="dynamic-item" data-index="${index}">
      <div style="display:flex;gap:8px;align-items:start;margin-bottom:8px;">
        <input type="text" class="form-input" data-field="question" value="${esc(item.question || '')}" placeholder="Frage" style="flex:1;">
        <button class="icon-btn delete" data-action="removeDynamicItem" data-el title="Entfernen">&#x2715;</button>
      </div>
      <textarea class="form-textarea" data-field="answer" rows="3" placeholder="Antwort">${esc(item.answer || '')}</textarea>
    </div>
  `;
}

// ══════════════════════════════════════
// DRAG & DROP
// ══════════════════════════════════════

export function initPageDragDrop() {
  const container = document.getElementById('adminPagesList');
  if (!container) return;
  initDragContainer(container, async (orderedIds) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await sb.from('pages').update({ sort_order: i }).eq('id', orderedIds[i]);
    }
    showToast('Reihenfolge aktualisiert.');
  });
}

function initSectionDragDrop() {
  const container = document.getElementById('adminSectionsList');
  if (!container) return;
  initDragContainer(container, async (orderedIds) => {
    const reordered = orderedIds.map(idx => currentSections[parseInt(idx, 10)]);
    reordered.forEach((s, i) => { s.sort_order = i; });
    currentSections = reordered;
    const { error } = await sb.from('pages').update({ sections: currentSections }).eq('id', currentPageId);
    if (error) {
      console.error('section reorder:', error);
      showToast('Fehler beim Sortieren.', 'error');
      return;
    }
    renderSectionsList();
    showToast('Reihenfolge aktualisiert.');
  });
}

function initBlogSectionDragDrop() {
  const container = document.getElementById('adminBlogSectionsList');
  if (!container) return;
  initDragContainer(container, async (orderedIds) => {
    const reordered = orderedIds.map(idx => currentSections[parseInt(idx, 10)]);
    reordered.forEach((s, i) => { s.sort_order = i; });
    currentSections = reordered;
    const { error } = await sb.from('blog_posts').update({ content: currentSections }).eq('id', currentBlogId);
    if (error) {
      console.error('blog section reorder:', error);
      showToast('Fehler beim Sortieren.', 'error');
      return;
    }
    renderBlogSectionsList();
    showToast('Reihenfolge aktualisiert.');
  });
}

function initDragContainer(container, onReorder) {
  let dragItem = null;

  container.querySelectorAll('.drag-item[draggable]').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      dragItem = null;
      container.querySelectorAll('.drag-item').forEach(el => el.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (item !== dragItem) item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (!dragItem || dragItem === item) return;

      const items = Array.from(container.querySelectorAll('.drag-item'));
      const fromIdx = items.indexOf(dragItem);
      const toIdx = items.indexOf(item);
      if (fromIdx < toIdx) item.after(dragItem); else item.before(dragItem);

      const orderedIds = Array.from(container.querySelectorAll('.drag-item')).map(el => el.dataset.id);
      await onReorder(orderedIds);
    });
  });
}
