import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import type { BlogPostMeta, BlogPost } from './types';

const postsDirectory = path.join(process.cwd(), 'content/blog');

/**
 * Get all blog post metadata, sorted by date (newest first)
 */
export function getAllPosts(): BlogPostMeta[] {
  // Check if directory exists
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter(name => name.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        title: data.title || slug,
        slug,
        description: data.description || '',
        date: data.date || new Date().toISOString().split('T')[0],
        author: data.author || 'Bleep That Team',
        tags: data.tags || [],
        readingTime: data.readingTime || 5,
        featured: data.featured || false,
      } as BlogPostMeta;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Get a single blog post by slug, including HTML content
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  // Convert markdown to HTML
  const processedContent = await remark().use(html).process(content);
  const contentHtml = processedContent.toString();

  return {
    title: data.title || slug,
    slug,
    description: data.description || '',
    date: data.date || new Date().toISOString().split('T')[0],
    author: data.author || 'Bleep That Team',
    tags: data.tags || [],
    readingTime: data.readingTime || 5,
    featured: data.featured || false,
    content: contentHtml,
  };
}

/**
 * Get all post slugs for static generation
 */
export function getAllSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  return fs
    .readdirSync(postsDirectory)
    .filter(name => name.endsWith('.md'))
    .map(name => name.replace(/\.md$/, ''));
}
