import { readFileSync, writeFileSync } from 'node:fs';

const base = (process.env.VITE_SITE_URL || 'https://fusionerp.systems').replace(/\/$/, '');
const pages = [
  ['/', 1.0],
  ['/about', 0.7],
  ['/services', 0.8],
  ['/pricing', 0.9],
  ['/contact', 0.6],
  ['/signup', 0.8],
  ['/blog', 0.8],
  ['/privacy', 0.3],
  ['/terms', 0.3],
  ['/cookies', 0.3]
];
const articles = [
  'erp-inventory-control',
  'pos-point-of-sale',
  'crm-customer-follow-up',
  'erp-accounting-and-finance'
];
for (const slug of articles) pages.push([`/blog/${slug}`, 0.65]);

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([path, priority]) => `  <url><loc>${base}${path}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><priority>${Number(priority).toFixed(2)}</priority></url>`).join('\n')}\n</urlset>\n`;
writeFileSync('public/sitemap.xml', xml);
console.log(`Generated sitemap for ${pages.length} public URLs`);
