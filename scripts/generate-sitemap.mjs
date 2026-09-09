import { writeFileSync } from 'node:fs';
const base=(process.env.VITE_SITE_URL||'https://example.com').replace(/\/$/,'');
const pages=[['/',1],['/about',.7],['/services',.8],['/pricing',.9],['/contact',.6],['/signup',.8],['/privacy',.3],['/terms',.3],['/cookies',.3]];
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([path,priority])=>`  <url><loc>${base}${path}</loc><lastmod>${new Date().toISOString().slice(0,10)}</lastmod><priority>${priority.toFixed(1)}</priority></url>`).join('\n')}\n</urlset>\n`;
writeFileSync('public/sitemap.xml',xml);
console.log(`Generated sitemap for ${pages.length} public URLs`);
