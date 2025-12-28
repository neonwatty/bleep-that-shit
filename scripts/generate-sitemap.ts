/**
 * Sitemap Generation Script
 *
 * Generates sitemap.xml at build time by:
 * 1. Scanning app/ directory for page.tsx files
 * 2. Scanning content/blog/ for markdown blog posts (future)
 * 3. Getting lastmod dates from git history
 * 4. Writing sitemap.xml to public/
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://bleep-that-shit.com';
const APP_DIR = path.join(process.cwd(), 'app');
const CONTENT_DIR = path.join(process.cwd(), 'content');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

// Priority and changefreq configuration per route
const PAGE_CONFIG: Record<string, { priority: number; changefreq: SitemapEntry['changefreq'] }> = {
  '/': { priority: 1.0, changefreq: 'weekly' },
  '/bleep': { priority: 0.9, changefreq: 'weekly' },
  '/sampler': { priority: 0.7, changefreq: 'monthly' },
  '/blog': { priority: 0.8, changefreq: 'daily' },
};

// Default config for blog posts
const BLOG_POST_CONFIG = { priority: 0.6, changefreq: 'monthly' as const };

/**
 * Get the last modified date of a file from git history
 */
function getGitLastModified(filePath: string): string {
  try {
    const result = execSync(`git log -1 --format="%ai" -- "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (result) {
      // Parse git date format: "2025-11-27 06:05:45 -0700"
      const date = new Date(result);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
  } catch {
    // File not in git or git command failed
  }

  // Fallback to file system mtime
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString().split('T')[0];
  } catch {
    // File doesn't exist, use today
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Scan the app directory for page.tsx files and extract routes
 */
function getStaticPages(): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  function scanDirectory(dir: string, routePath: string = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        // Skip special Next.js directories
        if (item.name.startsWith('_') || item.name.startsWith('.')) continue;
        if (item.name === 'api' || item.name === 'workers') continue;

        // Handle dynamic routes (skip them as they need special handling)
        if (item.name.startsWith('[') && item.name.endsWith(']')) continue;

        scanDirectory(fullPath, `${routePath}/${item.name}`);
      } else if (item.name === 'page.tsx' || item.name === 'page.ts') {
        const route = routePath || '/';
        const config = PAGE_CONFIG[route] || { priority: 0.5, changefreq: 'monthly' as const };

        entries.push({
          loc: `${SITE_URL}${route}`,
          lastmod: getGitLastModified(fullPath),
          changefreq: config.changefreq,
          priority: config.priority,
        });
      }
    }
  }

  scanDirectory(APP_DIR);
  return entries;
}

/**
 * Scan the content/blog directory for blog posts
 */
function getBlogPosts(): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const blogDir = path.join(CONTENT_DIR, 'blog');

  if (!fs.existsSync(blogDir)) {
    return entries; // No blog directory yet
  }

  const items = fs.readdirSync(blogDir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(blogDir, item.name);
    let slug: string;
    let contentFile: string;

    if (item.isDirectory()) {
      // content/blog/[slug]/index.md format
      const indexFile = fs
        .readdirSync(fullPath)
        .find(f => f.startsWith('index.') && (f.endsWith('.mdx') || f.endsWith('.md')));
      if (!indexFile) continue;

      slug = item.name;
      contentFile = path.join(fullPath, indexFile);
    } else if (item.name.endsWith('.mdx') || item.name.endsWith('.md')) {
      // content/blog/[slug].md format
      slug = item.name.replace(/\.(mdx|md)$/, '');
      contentFile = fullPath;
    } else {
      continue;
    }

    entries.push({
      loc: `${SITE_URL}/blog/${slug}`,
      lastmod: getGitLastModified(contentFile),
      changefreq: BLOG_POST_CONFIG.changefreq,
      priority: BLOG_POST_CONFIG.priority,
    });
  }

  // Note: /blog index page is already picked up by getStaticPages() from app/blog/page.tsx

  return entries;
}

/**
 * Generate the sitemap XML content
 */
function generateSitemapXml(entries: SitemapEntry[]): string {
  const urlElements = entries
    .map(
      entry => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>
`;
}

/**
 * Main execution
 */
function main() {
  console.log('Generating sitemap...');

  const staticPages = getStaticPages();
  console.log(`  Found ${staticPages.length} static pages`);

  const blogPosts = getBlogPosts();
  console.log(`  Found ${blogPosts.length} blog posts`);

  const allEntries = [...staticPages, ...blogPosts];

  // Sort by priority (highest first), then alphabetically
  allEntries.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.loc.localeCompare(b.loc);
  });

  const xml = generateSitemapXml(allEntries);
  fs.writeFileSync(OUTPUT_PATH, xml);

  console.log(`  Sitemap written to ${OUTPUT_PATH}`);
  console.log('  URLs included:');
  allEntries.forEach(e => console.log(`    - ${e.loc} (priority: ${e.priority})`));
}

main();
