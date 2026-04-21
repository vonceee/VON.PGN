import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://vonchess.net';
const PUBLIC_DIR = path.join(__dirname, '../public');
const DIST_DIR = path.join(__dirname, '../dist/von-pgn/browser');

const routes = [
  { path: '', priority: 1.0, changefreq: 'daily' },
  { path: 'tactics', priority: 0.9, changefreq: 'daily' },
  { path: 'tactics/leaderboard', priority: 0.7, changefreq: 'weekly' },
  { path: 'explorer', priority: 0.8, changefreq: 'weekly' },
  { path: 'coaches', priority: 0.8, changefreq: 'weekly' },
  { path: 'coaches/apply', priority: 0.5, changefreq: 'monthly' },
  { path: 'events', priority: 0.9, changefreq: 'daily' },
  { path: 'arena', priority: 0.8, changefreq: 'daily' },
  { path: 'tv', priority: 0.7, changefreq: 'daily' },
  { path: 'academy', priority: 0.8, changefreq: 'weekly' },
  { path: 'roadmap', priority: 0.7, changefreq: 'weekly' },
  { path: 'documentation', priority: 0.6, changefreq: 'weekly' },
  { path: 'whats-new', priority: 0.6, changefreq: 'weekly' },
  { path: 'contact', priority: 0.5, changefreq: 'monthly' },
  { path: 'privacy-policy', priority: 0.3, changefreq: 'monthly' },
  { path: 'terms-of-service', priority: 0.3, changefreq: 'monthly' },
  { path: 'cookie-policy', priority: 0.3, changefreq: 'monthly' },
];

function generateXml(routes) {
  const xmlEntries = routes
    .map(
      (r) => `  <url>
    <loc>${BASE_URL}/${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
}

const xmlContent = generateXml(routes);

// Write to public folder (for dev/git)
const publicPath = path.join(PUBLIC_DIR, 'sitemap_static.xml');
fs.writeFileSync(publicPath, xmlContent);
console.log(`Generated: ${publicPath}`);

// Write to dist folder (if it exists, for build process)
if (fs.existsSync(DIST_DIR)) {
  const distPath = path.join(DIST_DIR, 'sitemap_static.xml');
  fs.writeFileSync(distPath, xmlContent);
  console.log(`Generated: ${distPath}`);
} else {
  console.log('Dist directory not found, skipping dist write.');
}
