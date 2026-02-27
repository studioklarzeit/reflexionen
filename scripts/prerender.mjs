#!/usr/bin/env node
// ── Pre-Renderer ──
// Generates static HTML files for all public pages and blog posts.
// Runs AFTER vite build (needs dist/index.html as template).
// Output: dist/{path}/index.html for each public route.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

// ── Supabase config ──
const SUPABASE_URL = 'https://jzqnwspmhdysimayxuty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cBA_p9hx5rzAMX9aYnLm9w_XYlHAh94';
const BASE_URL = 'https://app.studioklarzeit.de';

// ── Supabase REST query ──
async function query(table, select, filters = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filters}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
  return res.json();
}

// ── Fetch SEO settings ──
async function fetchSeoSettings() {
  try {
    const rows = await query('settings', 'value', '&key=eq.seo_tracking');
    if (rows[0]?.value) {
      const v = rows[0].value;
      return typeof v === 'string' ? JSON.parse(v) : v;
    }
  } catch (e) { /* ignore */ }
  return { site_title: 'Studio Klarzeit', default_meta_description: '', default_og_image: '' };
}

// ── HTML escape ──
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Date helper ──
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function formatDateDE(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Section renderers (same output as src/public.js, simplified for Node) ──

function renderHero(c) {
  const ctaText = c.cta_text || c.button_text || '';
  const ctaLink = c.cta_link || c.button_link || '';
  const ctaHtml = ctaText
    ? `<a class="pub-hero-cta" href="${esc(ctaLink || '#')}">${esc(ctaText)}</a>`
    : '';
  const cta2Text = c.cta_text_2 || '';
  const cta2Link = c.cta_link_2 || '';
  const cta2Html = cta2Text
    ? `<a class="pub-hero-cta-secondary" href="${esc(cta2Link || '#')}">${esc(cta2Text)}</a>`
    : '';
  const stats = Array.isArray(c.stats) ? c.stats.filter(s => s.label || s.value) : [];
  const statsHtml = stats.length
    ? `<div class="pub-hero-stats">${stats.map(s => `<div class="pub-hero-stat"><span class="pub-hero-stat-label">${esc(s.label || '')}</span><span class="pub-hero-stat-value">${esc(s.value || '')}</span></div>`).join('')}</div>`
    : '';
  return `<section class="pub-hero"><div class="pub-hero-text">${c.label ? `<p class="pub-hero-label">${esc(c.label)}</p>` : ''}<h1 class="pub-hero-heading">${esc(c.heading || '')}</h1>${c.description ? `<p class="pub-hero-desc">${esc(c.description)}</p>` : ''}${c.subheading ? `<p class="pub-hero-sub">${esc(c.subheading)}</p>` : ''}${(ctaHtml || cta2Html) ? `<div class="pub-hero-buttons">${ctaHtml}${cta2Html}</div>` : ''}${statsHtml}</div>${c.hero_image ? `<div class="pub-hero-image"><img src="${esc(c.hero_image)}" alt="${esc(c.heading || '')}" loading="lazy"></div>` : ''}</section>`;
}

function nl2br(str) { return (str || '').replace(/\n/g, '<br>'); }

function renderText(c) {
  const t = c.title ? `<h2 class="pub-text-title">${esc(c.title)}</h2>` : '';
  const s = c.subtitle ? `<h3 class="pub-text-subtitle">${esc(c.subtitle)}</h3>` : '';
  return `<section class="pub-text">${t}${s}${nl2br(esc(c.text || c.body || ''))}</section>`;
}

function renderTextItalic(c) {
  const t = c.title ? `<h2 class="pub-text-title">${esc(c.title)}</h2>` : '';
  const s = c.subtitle ? `<h3 class="pub-text-subtitle">${esc(c.subtitle)}</h3>` : '';
  return `<section class="pub-text pub-text-italic">${t}${s}<em>${nl2br(esc(c.text || c.body || ''))}</em></section>`;
}

function renderTextBold(c) {
  const t = c.title ? `<h2 class="pub-text-title">${esc(c.title)}</h2>` : '';
  const s = c.subtitle ? `<h3 class="pub-text-subtitle">${esc(c.subtitle)}</h3>` : '';
  return `<section class="pub-text pub-text-bold">${t}${s}<strong>${nl2br(esc(c.text || c.body || ''))}</strong></section>`;
}

function renderProfile(c) {
  return `<section class="pub-profile">${c.heading ? `<h2 class="pub-profile-heading">${esc(c.heading)}</h2>` : ''}<div class="pub-profile-row">${c.image ? `<div class="pub-profile-image"><img src="${esc(c.image)}" alt="${esc(c.name || '')}" loading="lazy"></div>` : ''}<div class="pub-profile-text">${c.name ? `<h3 class="pub-profile-name">${esc(c.name)}</h3>` : ''}${c.subtitle ? `<p class="pub-profile-subtitle">${esc(c.subtitle)}</p>` : ''}${c.text ? `<div class="pub-profile-body">${nl2br(esc(c.text))}</div>` : ''}</div></div></section>`;
}

function renderFeatures(c) {
  const items = (c.items || []).map(i =>
    `<div class="pub-feature-card">${i.icon ? `<div class="pub-feature-icon">${i.icon}</div>` : ''}<h3 class="pub-feature-title">${esc(i.title)}</h3><p class="pub-feature-desc">${esc(i.description)}</p></div>`
  ).join('');
  return `<section class="pub-features">${c.heading ? `<h2 class="pub-features-heading">${esc(c.heading)}</h2>` : ''}<div class="pub-features-grid">${items}</div></section>`;
}

function renderTestimonials(c) {
  const items = (c.items || []).map(i =>
    `<div class="pub-testimonial-card"><blockquote class="pub-testimonial-quote">${esc(i.quote)}</blockquote><div class="pub-testimonial-author"><strong>${esc(i.author)}</strong>${i.role ? `<span>${esc(i.role)}</span>` : ''}</div></div>`
  ).join('');
  return `<section class="pub-testimonials">${c.heading ? `<h2 class="pub-testimonials-heading">${esc(c.heading)}</h2>` : ''}<div class="pub-testimonials-grid">${items}</div></section>`;
}

function renderCta(c) {
  const t = c.button_text || c.cta_text || '';
  const l = c.button_link || c.cta_link || '#';
  return `<section class="pub-cta-section"><h2 class="pub-cta-heading">${esc(c.heading)}</h2>${c.subheading ? `<p class="pub-cta-sub">${esc(c.subheading)}</p>` : ''}${t ? `<a class="pub-cta-btn" href="${esc(l)}">${esc(t)}</a>` : ''}</section>`;
}

function renderImage(c) {
  return `<section class="pub-image-section"><img class="pub-image" src="${esc(c.url)}" alt="${esc(c.alt || '')}" loading="lazy">${c.caption ? `<p class="pub-image-caption">${esc(c.caption)}</p>` : ''}</section>`;
}

function renderAccordion(c) {
  const items = (c.items || []).map(i =>
    `<div class="pub-accordion-item"><button class="pub-accordion-trigger"><span>${esc(i.title)}</span><span class="pub-accordion-icon"></span></button><div class="pub-accordion-body">${nl2br(esc(i.description || ''))}</div></div>`
  ).join('');
  return `<section class="pub-accordion">${c.heading ? `<h2 class="pub-accordion-heading">${esc(c.heading)}</h2>` : ''}${items}</section>`;
}

function renderFaq(c) {
  const items = (c.items || []).map(i =>
    `<div class="pub-faq-item"><div class="pub-faq-question"><span>${esc(i.question)}</span></div><div class="pub-faq-answer">${esc(i.answer)}</div></div>`
  ).join('');
  return `<section class="pub-faq">${c.heading ? `<h2 class="pub-faq-heading">${esc(c.heading)}</h2>` : ''}${items}</section>`;
}

function renderSections(sections) {
  if (!Array.isArray(sections)) return '';
  const sorted = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  let bgIndex = 0;
  return sorted.map(sec => {
    const c = sec.content || sec;
    let inner = '';
    switch (sec.type) {
      case 'hero': inner = renderHero(c); break;
      case 'text': inner = renderText(c); break;
      case 'text_italic': inner = renderTextItalic(c); break;
      case 'text_bold': inner = renderTextBold(c); break;
      case 'profile': inner = renderProfile(c); break;
      case 'accordion': inner = renderAccordion(c); break;
      case 'features': inner = renderFeatures(c); break;
      case 'testimonials': inner = renderTestimonials(c); break;
      case 'cta': inner = renderCta(c); break;
      case 'image': inner = renderImage(c); break;
      case 'faq': inner = renderFaq(c); break;
      case 'divider': return '<hr class="pub-divider">';
      case 'spacer': return `<div class="pub-spacer" style="height:${parseInt(c.height || 40, 10)}px"></div>`;
      default: return '';
    }
    const bgClass = bgIndex % 2 === 0 ? 'pub-bg-light' : 'pub-bg-tan';
    bgIndex++;
    return `<div class="pub-section-wrap ${bgClass}">${inner}</div>`;
  }).join('');
}

// ── JSON-LD generators ──

function jsonLdOrg(seo) {
  return { '@type': 'Organization', name: seo.site_title || 'Studio Klarzeit', url: BASE_URL };
}

function jsonLdWebSite(seo, desc) {
  return { '@type': 'WebSite', name: seo.site_title || 'Studio Klarzeit', url: BASE_URL, description: desc };
}

function jsonLdWebPage(title, desc, url) {
  return { '@type': 'WebPage', name: title, description: desc, url };
}

function jsonLdBlogPosting(post, url) {
  const obj = {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || post.excerpt || '',
    url,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: { '@type': 'Person', name: post.author || 'Studio Klarzeit' },
    publisher: { '@type': 'Organization', name: 'Studio Klarzeit' },
  };
  if (post.cover_image) obj.image = post.cover_image;
  return obj;
}

function buildJsonLd(schemas) {
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': schemas })}</script>`;
}

// ── Public header/footer (static HTML for pre-rendered pages) ──

const PUB_HEADER = `<header class="pub-header" id="publicHeader" style="display:flex;">
  <div class="pub-header-inner">
    <a class="pub-logo" href="/">Studio Klarzeit</a>
    <nav class="pub-nav" id="publicNav">
      <a class="pub-nav-link" href="/">Home</a>
      <a class="pub-nav-link" href="/about">Über uns</a>
      <a class="pub-nav-link" href="/blog">Blog</a>
      <a class="pub-nav-link" href="/kontakt">Kontakt</a>
    </nav>
    <div class="pub-header-actions">
      <a class="btn btn-primary btn-sm" href="/?login=1"><span class="btn-text">Login</span></a>
    </div>
  </div>
</header>`;

const PUB_FOOTER = `<footer class="pub-footer" id="publicFooter" style="display:block;">
  <div class="pub-footer-inner">
    <div class="pub-footer-brand">
      <div class="pub-footer-logo">Studio Klarzeit</div>
      <p class="pub-footer-tagline">Selbstreflexion. Achtsamkeit. Klarheit.</p>
    </div>
    <div class="pub-footer-links">
      <div class="pub-footer-col">
        <div class="pub-footer-col-title">Plattform</div>
        <a class="pub-footer-link" href="/">Home</a>
        <a class="pub-footer-link" href="/about">Über uns</a>
        <a class="pub-footer-link" href="/blog">Blog</a>
        <a class="pub-footer-link" href="/kontakt">Kontakt</a>
      </div>
      <div class="pub-footer-col">
        <div class="pub-footer-col-title">Rechtliches</div>
        <a class="pub-footer-link" href="/datenschutz">Datenschutz</a>
        <a class="pub-footer-link" href="/agb">AGB</a>
        <a class="pub-footer-link" href="/privacy">Privacy Policy</a>
      </div>
      <div class="pub-footer-col">
        <div class="pub-footer-col-title">Konto</div>
        <a class="pub-footer-link" href="/?login=1">Login</a>
        <a class="pub-footer-link" href="/?login=1">Registrieren</a>
      </div>
    </div>
    <div class="pub-footer-bottom">
      <span>&copy; 2026 Studio Klarzeit. Alle Rechte vorbehalten.</span>
    </div>
  </div>
</footer>`;

// ── Contact form (static HTML) ──

const CONTACT_HTML = `<section class="pub-contact-form">
  <h2 class="pub-contact-heading">Kontakt</h2>
  <p class="pub-contact-sub">Hast du eine Frage oder Anregung? Schreib uns gerne.</p>
  <form>
    <div class="pub-form-group"><label for="pubContactName">Name</label><input id="pubContactName" type="text" placeholder="Dein Name" required></div>
    <div class="pub-form-group"><label for="pubContactEmail">E-Mail</label><input id="pubContactEmail" type="email" placeholder="Deine E-Mail-Adresse" required></div>
    <div class="pub-form-group"><label for="pubContactMessage">Nachricht</label><textarea id="pubContactMessage" rows="5" placeholder="Deine Nachricht ..." required></textarea></div>
    <button type="submit" class="pub-contact-btn" id="pubContactSubmit">Nachricht senden</button>
  </form>
</section>`;

// ── Blog list HTML ──

function buildBlogListHtml(posts) {
  if (!posts.length) return '<p class="pub-empty">Noch keine Beitr&auml;ge vorhanden.</p>';
  const cards = posts.map(p => `<article class="pub-blog-card">
    <a href="/blog/${esc(p.slug)}" style="text-decoration:none;color:inherit;">
      ${p.cover_image ? `<img class="pub-blog-card-img" src="${esc(p.cover_image)}" alt="${esc(p.title)}" loading="lazy">` : '<div class="pub-blog-card-img pub-blog-card-placeholder"></div>'}
      <div class="pub-blog-card-body">
        <time class="pub-blog-card-date">${formatDateDE(p.published_at)}</time>
        <h3 class="pub-blog-card-title">${esc(p.title)}</h3>
        ${p.excerpt ? `<p class="pub-blog-card-excerpt">${esc(p.excerpt)}</p>` : ''}
        <span class="pub-blog-card-link">Weiterlesen &rarr;</span>
      </div>
    </a>
  </article>`).join('');
  return `<div class="pub-blog-grid">${cards}</div>`;
}

// ── Blog post HTML ──

function buildBlogPostHtml(post) {
  return `<article class="pub-blog-post">
    <header class="pub-blog-post-header">
      <time class="pub-blog-post-date">${formatDateDE(post.published_at)}</time>
      <h1 class="pub-blog-post-title">${esc(post.title)}</h1>
      ${post.author ? `<p class="pub-blog-post-author">von ${esc(post.author)}</p>` : ''}
    </header>
    ${post.cover_image ? `<img class="pub-blog-post-cover" src="${esc(post.cover_image)}" alt="${esc(post.title)}" loading="lazy">` : ''}
    <div class="pub-blog-post-body">
      ${renderSections(post.sections || post.content || [])}
    </div>
  </article>`;
}

// ── Build pre-rendered HTML page ──

function buildPage(template, { slug, title, description, ogImage, path, content, jsonLdSchemas, isHome }) {
  const siteTitle = seoSettings.site_title || 'Studio Klarzeit';
  const fullTitle = title ? `${title} — ${siteTitle}` : siteTitle;
  const desc = description || seoSettings.default_meta_description || '';
  const img = ogImage || seoSettings.default_og_image || '';
  const url = BASE_URL + path;

  // Build head meta tags
  const metaTags = [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:title" content="${esc(fullTitle)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(siteTitle)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="x-prerendered" content="${esc(slug)}">`,
    jsonLdSchemas ? buildJsonLd(jsonLdSchemas) : '',
  ].join('\n');

  // Pre-rendered body content (visible without JS)
  const preRenderedBody = `
<div id="prerendered-content">
  ${PUB_HEADER}
  <div class="pub-page-wrap">${content}</div>
  ${PUB_FOOTER}
</div>`;

  // Replace in template
  let html = template;

  // Replace title
  html = html.replace(/<title>[^<]*<\/title>/, '');
  // Remove existing empty meta tags (they'll be set by our metaTags)
  html = html.replace(/<meta name="description"[^>]*>/g, '');
  html = html.replace(/<meta property="og:[^>]*>/g, '');
  html = html.replace(/<link rel="canonical"[^>]*>/g, '');

  // Inject meta tags after <head>...<meta viewport>
  html = html.replace(
    /(<meta name="viewport"[^>]*>)/,
    `$1\n${metaTags}`
  );

  // Inject pre-rendered content before the SPA script
  html = html.replace(
    /(<script type="module")/,
    `${preRenderedBody}\n$1`
  );

  return html;
}

// ── Write page to disk ──

function writePage(path, html) {
  const dir = join(DIST, path === '/' ? '' : path);
  mkdirSync(dir, { recursive: true });
  const file = path === '/' ? join(DIST, 'index.html') : join(dir, 'index.html');
  writeFileSync(file, html, 'utf-8');
}

// ── MAIN ──

let seoSettings = {};

async function main() {
  console.log('Pre-rendering public pages...');

  // Check dist exists
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/index.html not found. Run vite build first.');
  }

  // Read the built template
  const template = readFileSync(join(DIST, 'index.html'), 'utf-8');

  // Fetch data
  seoSettings = await fetchSeoSettings();
  const pages = await query('pages', '*', '&is_published=eq.true&order=sort_order.asc');
  const blogPosts = await query('blog_posts', '*', '&is_published=eq.true&order=published_at.desc');

  console.log(`  Found ${pages.length} pages, ${blogPosts.length} blog posts`);

  let count = 0;

  // ── Pre-render CMS pages ──
  for (const page of pages) {
    const slug = page.slug;
    const sections = page.sections || [];
    const content = renderSections(sections);
    const desc = page.meta_description || seoSettings.default_meta_description || '';

    // Determine clean path
    let path;
    const isHome = slug === 'home';
    if (isHome) path = '/';
    else if (slug === 'kontakt') path = '/kontakt';
    else path = `/${slug}`;

    // JSON-LD
    const schemas = [jsonLdOrg(seoSettings)];
    if (isHome) {
      schemas.push(jsonLdWebSite(seoSettings, desc));
    } else {
      schemas.push(jsonLdWebPage(page.title, desc, BASE_URL + path));
    }

    writePage(path, buildPage(template, {
      slug, title: page.title, description: desc,
      path, content, jsonLdSchemas: schemas, isHome,
    }));
    count++;
  }

  // ── Pre-render contact page (if not already a CMS page) ──
  if (!pages.find(p => p.slug === 'kontakt')) {
    writePage('/kontakt', buildPage(template, {
      slug: 'kontakt', title: 'Kontakt',
      description: 'Nimm Kontakt mit Studio Klarzeit auf.',
      path: '/kontakt', content: CONTACT_HTML,
      jsonLdSchemas: [jsonLdOrg(seoSettings), jsonLdWebPage('Kontakt', 'Nimm Kontakt mit Studio Klarzeit auf.', BASE_URL + '/kontakt')],
    }));
    count++;
  }

  // ── Pre-render blog list ──
  writePage('/blog', buildPage(template, {
    slug: 'blog', title: 'Blog',
    description: 'Blog — Studio Klarzeit',
    path: '/blog', content: buildBlogListHtml(blogPosts),
    jsonLdSchemas: [jsonLdOrg(seoSettings), jsonLdWebPage('Blog', 'Blog — Studio Klarzeit', BASE_URL + '/blog')],
  }));
  count++;

  // ── Pre-render blog posts ──
  for (const post of blogPosts) {
    const content = buildBlogPostHtml(post);
    const desc = post.meta_description || post.excerpt || '';
    const path = `/blog/${post.slug}`;
    const schemas = [jsonLdOrg(seoSettings), jsonLdBlogPosting(post, BASE_URL + path)];

    writePage(path, buildPage(template, {
      slug: post.slug, title: post.title, description: desc,
      ogImage: post.cover_image, path, content, jsonLdSchemas: schemas,
    }));
    count++;
  }

  console.log(`  Pre-rendered ${count} pages to dist/`);
}

main().catch(err => {
  console.error('Pre-rendering failed:', err);
  process.exit(1);
});
