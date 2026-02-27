// ── SEO & TRACKING (GA4, Meta Pixel) ──

import { sb } from './config.js';
import { esc, btnLoading, showToast } from './utils.js';

// ── Cached settings ──
let seoSettings = null;

// ── Load / Get / Set ──

export async function loadSeoSettings() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'seo_tracking').single();
    if (data?.value) {
      seoSettings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }
  } catch (e) {
    console.warn('SEO settings not loaded:', e);
  }
  if (!seoSettings) {
    seoSettings = {
      site_title: 'Studio Klarzeit',
      default_meta_description: '',
      default_og_image: '',
      canonical_base_url: '',
      ga4_measurement_id: '',
      meta_pixel_id: '',
    };
  }
  return seoSettings;
}

export function getSeoSettings() {
  return seoSettings;
}

export function setSeoSettings(s) {
  seoSettings = s;
}

// ── Meta tag helpers ──

function ensureMeta(attr, attrValue, content) {
  let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content || '');
}

function ensureCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href || '');
}

/**
 * Update all meta / OG / title tags for the current page.
 */
export function updateMeta({ title, description, ogImage, path } = {}) {
  const s = seoSettings || {};
  const siteTitle = s.site_title || 'Studio Klarzeit';
  const baseUrl = (s.canonical_base_url || '').replace(/\/$/, '');

  // document.title
  document.title = title ? `${title} — ${siteTitle}` : siteTitle;

  // description
  const desc = description || s.default_meta_description || '';
  ensureMeta('name', 'description', desc);

  // OG tags
  ensureMeta('property', 'og:title', document.title);
  ensureMeta('property', 'og:description', desc);
  ensureMeta('property', 'og:image', ogImage || s.default_og_image || '');
  ensureMeta('property', 'og:type', 'website');
  ensureMeta('property', 'og:site_name', siteTitle);
  if (baseUrl && path) {
    ensureMeta('property', 'og:url', baseUrl + path);
  }

  // Canonical
  if (baseUrl && path) {
    ensureCanonical(baseUrl + path);
  }
}

// ── Google Analytics 4 ──

let ga4Injected = false;

export function initGA4() {
  const id = seoSettings?.ga4_measurement_id;
  if (!id || ga4Injected) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: false }); // SPA: manual page views

  ga4Injected = true;
}

export function trackGA4PageView(pagePath, pageTitle) {
  if (!ga4Injected || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  });
}

// ── Meta Pixel ──

let pixelInjected = false;

export function initMetaPixel() {
  const id = seoSettings?.meta_pixel_id;
  if (!id || pixelInjected) return;

  /* eslint-disable */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', id);
  pixelInjected = true;
}

export function trackPixelPageView() {
  if (!pixelInjected || !window.fbq) return;
  window.fbq('track', 'PageView');
}

// ── Combined navigation hook ──

const PATH_MAP = {
  publicHome: '/',
  publicAbout: '/about',
  publicContact: '/kontakt',
  publicBlog: '/blog',
  publicDatenschutz: '/datenschutz',
  publicAgb: '/agb',
  publicPrivacy: '/privacy',
};

/**
 * Called from navigateTo() on every view switch.
 * Sets generic meta + fires tracking events.
 * Public pages will call updatePageMeta() again with page-specific data.
 */
export function onNavigate(view, params) {
  let path = PATH_MAP[view] || '';
  if (view === 'publicBlogPost' && params?.slug) path = `/blog/${params.slug}`;
  if (view === 'publicCoursePreview' && params?.slug) path = `/kurs/${params.slug}`;
  if (view === 'publicPage' && params?.slug) path = `/seite/${params.slug}`;
  if (view === 'auth') path = '/';

  // Generic meta update (page-specific meta will overwrite later for public pages)
  updateMeta({ path });

  // Clear JSON-LD + hreflang for non-public views (will be re-set by updatePageMeta)
  updateHreflang(path);

  // Fire tracking
  trackGA4PageView(path || '/' + view, document.title);
  trackPixelPageView();
}

/**
 * Called by public.js after page data is loaded — overrides with page-specific meta.
 */
export function updatePageMeta(pageData, path) {
  updateMeta({
    title: pageData.title,
    description: pageData.meta_description || '',
    ogImage: pageData.cover_image || '',
    path,
  });
  // Re-fire GA4 with correct title (pixel already fired on navigate)
  trackGA4PageView(path, document.title);

  // JSON-LD + Hreflang
  injectJsonLd(pageData, path);
  updateHreflang(path);
}

// ── JSON-LD Structured Data ──

let jsonLdScript = null;

function injectJsonLd(pageData, path) {
  const s = seoSettings || {};
  const baseUrl = (s.canonical_base_url || '').replace(/\/$/, '');
  const siteTitle = s.site_title || 'Studio Klarzeit';
  const url = baseUrl && path ? baseUrl + path : '';

  const schemas = [];

  // Organization (always present)
  schemas.push({
    '@type': 'Organization',
    name: siteTitle,
    url: baseUrl || undefined,
    logo: s.default_og_image || undefined,
  });

  // Detect page type
  const isBlogPost = path && path.startsWith('/blog/');
  const isHome = path === '/';

  if (isHome) {
    // WebSite schema for home page
    schemas.push({
      '@type': 'WebSite',
      name: siteTitle,
      url: baseUrl || undefined,
      description: pageData.meta_description || s.default_meta_description || '',
    });
  } else if (isBlogPost && pageData.title) {
    // BlogPosting schema
    const posting = {
      '@type': 'BlogPosting',
      headline: pageData.title,
      description: pageData.meta_description || pageData.excerpt || '',
      url: url || undefined,
      datePublished: pageData.published_at || pageData.created_at || undefined,
      dateModified: pageData.updated_at || undefined,
      author: {
        '@type': 'Person',
        name: pageData.author || siteTitle,
      },
      publisher: {
        '@type': 'Organization',
        name: siteTitle,
      },
    };
    if (pageData.cover_image) {
      posting.image = pageData.cover_image;
    }
    schemas.push(posting);
  } else if (pageData.title) {
    // WebPage schema for CMS pages
    schemas.push({
      '@type': 'WebPage',
      name: pageData.title,
      description: pageData.meta_description || '',
      url: url || undefined,
    });

    // FAQPage schema if page has FAQ sections
    const faqItems = extractFaqItems(pageData);
    if (faqItems.length > 0) {
      schemas.push({
        '@type': 'FAQPage',
        mainEntity: faqItems.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      });
    }
  }

  // Build the JSON-LD graph
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': schemas,
  };

  // Inject or update the script tag
  if (!jsonLdScript) {
    jsonLdScript = document.createElement('script');
    jsonLdScript.type = 'application/ld+json';
    document.head.appendChild(jsonLdScript);
  }
  jsonLdScript.textContent = JSON.stringify(jsonLd);
}

function extractFaqItems(pageData) {
  const sections = pageData.sections || [];
  const items = [];
  for (const sec of sections) {
    const c = sec.content || sec;
    if (sec.type === 'faq' && Array.isArray(c.items)) {
      for (const item of c.items) {
        if (item.question && item.answer) {
          items.push({ question: item.question, answer: item.answer });
        }
      }
    }
  }
  return items;
}

// ── Hreflang Tags ──

const HREFLANG_PAIRS = {
  '/datenschutz': { de: '/datenschutz', en: '/privacy' },
  '/privacy': { de: '/datenschutz', en: '/privacy' },
};

function updateHreflang(path) {
  // Remove old hreflang tags
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

  const pair = HREFLANG_PAIRS[path];
  if (!pair) return;

  const baseUrl = ((seoSettings?.canonical_base_url) || '').replace(/\/$/, '');
  if (!baseUrl) return;

  for (const [lang, langPath] of Object.entries(pair)) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = lang;
    link.href = baseUrl + langPath;
    document.head.appendChild(link);
  }

  // x-default (points to German version)
  const xDefault = document.createElement('link');
  xDefault.rel = 'alternate';
  xDefault.hreflang = 'x-default';
  xDefault.href = baseUrl + pair.de;
  document.head.appendChild(xDefault);
}

// ── Admin: Load / Save ──

export function loadSeoEditor() {
  const s = seoSettings || {};
  const el = (id) => document.getElementById(id);
  el('seoSiteTitleInput').value = s.site_title || '';
  el('seoDefaultDescInput').value = s.default_meta_description || '';
  el('seoOgImageInput').value = s.default_og_image || '';
  el('seoCanonicalInput').value = s.canonical_base_url || '';
  el('seoGa4IdInput').value = s.ga4_measurement_id || '';
  el('seoPixelIdInput').value = s.meta_pixel_id || '';
}

export async function saveSeoSettings() {
  btnLoading('saveSeoBtn', true);

  const val = (id) => (document.getElementById(id)?.value || '').trim();

  const newSettings = {
    site_title: val('seoSiteTitleInput'),
    default_meta_description: val('seoDefaultDescInput'),
    default_og_image: val('seoOgImageInput'),
    canonical_base_url: val('seoCanonicalInput').replace(/\/$/, ''),
    ga4_measurement_id: val('seoGa4IdInput'),
    meta_pixel_id: val('seoPixelIdInput'),
  };

  try {
    const { error } = await sb.from('settings').upsert(
      { key: 'seo_tracking', value: newSettings },
      { onConflict: 'key' }
    );
    if (error) throw error;

    seoSettings = newSettings;

    // (Re-)initialize tracking if IDs were just added
    initGA4();
    initMetaPixel();

    showToast('SEO & Tracking gespeichert.');
  } catch (e) {
    console.error('saveSeoSettings:', e);
    showToast('Fehler beim Speichern.', 'error');
  }
  btnLoading('saveSeoBtn', false);
}
