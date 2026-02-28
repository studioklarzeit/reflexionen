import { sb } from './config.js';
import { state } from './state.js';
import { navigateTo } from './navigation.js';
import { showToast, esc } from './utils.js';

// ══════════════════════════════════════
// SALES OVERVIEW: All purchasable courses
// ══════════════════════════════════════

export async function renderSalesOverview() {
  const el = document.getElementById('salesCoursesList');
  if (!el) return;

  // Fetch published courses (works without auth — RLS allows public read)
  const { data: courses, error } = await sb
    .from('courses')
    .select('*')
    .eq('sales_published', true)
    .order('sort_order');

  if (error || !courses?.length) {
    el.innerHTML = '<div class="empty-state">Aktuell keine Kurse verfügbar.</div>';
    return;
  }

  el.innerHTML = courses.map(c => {
    const price = c.price_onetime_amount
      ? `CHF ${(c.price_onetime_amount / 100).toFixed(0)}`
      : c.price_subscription_amount
        ? `CHF ${(c.price_subscription_amount / 100).toFixed(0)}/Mt.`
        : '';

    const img = c.image_url
      ? `<div class="card-image"><img src="${esc(c.image_url)}" alt="${esc(c.name)}" loading="lazy"></div>`
      : `<div class="card-image card-image-placeholder"><span>✦</span></div>`;

    const typeLabel = c.parent_course_id ? 'Vertiefung' : 'Online-Kurs';
    return `<div class="image-card" data-action="navigateTo" data-args='["salesDetail",{"slug":"${esc(c.sales_slug)}"}]'>
      ${img}
      <div class="image-card-body">
        <div class="image-card-type">${typeLabel}</div>
        <div class="image-card-header">
          <div class="image-card-title">${esc(c.sales_headline || c.name)}</div>
        </div>
        ${c.description ? `<div class="image-card-desc">${esc(c.description)}</div>` : ''}
        ${price ? `<div class="sales-card-price">${price}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
// SALES DETAIL: Single course sales page
// ══════════════════════════════════════

export async function renderSalesDetail(slug) {
  const el = document.getElementById('salesDetailContent');
  if (!el) return;

  // Fetch the course by slug
  const { data: courses, error } = await sb
    .from('courses')
    .select('*')
    .eq('sales_slug', slug)
    .eq('sales_published', true)
    .limit(1);

  if (error || !courses?.length) {
    el.innerHTML = `
      <div class="sales-header">
        <div class="sales-logo" data-action="navigateTo" data-args='["salesOverview"]'>Studio Klarzeit</div>
      </div>
      <div class="empty-state">Kurs nicht gefunden.</div>
    `;
    return;
  }

  const c = courses[0];

  // Count chapters
  const { data: chapters } = await sb
    .from('chapters')
    .select('id')
    .eq('course_id', c.id);
  const chapterCount = chapters?.length || 0;

  // Check if user already has access
  let hasAccess = false;
  if (state.currentUser) {
    const { data: access } = await sb
      .from('course_access')
      .select('course_id')
      .eq('user_id', state.currentUser.id)
      .eq('course_id', c.id)
      .limit(1);
    hasAccess = access && access.length > 0;
  }

  // Check parent course requirement
  let parentCourse = null;
  let hasParentAccess = true;
  if (c.parent_course_id) {
    const { data: parents } = await sb
      .from('courses')
      .select('id, name, sales_slug')
      .eq('id', c.parent_course_id)
      .limit(1);
    parentCourse = parents?.[0] || null;
    if (parentCourse && state.currentUser) {
      const { data: pAccess } = await sb
        .from('course_access')
        .select('course_id')
        .eq('user_id', state.currentUser.id)
        .eq('course_id', parentCourse.id)
        .limit(1);
      hasParentAccess = pAccess && pAccess.length > 0;
    } else if (parentCourse && !state.currentUser) {
      hasParentAccess = false;
    }
  }

  const features = c.sales_features || [];
  const priceOnetime = c.price_onetime_amount ? (c.price_onetime_amount / 100).toFixed(0) : null;
  const priceSub = c.price_subscription_amount ? (c.price_subscription_amount / 100).toFixed(0) : null;

  el.innerHTML = `
    <div class="sales-header">
      <div class="sales-logo" data-action="navigateTo" data-args='["salesOverview"]'>Studio Klarzeit</div>
      <div class="sales-nav">
        <a href="https://www.studioklarzeit.ch" class="sales-nav-link" target="_top">Website</a>
        ${state.currentUser
          ? `<button class="btn btn-ghost btn-sm" data-action="navigateTo" data-args='["courses"]'>Meine Kurse</button>`
          : `<button class="btn btn-ghost btn-sm" data-action="navigateTo" data-args='["auth"]'>Einloggen</button>`
        }
      </div>
    </div>

    <div class="sales-detail">
      ${c.image_url ? `
        <div class="sales-hero">
          <div class="sales-hero-image" style="background-image:url('${esc(c.image_url)}')"></div>
          <div class="sales-hero-overlay"></div>
          <div class="sales-hero-content">
            <span class="sales-hero-eyebrow">${c.parent_course_id ? 'Vertiefung' : 'Online-Kurs'} · ${chapterCount} Kapitel</span>
            <h1 class="sales-hero-title">${esc(c.sales_headline || c.name)}</h1>
          </div>
        </div>
      ` : `
        <div class="sales-title-section">
          <span class="eyebrow">${c.parent_course_id ? 'Vertiefung' : 'Online-Kurs'} · ${chapterCount} Kapitel</span>
          <h1 class="page-title">${esc(c.sales_headline || c.name)}</h1>
        </div>
      `}

      ${c.sales_description ? `
        <div class="sales-description">
          <p>${esc(c.sales_description).replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}

      ${features.length ? `
        <div class="sales-features">
          <h3>Was dich erwartet</h3>
          <ul>
            ${features.map(f => `<li><span class="sales-feature-check">✓</span> ${esc(f)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${parentCourse ? `
        <div class="sales-prerequisite">
          <strong>Voraussetzung:</strong> ${esc(parentCourse.name)}
          ${!hasParentAccess ? `
            <span class="sales-prerequisite-hint">
              — Du benötigst zuerst den Grundkurs.
              ${parentCourse.sales_slug ? `<a href="#" data-action="navigateTo" data-args='["salesDetail",{"slug":"${esc(parentCourse.sales_slug)}"}]' data-prevent>Zum Grundkurs →</a>` : ''}
            </span>
          ` : '<span class="sales-prerequisite-ok">✓ Freigeschaltet</span>'}
        </div>
      ` : ''}

      <div class="sales-pricing">
        <h3>Preise</h3>
        <div class="sales-pricing-cards">
          ${priceOnetime ? `
            <div class="sales-price-card">
              <div class="sales-price-label">Einmalzahlung</div>
              <div class="sales-price-amount">CHF ${priceOnetime}</div>
              <div class="sales-price-detail">Lebenslanger Zugang</div>
              ${hasAccess
                ? `<button class="btn btn-primary" data-action="navigateTo" data-args='["coursePlayer",{"courseId":"${c.id}"}]'>Zum Kurs</button>`
                : !hasParentAccess
                  ? `<button class="btn btn-primary" disabled style="opacity:0.5;cursor:not-allowed;">Grundkurs erforderlich</button>`
                  : `<button class="btn btn-primary" data-action="handlePurchase" data-args='["${c.id}","onetime"]'>${esc(c.sales_cta_text || 'Jetzt starten')}</button>`
              }
            </div>
          ` : ''}
          ${priceSub ? `
            <div class="sales-price-card">
              <div class="sales-price-label">Monatsabo</div>
              <div class="sales-price-amount">CHF ${priceSub}<span class="sales-price-period">/Monat</span></div>
              <div class="sales-price-detail">Jederzeit kündbar</div>
              ${hasAccess
                ? `<button class="btn btn-primary" data-action="navigateTo" data-args='["coursePlayer",{"courseId":"${c.id}"}]'>Zum Kurs</button>`
                : !hasParentAccess
                  ? `<button class="btn btn-secondary" disabled style="opacity:0.5;cursor:not-allowed;">Grundkurs erforderlich</button>`
                  : `<button class="btn btn-secondary" data-action="handlePurchase" data-args='["${c.id}","subscription"]'>${esc(c.sales_cta_text || 'Jetzt starten')}</button>`
              }
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════
// PURCHASE HANDLER
// ══════════════════════════════════════

export async function handlePurchase(courseId, paymentType) {
  if (!state.currentUser) {
    // Store intent and redirect to auth
    sessionStorage.setItem('pendingPurchase', JSON.stringify({ courseId, paymentType }));
    showToast('Bitte melde dich an, um den Kurs zu kaufen.');
    navigateTo('auth');
    return;
  }

  // Disable purchase button to prevent double-clicks
  const btn = document.querySelector('[data-action="handlePurchase"]');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; }

  showToast('Weiterleitung zu Stripe...');

  try {
    const { data, error } = await sb.functions.invoke('create-checkout-session', {
      body: { courseId, paymentType }
    });

    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error('Keine Checkout-URL erhalten.');
    }
  } catch (e) {
    console.error('Purchase error:', e);
    showToast('Fehler beim Erstellen der Checkout-Session. Bitte versuche es erneut.', 'error');
    if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; }
  }
}

// Check for pending purchase after login
export async function checkPendingPurchase() {
  const raw = sessionStorage.getItem('pendingPurchase');
  if (!raw) return false;
  sessionStorage.removeItem('pendingPurchase');
  try {
    const { courseId, paymentType } = JSON.parse(raw);
    await handlePurchase(courseId, paymentType);
    return true;
  } catch (e) {
    console.error('Pending purchase error:', e);
    return false;
  }
}
