import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
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
        featuredImage: data.featuredImage || undefined,
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

  // Convert markdown to HTML using unified pipeline with rehype-raw for HTML block support
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(content);
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
    featuredImage: data.featuredImage || undefined,
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

/**
 * Get related posts based on shared tags, excluding the current post
 * Returns posts sorted by number of shared tags (most relevant first)
 */
export function getRelatedPosts(
  currentSlug: string,
  currentTags: string[],
  limit = 3
): BlogPostMeta[] {
  const allPosts = getAllPosts();

  // Filter out the current post and calculate relevance score based on shared tags
  const postsWithScore = allPosts
    .filter(post => post.slug !== currentSlug)
    .map(post => {
      const sharedTags = post.tags.filter(tag => currentTags.includes(tag));
      return {
        post,
        score: sharedTags.length,
      };
    })
    .filter(item => item.score > 0) // Only include posts with at least one shared tag
    .sort((a, b) => b.score - a.score); // Sort by relevance (most shared tags first)

  // If not enough related posts by tags, fill with recent posts
  const relatedPosts = postsWithScore.slice(0, limit).map(item => item.post);

  if (relatedPosts.length < limit) {
    const remainingPosts = allPosts
      .filter(post => post.slug !== currentSlug && !relatedPosts.some(rp => rp.slug === post.slug))
      .slice(0, limit - relatedPosts.length);
    relatedPosts.push(...remainingPosts);
  }

  return relatedPosts.slice(0, limit);
}
