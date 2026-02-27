#!/usr/bin/env node
// ── Sitemap Generator ──
// Fetches published pages and blog posts from Supabase,
// generates a sitemap.xml, and writes it to public/sitemap.xml.
// Run: node scripts/generate-sitemap.mjs

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Supabase config (same as src/config.js) ──
const SUPABASE_URL = 'https://jzqnwspmhdysimayxuty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cBA_p9hx5rzAMX9aYnLm9w_XYlHAh94';

// ── Try to read canonical base URL from existing SEO settings ──
const BASE_URL = 'https://app.studioklarzeit.de';

async function supabaseQuery(table, select, filters = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filters}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${res.statusText}`);
  return res.json();
}

function toISODate(ts) {
  if (!ts) return new Date().toISOString().split('T')[0];
  return new Date(ts).toISOString().split('T')[0];
}

function xmlEntry(loc, lastmod, priority, changefreq = 'weekly') {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
  console.log('Generating sitemap...');

  // Fetch published pages
  const pages = await supabaseQuery(
    'pages',
    'slug,title,updated_at',
    '&is_published=eq.true&order=sort_order.asc'
  );

  // Fetch published blog posts
  const posts = await supabaseQuery(
    'blog_posts',
    'slug,title,updated_at,published_at',
    '&is_published=eq.true&order=published_at.desc'
  );

  console.log(`  Found ${pages.length} pages, ${posts.length} blog posts`);

  const entries = [];

  // Home page (highest priority)
  const homePage = pages.find(p => p.slug === 'home');
  entries.push(xmlEntry(
    `${BASE_URL}/`,
    toISODate(homePage?.updated_at),
    '1.0',
    'daily'
  ));

  // Other pages (clean paths)
  for (const page of pages) {
    if (page.slug === 'home') continue;
    entries.push(xmlEntry(
      `${BASE_URL}/${page.slug}`,
      toISODate(page.updated_at),
      '0.8'
    ));
  }

  // Blog overview
  entries.push(xmlEntry(
    `${BASE_URL}/blog`,
    toISODate(posts[0]?.published_at || posts[0]?.updated_at),
    '0.7',
    'daily'
  ));

  // Blog posts
  for (const post of posts) {
    entries.push(xmlEntry(
      `${BASE_URL}/blog/${post.slug}`,
      toISODate(post.updated_at || post.published_at),
      '0.6'
    ));
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  // Write to public/
  const publicDir = join(ROOT, 'public');
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(join(publicDir, 'sitemap.xml'), sitemap, 'utf-8');

  console.log(`  Written to public/sitemap.xml (${entries.length} URLs)`);
}

main().catch(err => {
  console.error('Sitemap generation failed:', err);
  process.exit(1);
});
