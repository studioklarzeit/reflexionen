// ── PUBLIC PAGES (Landing, Blog, Contact) ──

import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast } from './utils.js';
import { navigateTo } from './navigation.js';

// ── Cache ──
let pageCache = {};
let blogListCache = null;
let blogPostCache = {};

// ── Date helper ──
const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function formatDateDE(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Section renderers ──

function renderHero(c) {
  const ctaText = c.cta_text || c.button_text || '';
  const ctaLink = c.cta_link || c.button_link || '';
  const ctaHtml = ctaText
    ? `<a class="pub-hero-cta" href="${esc(ctaLink || '#')}" data-action="__pubNav" data-args='["${esc(ctaLink)}"]' data-prevent>${esc(ctaText)}</a>`
    : '';
  const cta2Text = c.cta_text_2 || '';
  const cta2Link = c.cta_link_2 || '';
  const cta2Html = cta2Text
    ? `<a class="pub-hero-cta-secondary" href="${esc(cta2Link || '#')}" data-action="__pubNav" data-args='["${esc(cta2Link)}"]' data-prevent>${esc(cta2Text)}</a>`
    : '';
  const stats = Array.isArray(c.stats) ? c.stats.filter(s => s.label || s.value) : [];
  const statsHtml = stats.length
    ? `<div class="pub-hero-stats">${stats.map(s => `<div class="pub-hero-stat"><span class="pub-hero-stat-label">${esc(s.label || '')}</span><span class="pub-hero-stat-value">${esc(s.value || '')}</span></div>`).join('')}</div>`
    : '';

  return `
    <section class="pub-hero">
      <div class="pub-hero-text">
        ${c.label ? `<p class="pub-hero-label">${esc(c.label)}</p>` : ''}
        <h1 class="pub-hero-heading">${esc(c.heading || '')}</h1>
        ${c.description ? `<p class="pub-hero-desc">${esc(c.description)}</p>` : ''}
        ${c.subheading ? `<p class="pub-hero-sub">${esc(c.subheading)}</p>` : ''}
        ${(ctaHtml || cta2Html) ? `<div class="pub-hero-buttons">${ctaHtml}${cta2Html}</div>` : ''}
        ${statsHtml}
      </div>
      ${c.hero_image ? `<div class="pub-hero-image"><img src="${esc(c.hero_image)}" alt="${esc(c.heading || '')}" loading="lazy"></div>` : ''}
    </section>`;
}

function nl2br(str) { return (str || '').replace(/\n/g, '<br>'); }

function renderText(c) {
  const titleHtml = c.title ? `<h2 class="pub-text-title">${esc(c.title)}</h2>` : '';
  const subHtml = c.subtitle ? `<h3 class="pub-text-subtitle">${esc(c.subtitle)}</h3>` : '';
  return `<section class="pub-text">${titleHtml}${subHtml}${nl2br(esc(c.text || c.body || ''))}</section>`;
}

function renderTextItalic(c) {
  const titleHtml = c.title ? `<h2 class="pub-text-title">${esc(c.title)}</h2>` : '';
  const subHtml = c.subtitle ? `<h3 class="pub-text-subtitle">${esc(c.subtitle)}</h3>` : '';
  return `<section class="pub-text pub-text-italic">${titleHtml}${subHtml}<em>${nl2br(esc(c.text || c.body || ''))}</em></section>`;
}

function renderTextBold(c) {
  const titleHtml = c.title ? `<h2 class="pub-text-title">${esc(c.title)}</h2>` : '';
  const subHtml = c.subtitle ? `<h3 class="pub-text-subtitle">${esc(c.subtitle)}</h3>` : '';
  return `<section class="pub-text pub-text-bold">${titleHtml}${subHtml}<strong>${nl2br(esc(c.text || c.body || ''))}</strong></section>`;
}

function renderProfile(c) {
  return `
    <section class="pub-profile">
      ${c.heading ? `<h2 class="pub-profile-heading">${esc(c.heading)}</h2>` : ''}
      <div class="pub-profile-row">
        ${c.image ? `<div class="pub-profile-image"><img src="${esc(c.image)}" alt="${esc(c.name || '')}" loading="lazy"></div>` : ''}
        <div class="pub-profile-text">
          ${c.name ? `<h3 class="pub-profile-name">${esc(c.name)}</h3>` : ''}
          ${c.subtitle ? `<p class="pub-profile-subtitle">${esc(c.subtitle)}</p>` : ''}
          ${c.text ? `<div class="pub-profile-body">${nl2br(esc(c.text))}</div>` : ''}
        </div>
      </div>
    </section>`;
}

function renderFeatures(c) {
  const items = (c.items || []).map(item => `
    <div class="pub-feature-card">
      ${item.icon ? `<div class="pub-feature-icon">${esc(item.icon)}</div>` : ''}
      <h3 class="pub-feature-title">${esc(item.title)}</h3>
      <p class="pub-feature-desc">${esc(item.description)}</p>
    </div>`).join('');
  return `
    <section class="pub-features">
      ${c.heading ? `<h2 class="pub-features-heading">${esc(c.heading)}</h2>` : ''}
      <div class="pub-features-grid">${items}</div>
    </section>`;
}

function renderTestimonials(c) {
  const items = (c.items || []).map(item => `
    <div class="pub-testimonial-card">
      <blockquote class="pub-testimonial-quote">${esc(item.quote)}</blockquote>
      <div class="pub-testimonial-author">
        <strong>${esc(item.author)}</strong>
        ${item.role ? `<span>${esc(item.role)}</span>` : ''}
      </div>
    </div>`).join('');
  return `
    <section class="pub-testimonials">
      ${c.heading ? `<h2 class="pub-testimonials-heading">${esc(c.heading)}</h2>` : ''}
      <div class="pub-testimonials-grid">${items}</div>
    </section>`;
}

function renderCta(c) {
  const btnText = c.button_text || c.cta_text || '';
  const btnLink = c.button_link || c.cta_link || '#';
  return `
    <section class="pub-cta-section">
      <h2 class="pub-cta-heading">${esc(c.heading)}</h2>
      ${c.subheading ? `<p class="pub-cta-sub">${esc(c.subheading)}</p>` : ''}
      ${btnText ? `<a class="pub-cta-btn" href="${esc(btnLink)}" data-action="__pubNav" data-args='["${esc(btnLink)}"]' data-prevent>${esc(btnText)}</a>` : ''}
    </section>`;
}

function renderImage(c) {
  return `
    <section class="pub-image-section">
      <img class="pub-image" src="${esc(c.url)}" alt="${esc(c.alt || '')}" loading="lazy">
      ${c.caption ? `<p class="pub-image-caption">${esc(c.caption)}</p>` : ''}
    </section>`;
}

function renderFaq(c) {
  const items = (c.items || []).map((item, i) => `
    <div class="pub-faq-item">
      <button class="pub-faq-question" data-action="toggleFaqOpen" data-el>
        <span>${esc(item.question)}</span>
        <svg class="pub-faq-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="pub-faq-answer">${esc(item.answer)}</div>
    </div>`).join('');
  return `
    <section class="pub-faq">
      ${c.heading ? `<h2 class="pub-faq-heading">${esc(c.heading)}</h2>` : ''}
      ${items}
    </section>`;
}

function renderAccordion(c) {
  const items = (c.items || []).map(item => `
    <div class="pub-accordion-item">
      <button class="pub-accordion-trigger" data-action="toggleFaqOpen" data-el>
        <span>${esc(item.title)}</span>
        <span class="pub-accordion-icon"></span>
      </button>
      <div class="pub-accordion-body">${nl2br(esc(item.description || ''))}</div>
    </div>`).join('');
  return `
    <section class="pub-accordion">
      ${c.heading ? `<h2 class="pub-accordion-heading">${esc(c.heading)}</h2>` : ''}
      ${items}
    </section>`;
}

function renderDivider() {
  return `<hr class="pub-divider">`;
}

function renderSpacer(c) {
  const h = c.height || 40;
  return `<div class="pub-spacer" style="height:${parseInt(h, 10)}px"></div>`;
}

function renderBlogCta(c) {
  const btnText = c.button_text || '';
  const btnLink = c.button_link || '/';
  return `
    <div class="pub-blog-cta">
      ${c.text ? `<p class="pub-blog-cta-text">${esc(c.text)}</p>` : ''}
      ${btnText ? `<a class="pub-blog-cta-btn" href="${esc(btnLink)}" data-action="__pubNav" data-args='["${esc(btnLink)}"]' data-prevent>${esc(btnText)}</a>` : ''}
    </div>`;
}

// ── Exported renderers ──

function renderBlogContent(sections) {
  if (!Array.isArray(sections)) return '';
  const sorted = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return sorted.map(section => {
    const c = section.content || section;
    switch (section.type) {
      case 'blog_title':   return `<h2 class="pub-blog-content-title">${esc(c.text || '')}</h2>`;
      case 'blog_subtitle': return `<h3 class="pub-blog-content-subtitle">${esc(c.text || '')}</h3>`;
      case 'text':         return renderText(c);
      case 'text_italic':  return renderTextItalic(c);
      case 'text_bold':    return renderTextBold(c);
      case 'image':        return renderImage(c);
      case 'blog_cta':     return renderBlogCta(c);
      case 'divider':      return renderDivider();
      case 'spacer':       return renderSpacer(c);
      default:             return '';
    }
  }).join('');
}

export function renderSections(sections) {
  if (!Array.isArray(sections)) return '';

  const sorted = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  let bgIndex = 0;
  return sorted.map(section => {
    // Support both flat (fields on section) and nested (section.content) format
    const c = section.content || section;
    let inner = '';
    switch (section.type) {
      case 'hero':         inner = renderHero(c); break;
      case 'text':         inner = renderText(c); break;
      case 'text_italic':  inner = renderTextItalic(c); break;
      case 'text_bold':    inner = renderTextBold(c); break;
      case 'profile':      inner = renderProfile(c); break;
      case 'features':     inner = renderFeatures(c); break;
      case 'testimonials': inner = renderTestimonials(c); break;
      case 'cta':          inner = renderCta(c); break;
      case 'image':        inner = renderImage(c); break;
      case 'faq':          inner = renderFaq(c); break;
      case 'accordion':    inner = renderAccordion(c); break;
      case 'divider':      return renderDivider();
      case 'spacer':       return renderSpacer(c);
      default:             return '';
    }
    const bgClass = bgIndex % 2 === 0 ? 'pub-bg-light' : 'pub-bg-tan';
    bgIndex++;
    return `<div class="pub-section-wrap ${bgClass}">${inner}</div>`;
  }).join('');
}

export async function renderPublicPage(slug) {
  const container = document.getElementById('publicPageContent');
  if (!container) return;

  // Check cache
  if (pageCache[slug]) {
    container.innerHTML = renderSections(pageCache[slug].sections);
    import('./seo.js').then(m => m.updatePageMeta(pageCache[slug], slug === 'home' ? '/' : `/${slug}`));
    return;
  }

  container.innerHTML = '<div class="pub-loading">Laden ...</div>';

  const { data, error } = await sb
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    container.innerHTML = `
      <div class="pub-not-found">
        <h2>Seite nicht gefunden</h2>
        <p>Die angeforderte Seite existiert nicht oder ist nicht verf&uuml;gbar.</p>
      </div>`;
    return;
  }

  pageCache[slug] = data;
  container.innerHTML = renderSections(data.sections || []);
  import('./seo.js').then(m => m.updatePageMeta(data, slug === 'home' ? '/' : `/${slug}`));
}

// ── Blog ──

export async function renderBlogList() {
  const container = document.getElementById('blogListContent');
  if (!container) return;

  if (blogListCache) {
    container.innerHTML = buildBlogListHtml(blogListCache);
    import('./seo.js').then(m => m.updatePageMeta({ title: 'Blog' }, '/blog'));
    return;
  }

  container.innerHTML = '<div class="pub-loading">Laden ...</div>';

  const { data, error } = await sb
    .from('blog_posts')
    .select('slug, title, excerpt, cover_image, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="pub-error">Beitr&auml;ge konnten nicht geladen werden.</p>';
    return;
  }

  blogListCache = data || [];
  container.innerHTML = buildBlogListHtml(blogListCache);
  import('./seo.js').then(m => m.updatePageMeta({ title: 'Blog' }, '/blog'));
}

function buildBlogListHtml(posts) {
  if (!posts.length) {
    return '<p class="pub-empty">Noch keine Beitr&auml;ge vorhanden.</p>';
  }

  const cards = posts.map(p => `
    <article class="pub-blog-card" data-action="__pubNav" data-args='["/blog/${esc(p.slug)}"]'>
      ${p.cover_image ? `<img class="pub-blog-card-img" src="${esc(p.cover_image)}" alt="${esc(p.title)}" loading="lazy">` : '<div class="pub-blog-card-img pub-blog-card-placeholder"></div>'}
      <div class="pub-blog-card-body">
        <time class="pub-blog-card-date">${formatDateDE(p.published_at)}</time>
        <h3 class="pub-blog-card-title">${esc(p.title)}</h3>
        ${p.excerpt ? `<p class="pub-blog-card-excerpt">${esc(p.excerpt)}</p>` : ''}
        <span class="pub-blog-card-link">Weiterlesen &rarr;</span>
      </div>
    </article>`).join('');

  return `<div class="pub-blog-grid">${cards}</div>`;
}

export async function renderBlogPost(slug) {
  const container = document.getElementById('blogPostContent');
  if (!container) return;

  // Check cache
  if (blogPostCache[slug]) {
    container.innerHTML = buildBlogPostHtml(blogPostCache[slug]);
    const c = blogPostCache[slug];
    import('./seo.js').then(m => m.updatePageMeta({
      title: c.title,
      meta_description: c.meta_description || c.excerpt || '',
      cover_image: c.cover_image || '',
    }, `/blog/${slug}`));
    return;
  }

  container.innerHTML = '<div class="pub-loading">Laden ...</div>';

  const { data, error } = await sb
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    container.innerHTML = `
      <div class="pub-not-found">
        <h2>Beitrag nicht gefunden</h2>
        <p>Der angeforderte Beitrag existiert nicht oder ist nicht verf&uuml;gbar.</p>
      </div>`;
    return;
  }

  blogPostCache[slug] = data;
  container.innerHTML = buildBlogPostHtml(data);
  import('./seo.js').then(m => m.updatePageMeta({
    title: data.title,
    meta_description: data.meta_description || data.excerpt || '',
    cover_image: data.cover_image || '',
  }, `/blog/${slug}`));
}

function buildBlogPostHtml(post) {
  const dateParts = [];
  if (post.published_at) dateParts.push(formatDateDE(post.published_at));
  if (post.author) dateParts.push(`Verfasst von ${esc(post.author)}`);
  const metaLine = dateParts.join(' &bull; ');

  return `
    <article class="pub-blog-post">
      <div class="pub-blog-post-header">
        ${metaLine ? `<p class="pub-blog-post-meta">${metaLine}</p>` : ''}
        <h1 class="pub-blog-post-title">${esc(post.title)}</h1>
      </div>
      <div class="pub-blog-post-body">
        ${(post.sections || post.content) ? renderBlogContent(post.sections || post.content) : ''}
      </div>
    </article>`;
}

// ── Contact ──

export function renderPublicContact() {
  const container = document.getElementById('publicContactContent');
  if (!container) return;

  import('./seo.js').then(m => m.updatePageMeta({ title: 'Kontakt', meta_description: 'Nimm Kontakt mit Studio Klarzeit auf.' }, '/kontakt'));

  container.innerHTML = `
    <section class="pub-contact-form">
      <h2 class="pub-contact-heading">Kontakt</h2>
      <p class="pub-contact-sub">Hast du eine Frage oder Anregung? Schreib uns gerne.</p>
      <form data-submit="__pubSubmitContact">
        <div class="pub-form-group">
          <label for="pubContactName">Name</label>
          <input id="pubContactName" type="text" placeholder="Dein Name" required>
        </div>
        <div class="pub-form-group">
          <label for="pubContactEmail">E-Mail</label>
          <input id="pubContactEmail" type="email" placeholder="Deine E-Mail-Adresse" required>
        </div>
        <div class="pub-form-group">
          <label for="pubContactMessage">Nachricht</label>
          <textarea id="pubContactMessage" rows="5" placeholder="Deine Nachricht ..." required></textarea>
        </div>
        <button type="submit" class="pub-contact-btn" id="pubContactSubmit">Nachricht senden</button>
      </form>
    </section>`;
}

window.__pubSubmitContact = function () {
  submitPublicContact();
};

export async function submitPublicContact() {
  const nameEl = document.getElementById('pubContactName');
  const emailEl = document.getElementById('pubContactEmail');
  const msgEl = document.getElementById('pubContactMessage');
  const btn = document.getElementById('pubContactSubmit');

  const name = (nameEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const message = (msgEl?.value || '').trim();

  if (!name || !email || !message) {
    showToast('Bitte alle Felder ausfuellen.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Wird gesendet ...';

  const row = {
    type: 'contact',
    sender_email: email,
    subject: name,
    message,
  };
  // Falls eingeloggt, user_id mitgeben
  if (state.currentUser?.id) row.user_id = state.currentUser.id;

  const { error } = await sb.from('contact_messages').insert(row);

  if (error) {
    console.error('Contact submit error:', error);
    showToast('Fehler beim Senden. Bitte versuche es erneut.', 'error');
    btn.disabled = false;
    btn.textContent = 'Nachricht senden';
    return;
  }

  showToast('Nachricht gesendet! Wir melden uns bei dir.');
  nameEl.value = '';
  emailEl.value = '';
  msgEl.value = '';
  btn.disabled = false;
  btn.textContent = 'Nachricht senden';
}
