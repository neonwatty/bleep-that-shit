# SEO Plan: Dynamic Sitemap Generation

## Overview

Replace the static `sitemap.xml` with a build-time script that auto-generates the sitemap, including future blog posts with accurate `lastmod` dates from git history.

## Current State

- Static `public/sitemap.xml` with hardcoded URLs and dates
- 3 pages: `/`, `/bleep`, `/sampler`
- robots.txt already references sitemap correctly

## Why Build-Time Script?

Next.js's `app/sitemap.ts` does **not work** with `output: 'export'` (static export). A build-time script is the standard solution.

## Implementation

### 1. Create Sitemap Script (`scripts/generate-sitemap.ts`) - NEW FILE

```typescript
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://bleep-that-sht.com';
const APP_DIR = path.join(process.cwd(), 'app');
const CONTENT_DIR = path.join(process.cwd(), 'content');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

const PAGE_CONFIG: Record<string, { priority: number; changefreq: string }> = {
  '/': { priority: 1.0, changefreq: 'weekly' },
  '/bleep': { priority: 0.9, changefreq: 'weekly' },
  '/sampler': { priority: 0.7, changefreq: 'monthly' },
  '/blog': { priority: 0.8, changefreq: 'daily' },
};

function getGitLastModified(filePath: string): string {
  try {
    const result = execSync(`git log -1 --format="%ai" -- "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (result) return new Date(result).toISOString().split('T')[0];
  } catch {}
  return new Date().toISOString().split('T')[0];
}

function getStaticPages(): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  function scanDirectory(dir: string, routePath: string = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('_') && !item.name.startsWith('[')) {
        if (item.name !== 'api' && item.name !== 'workers') {
          scanDirectory(path.join(dir, item.name), `${routePath}/${item.name}`);
        }
      } else if (item.name === 'page.tsx') {
        const route = routePath || '/';
        const config = PAGE_CONFIG[route] || { priority: 0.5, changefreq: 'monthly' };
        entries.push({
          loc: `${SITE_URL}${route}`,
          lastmod: getGitLastModified(path.join(dir, item.name)),
          changefreq: config.changefreq,
          priority: config.priority,
        });
      }
    }
  }

  scanDirectory(APP_DIR);
  return entries;
}

function getBlogPosts(): SitemapEntry[] {
  const blogDir = path.join(CONTENT_DIR, 'blog');
  if (!fs.existsSync(blogDir)) return [];

  return fs
    .readdirSync(blogDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      loc: `${SITE_URL}/blog/${f.replace('.md', '')}`,
      lastmod: getGitLastModified(path.join(blogDir, f)),
      changefreq: 'monthly',
      priority: 0.6,
    }));
}

function generateSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      e => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// Main
const pages = getStaticPages();
const posts = getBlogPosts();
const all = [...pages, ...posts].sort((a, b) => b.priority - a.priority);

fs.writeFileSync(OUTPUT_PATH, generateSitemapXml(all));
console.log(`Sitemap generated with ${all.length} URLs`);
```

### 2. Update package.json Scripts

```json
{
  "scripts": {
    "sitemap": "tsx scripts/generate-sitemap.ts",
    "prebuild": "npm run sitemap",
    "build": "next build",
    "export": "npm run sitemap && next build && mkdir -p out && touch out/.nojekyll"
  }
}
```

### 3. Delete Static Sitemap

Remove `public/sitemap.xml` - it will be auto-generated on each build.

## Expected Output

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bleep-that-sht.com/</loc>
    <lastmod>2025-11-21</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bleep-that-sht.com/bleep</loc>
    <lastmod>2025-11-27</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Blog posts auto-included when added -->
</urlset>
```

## Files to Create/Modify

| File                          | Action                       |
| ----------------------------- | ---------------------------- |
| `scripts/generate-sitemap.ts` | Create                       |
| `package.json`                | Modify - add sitemap scripts |
| `public/sitemap.xml`          | Delete (auto-generated)      |

## Testing

```bash
# Generate sitemap manually
npm run sitemap

# Verify output
cat public/sitemap.xml

# Full build test
npm run build
ls -la out/sitemap.xml
```

## Benefits

- **Auto-updates** when pages/posts are added
- **Accurate dates** from git history
- **Blog integration** - auto-includes blog posts when blog is added
- **Build-time** - works with static export
