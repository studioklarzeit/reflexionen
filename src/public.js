// ── PUBLIC PAGES (Landing, Blog, Contact) ──

import { sb } from './config.js';
import { state } from './state.js';
import { esc, showToast, imgTransform } from './utils.js';
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
      ${c.hero_image ? `<div class="pub-hero-image"><img src="${esc(imgTransform(c.hero_image, 900))}" alt="${esc(c.heading || '')}" loading="lazy"></div>` : ''}
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
        ${c.image ? `<div class="pub-profile-image"><img src="${esc(imgTransform(c.image, 800, 75))}" alt="${esc(c.name || '')}" loading="lazy"></div>` : ''}
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
      <img class="pub-image" src="${esc(imgTransform(c.url, 900))}" alt="${esc(c.alt || '')}" loading="lazy">
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

export function renderSections(sections, courseContext = null) {
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
      case 'purchase_cta': inner = renderPurchaseCta(c, courseContext); break;
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
      ${p.cover_image ? `<img class="pub-blog-card-img" src="${esc(imgTransform(p.cover_image, 800, 75))}" alt="${esc(p.title)}" loading="lazy">` : '<div class="pub-blog-card-img pub-blog-card-placeholder"></div>'}
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

// ── Course Sales Page ──

let courseSalesCache = {};

export async function renderCourseSalesPage(slug) {
  const container = document.getElementById('viewPublicCourseSales');
  if (!container) return;

  // Check cache
  if (courseSalesCache[slug]) {
    container.innerHTML = buildCourseSalesHtml(courseSalesCache[slug]);
    updateCourseSalesSeo(courseSalesCache[slug], slug);
    return;
  }

  container.innerHTML = '<div class="pub-loading">Laden ...</div>';

  const { data: courses, error } = await sb
    .from('courses')
    .select('*')
    .eq('sales_slug', slug)
    .eq('sales_published', true)
    .limit(1);

  if (error || !courses?.length) {
    container.innerHTML = `<div class="pub-not-found"><h2>Kurs nicht gefunden</h2><p>Die angeforderte Kursseite ist nicht verfügbar.</p></div>`;
    return;
  }

  const course = courses[0];
  courseSalesCache[slug] = course;
  container.innerHTML = buildCourseSalesHtml(course);
  updateCourseSalesSeo(course, slug);
}

function buildCourseSalesHtml(course) {
  const sections = course.sales_sections || [];
  if (!sections.length) {
    // Fallback: show placeholder if no sections built yet
    return `<div class="pub-not-found"><h2>${esc(course.sales_headline || course.name)}</h2><p>Verkaufsseite wird gerade erstellt.</p></div>`;
  }

  const courseCtx = {
    id: course.id,
    sales_slug: course.sales_slug,
    name: course.name,
    sales_headline: course.sales_headline,
    sales_description: course.sales_description,
    sales_features: Array.isArray(course.sales_features) ? course.sales_features : (course.sales_features || '').split('\n').filter(Boolean),
    sales_cta_text: course.sales_cta_text,
    price_onetime_amount: course.price_onetime_amount,
    price_subscription_amount: course.price_subscription_amount,
    image_url: course.image_url,
  };

  return renderSections(sections, courseCtx);
}

function renderPurchaseCta(c, courseCtx) {
  if (!courseCtx) return '<!-- purchase_cta: no course context -->';

  const priceOnetime = courseCtx.price_onetime_amount ? (courseCtx.price_onetime_amount / 100).toFixed(0) : null;
  const priceSub = courseCtx.price_subscription_amount ? (courseCtx.price_subscription_amount / 100).toFixed(0) : null;
  const features = courseCtx.sales_features || [];
  const ctaText = courseCtx.sales_cta_text || 'Jetzt starten';
  const slug = courseCtx.sales_slug || '';

  return `
    <section class="pub-purchase-cta">
      ${c.heading ? `<h2 class="pub-purchase-cta-heading">${esc(c.heading)}</h2>` : ''}
      ${c.description ? `<p class="pub-purchase-cta-desc">${esc(c.description).replace(/\n/g, '<br>')}</p>` : ''}
      ${(c.show_features && features.length) ? `
        <ul class="pub-purchase-cta-features">
          ${features.map(f => `<li><span class="pub-check">✓</span> ${esc(f)}</li>`).join('')}
        </ul>
      ` : ''}
      <div class="pub-purchase-cta-cards">
        ${priceOnetime ? `
          <div class="pub-price-card">
            <div class="pub-price-label">Einmalzahlung</div>
            <div class="pub-price-amount">CHF ${priceOnetime}</div>
            <div class="pub-price-detail">Lebenslanger Zugang</div>
            <button class="btn btn-primary" data-action="handlePurchase" data-args='["${courseCtx.id}","onetime"]'>${esc(ctaText)}</button>
          </div>
        ` : ''}
        ${priceSub ? `
          <div class="pub-price-card">
            <div class="pub-price-label">Monatsabo</div>
            <div class="pub-price-amount">CHF ${priceSub}<span class="pub-price-period">/Monat</span></div>
            <div class="pub-price-detail">Jederzeit kündbar</div>
            <button class="btn btn-secondary" data-action="handlePurchase" data-args='["${courseCtx.id}","subscription"]'>${esc(ctaText)}</button>
          </div>
        ` : ''}
      </div>
      ${(c.show_preview_link !== false) && slug ? `
        <p class="pub-purchase-cta-preview">
          <a href="/kurs/${esc(slug)}/reinhoeren" data-action="__pubNav" data-args='["/kurs/${esc(slug)}/reinhoeren"]' data-prevent>${esc(c.preview_link_text || 'Erst reinhören')}</a>
        </p>
      ` : ''}
    </section>`;
}

function updateCourseSalesSeo(course, slug) {
  import('./seo.js').then(m => m.updatePageMeta({
    title: course.sales_headline || course.name,
    meta_description: course.sales_description || course.description || '',
    cover_image: course.image_url || '',
  }, `/kurs/${slug}`));
}

// ── Course Preview (Reinhören) ──

let coursePreviewCache = {};
let previewAudio = null;
let previewProgressInterval = null;

function formatTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export async function renderCoursePreview(slug) {
  const container = document.getElementById('viewPublicCoursePreview');
  if (!container) return;

  // Stop any existing preview audio
  stopPreviewAudio();

  // Check cache
  if (coursePreviewCache[slug]) {
    container.innerHTML = buildCoursePreviewHtml(coursePreviewCache[slug]);
    initPreviewAudio(coursePreviewCache[slug].chapter);
    updatePreviewSeo(coursePreviewCache[slug], slug);
    return;
  }

  container.innerHTML = '<div class="pub-loading">Laden ...</div>';

  // Use RPC function to bypass RLS (chapters of purchasable courses are hidden for anon)
  const { data: preview, error: rpcErr } = await sb.rpc('get_course_preview', { slug_param: slug });

  if (rpcErr || !preview?.course) {
    container.innerHTML = `<div class="pub-not-found"><h2>Kurs nicht gefunden</h2><p>Der angeforderte Kurs ist nicht verf&uuml;gbar.</p></div>`;
    return;
  }

  if (!preview.chapter) {
    container.innerHTML = `<div class="pub-not-found"><h2>Vorschau nicht verf&uuml;gbar</h2><p>F&uuml;r diesen Kurs ist noch keine Vorschau vorhanden.</p></div>`;
    return;
  }

  const previewData = {
    course: preview.course,
    chapter: preview.chapter,
    blocks: preview.blocks || [],
    totalChapters: preview.total_chapters || 0,
  };
  coursePreviewCache[slug] = previewData;

  container.innerHTML = buildCoursePreviewHtml(previewData);
  initPreviewAudio(previewData.chapter);
  updatePreviewSeo(previewData, slug);
}

function buildCoursePreviewHtml({ course, chapter, blocks, totalChapters }) {
  const c = course;
  const heroImg = chapter.image_url || c.image_url || '';
  const dur = chapter.audio_duration_seconds ? formatTime(chapter.audio_duration_seconds) : '';

  // Chapter content blocks
  const contentHtml = blocks.length ? blocks.map(block => {
    const txt = block.content || '';
    switch (block.type) {
      case 'heading':    return `<div class="content-block content-heading">${esc(txt)}</div>`;
      case 'subheading': return `<div class="content-block content-subheading">${esc(txt)}</div>`;
      case 'text':       return `<div class="content-block content-text">${esc(txt).replace(/\n/g, '<br>')}</div>`;
      case 'text_italic': return `<div class="content-block content-text"><em>${esc(txt).replace(/\n/g, '<br>')}</em></div>`;
      case 'text_bold':  return `<div class="content-block content-text"><strong>${esc(txt).replace(/\n/g, '<br>')}</strong></div>`;
      case 'quote':      return `<div class="content-block content-quote">\u00AB${esc(txt)}\u00BB</div>`;
      case 'divider':    return `<div class="content-block content-divider"><span>\u00b7 \u00b7 \u00b7</span></div>`;
      case 'image':      return `<div class="content-block content-image"><img src="${esc(imgTransform(txt, 900))}" alt="" loading="lazy"></div>`;
      default:           return '';
    }
  }).join('') : (chapter.chapter_text ? chapter.chapter_text.split('\n\n').map(p => p.trim()).filter(Boolean).map(p => {
    if (p.startsWith('### ')) return `<h4>${esc(p.slice(4))}</h4>`;
    if (p.startsWith('## '))  return `<h3>${esc(p.slice(3))}</h3>`;
    if (p.startsWith('# '))   return `<h2>${esc(p.slice(2))}</h2>`;
    if (p.startsWith('> '))   return `<blockquote>${esc(p.slice(2))}</blockquote>`;
    if (p.startsWith('---'))  return '<hr>';
    return `<p>${esc(p).replace(/\n/g, '<br>')}</p>`;
  }).join('') : '');

  // Pricing
  const priceOnetime = c.price_onetime_amount ? (c.price_onetime_amount / 100).toFixed(0) : null;
  const priceSub = c.price_subscription_amount ? (c.price_subscription_amount / 100).toFixed(0) : null;
  const features = c.sales_features || [];

  return `
    <div class="preview-page">
      <div class="preview-back">
        <a href="/" data-action="__pubNav" data-args='["/"]' data-prevent>&larr; Zur&uuml;ck</a>
      </div>

      ${heroImg ? `
        <div class="preview-hero">
          <img src="${esc(imgTransform(heroImg, 900))}" alt="${esc(chapter.name)}" loading="lazy">
          <div class="preview-hero-overlay">
            <span class="preview-hero-eyebrow">Reinh&ouml;ren &middot; Kapitel 1 von ${totalChapters}</span>
            <h1 class="preview-hero-title">${esc(chapter.name)}</h1>
          </div>
        </div>
      ` : `
        <div class="preview-header">
          <span class="preview-hero-eyebrow">Reinh&ouml;ren &middot; Kapitel 1 von ${totalChapters}</span>
          <h1 class="preview-hero-title">${esc(chapter.name)}</h1>
        </div>
      `}

      ${chapter.audio_url ? `
        <div class="preview-audio">
          <div class="preview-audio-player">
            <button class="preview-audio-play" id="previewPlayBtn" data-action="togglePreviewAudio">
              <svg id="previewPlayIcon" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="24" height="24"><polygon points="5,3 19,12 5,21"/></svg>
            </button>
            <div class="preview-audio-track" data-action="seekPreviewAudio" data-ev>
              <div class="preview-audio-progress" id="previewProgress"></div>
            </div>
            <div class="preview-audio-time">
              <span id="previewCurrentTime">0:00</span> / <span id="previewTotalTime">${dur || '--:--'}</span>
            </div>
          </div>
        </div>
      ` : ''}

      ${contentHtml ? `
        <div class="preview-content">
          <div class="chapter-text-content">${contentHtml}</div>
        </div>
      ` : ''}

      <div class="preview-cta">
        <div class="preview-cta-inner">
          <h2 class="preview-cta-heading">Dir gef&auml;llt, was du h&ouml;rst?</h2>
          <p class="preview-cta-sub">${esc(c.sales_headline || c.name)}</p>
          ${c.sales_description ? `<p class="preview-cta-desc">${nl2br(esc(c.sales_description))}</p>` : ''}

          ${features.length ? `
            <ul class="preview-cta-features">
              ${features.map(f => `<li><span class="preview-check">&check;</span> ${esc(f)}</li>`).join('')}
            </ul>
          ` : ''}

          <div class="preview-cta-cards">
            ${priceOnetime ? `
              <div class="preview-price-card">
                <div class="preview-price-label">Einmalzahlung</div>
                <div class="preview-price-amount">CHF ${priceOnetime}</div>
                <div class="preview-price-detail">Lebenslanger Zugang</div>
                <button class="btn btn-primary" data-action="handlePurchase" data-args='["${c.id}","onetime"]'>${esc(c.sales_cta_text || 'Jetzt starten')}</button>
              </div>
            ` : ''}
            ${priceSub ? `
              <div class="preview-price-card">
                <div class="preview-price-label">Monatsabo</div>
                <div class="preview-price-amount">CHF ${priceSub}<span class="preview-price-period">/Monat</span></div>
                <div class="preview-price-detail">Jederzeit k&uuml;ndbar</div>
                <button class="btn btn-secondary" data-action="handlePurchase" data-args='["${c.id}","subscription"]'>${esc(c.sales_cta_text || 'Jetzt starten')}</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Preview Audio ──

function initPreviewAudio(chapter) {
  stopPreviewAudio();
  if (!chapter.audio_url) return;

  previewAudio = new Audio(chapter.audio_url);
  previewAudio.preload = 'auto';

  previewAudio.addEventListener('loadedmetadata', () => {
    const tt = document.getElementById('previewTotalTime');
    if (tt) tt.textContent = formatTime(previewAudio.duration);
  });

  previewAudio.addEventListener('ended', () => {
    updatePreviewPlayIcon(false);
    clearInterval(previewProgressInterval);
  });
}

export function togglePreviewAudio() {
  if (!previewAudio) return;
  if (previewAudio.paused) {
    previewAudio.play();
    updatePreviewPlayIcon(true);
    previewProgressInterval = setInterval(updatePreviewProgress, 250);
  } else {
    previewAudio.pause();
    updatePreviewPlayIcon(false);
    clearInterval(previewProgressInterval);
  }
}

export function seekPreviewAudio(event) {
  if (!previewAudio || !isFinite(previewAudio.duration)) return;
  const wrap = event.currentTarget;
  const rect = wrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  previewAudio.currentTime = pct * previewAudio.duration;
  updatePreviewProgress();
}

export function stopPreviewAudio() {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }
  clearInterval(previewProgressInterval);
  previewProgressInterval = null;
}

function updatePreviewPlayIcon(isPlaying) {
  const icon = document.getElementById('previewPlayIcon');
  if (!icon) return;
  icon.innerHTML = isPlaying
    ? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
    : '<polygon points="5,3 19,12 5,21"/>';
}

function updatePreviewProgress() {
  if (!previewAudio || !isFinite(previewAudio.duration)) return;
  const pct = (previewAudio.currentTime / previewAudio.duration) * 100;
  const bar = document.getElementById('previewProgress');
  if (bar) bar.style.width = pct + '%';
  const ct = document.getElementById('previewCurrentTime');
  if (ct) ct.textContent = formatTime(previewAudio.currentTime);
}

function updatePreviewSeo(data, slug) {
  const { course, chapter } = data;
  import('./seo.js').then(m => m.updatePageMeta({
    title: `Reinhören: ${course.sales_headline || course.name}`,
    meta_description: course.sales_description || course.description || '',
    cover_image: chapter.image_url || course.image_url || '',
  }, `/kurs/${slug}`));
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
