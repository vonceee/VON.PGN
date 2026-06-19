export interface SitemapRoute {
  path: string;
  priority: number;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

export const SITEMAP_ROUTES: SitemapRoute[] = [
  { path: '', priority: 1.0, changefreq: 'daily' },
  { path: 'tactics', priority: 0.9, changefreq: 'daily' },
  { path: 'coaches', priority: 0.8, changefreq: 'weekly' },
  { path: 'coaches/apply', priority: 0.5, changefreq: 'monthly' },
  { path: 'events', priority: 0.9, changefreq: 'daily' },
  { path: 'academy', priority: 0.8, changefreq: 'weekly' },
  { path: 'roadmap', priority: 0.7, changefreq: 'weekly' },
  { path: 'documentation', priority: 0.6, changefreq: 'weekly' },
  { path: 'whats-new', priority: 0.6, changefreq: 'weekly' },
  { path: 'contact', priority: 0.5, changefreq: 'monthly' },
  { path: 'privacy-policy', priority: 0.3, changefreq: 'monthly' },
  { path: 'terms-of-service', priority: 0.3, changefreq: 'monthly' },
  { path: 'cookie-policy', priority: 0.3, changefreq: 'monthly' },
];
