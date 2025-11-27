# SEO Plan: Blog/Content Section

## Overview

Add a markdown-based blog to target SEO keywords and drive organic traffic to the main tool. Works with static export, no external CMS required.

## Target Keywords

- "bleep out words in video"
- "censor audio online free"
- "remove swear words from video"
- "clean version podcast"
- "add bleep sound to video"

## Required Dependencies

```bash
npm install gray-matter remark remark-html
```

## Directory Structure

```
content/
  blog/
    how-to-bleep-words-in-video.md
    censor-audio-online-free.md
    clean-version-podcast.md
lib/
  blog/
    types.ts
    posts.ts
app/
  blog/
    page.tsx              # Blog index
    [slug]/
      page.tsx            # Individual posts
components/
  blog/
    BlogCard.tsx
    BlogPost.tsx
    BlogCTA.tsx
```

## Implementation

### 1. Create Types (`lib/blog/types.ts`)

```typescript
export interface BlogPostMeta {
  title: string;
  slug: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  readingTime: number;
  featured?: boolean;
}

export interface BlogPost extends BlogPostMeta {
  content: string; // HTML content
}
```

### 2. Create Blog Utilities (`lib/blog/posts.ts`)

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'content/blog');

export function getAllPosts(): BlogPostMeta[] {
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter(name => name.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const { data } = matter(fs.readFileSync(fullPath, 'utf8'));
      return { ...data, slug } as BlogPostMeta;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<BlogPost> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const { data, content } = matter(fs.readFileSync(fullPath, 'utf8'));
  const processed = await remark().use(html).process(content);
  return { ...data, slug, content: processed.toString() } as BlogPost;
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(postsDirectory)
    .filter(name => name.endsWith('.md'))
    .map(name => name.replace(/\.md$/, ''));
}
```

### 3. Create Blog Index (`app/blog/page.tsx`)

```typescript
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog/posts';

export const metadata: Metadata = {
  title: 'Blog - Audio & Video Censoring Tips',
  description: 'Learn how to bleep words, censor audio, and clean up video content.',
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <div className="editorial-section">
      <h1 className="font-inter mb-8 text-3xl font-extrabold uppercase">Blog</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <div className="rounded-xl border p-6 hover:shadow-lg">
              <h2 className="font-inter text-xl font-bold">{post.title}</h2>
              <p className="text-gray-700">{post.description}</p>
              <span className="text-sm text-gray-500">{post.readingTime} min read</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### 4. Create Post Page (`app/blog/[slug]/page.tsx`)

```typescript
import type { Metadata } from 'next';
import { getPostBySlug, getAllSlugs } from '@/lib/blog/posts';
import { BlogCTA } from '@/components/blog/BlogCTA';

// REQUIRED for static export
export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  return {
    title: post.title,
    description: post.description,
    openGraph: { type: 'article', publishedTime: post.date },
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  return (
    <article className="prose prose-lg max-w-none">
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
      <BlogCTA />
    </article>
  );
}
```

### 5. Create CTA Component (`components/blog/BlogCTA.tsx`)

```typescript
import Link from 'next/link';

export function BlogCTA() {
  return (
    <div className="my-8 rounded-xl bg-gradient-to-r from-yellow-100 to-pink-100 p-6 text-center">
      <h3 className="font-inter text-xl font-bold">Ready to Bleep Your Content?</h3>
      <p className="mb-4">Try our free in-browser tool - no uploads, 100% private.</p>
      <Link href="/bleep" className="rounded-full bg-black px-6 py-3 text-white">
        Bleep Your Sh*t!
      </Link>
    </div>
  );
}
```

### 6. Frontmatter Schema

```yaml
---
title: 'How to Bleep Out Words in Video: Complete Guide'
slug: 'how-to-bleep-words-in-video'
description: 'Learn how to censor words from videos for free, directly in your browser.'
date: '2025-01-15'
author: 'Bleep That Team'
tags: ['tutorial', 'video editing']
readingTime: 5
featured: true
---
```

### 7. Add Prose Styles (`app/globals.css`)

```css
.prose {
  font-size: 1.125rem;
  line-height: 1.8;
}
.prose h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 2.5rem;
}
.prose p {
  margin-bottom: 1.5rem;
}
.prose a {
  color: #2563eb;
  text-decoration: underline;
}
.prose code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}
```

### 8. Update Navigation

Add Blog link to `components/MobileNav.tsx` and desktop nav.

## Files to Create

| File                           | Purpose                      |
| ------------------------------ | ---------------------------- |
| `content/blog/`                | Directory for markdown posts |
| `lib/blog/types.ts`            | TypeScript types             |
| `lib/blog/posts.ts`            | Blog utilities               |
| `app/blog/page.tsx`            | Blog index                   |
| `app/blog/[slug]/page.tsx`     | Post pages                   |
| `components/blog/BlogCard.tsx` | Post preview card            |
| `components/blog/BlogCTA.tsx`  | Call-to-action               |

## Initial Blog Posts to Write

1. "How to Bleep Out Words in Video" (target: "bleep out words in video")
2. "Free Online Audio Censoring Tool" (target: "censor audio online free")
3. "Create Clean Podcast Episodes" (target: "clean version podcast")
4. "Remove Swear Words from YouTube Videos" (target: "remove swear words video")
