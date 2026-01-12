import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelatedPosts } from './RelatedPosts';
import type { BlogPostMeta } from '@/lib/blog/types';

const createMockPost = (slug: string, overrides: Partial<BlogPostMeta> = {}): BlogPostMeta => ({
  title: `Test Post ${slug}`,
  slug,
  description: `Description for post ${slug}`,
  date: '2025-01-01',
  author: 'Test Author',
  tags: ['tag1', 'tag2'],
  readingTime: 5,
  featured: false,
  ...overrides,
});

describe('RelatedPosts', () => {
  it('renders nothing when posts array is empty', () => {
    const { container } = render(<RelatedPosts posts={[]} currentSlug="current" />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when all posts are filtered out by currentSlug', () => {
    const posts = [createMockPost('current')];

    const { container } = render(<RelatedPosts posts={posts} currentSlug="current" />);

    expect(container.firstChild).toBeNull();
  });

  it('renders the Related Articles heading', () => {
    const posts = [createMockPost('post-1'), createMockPost('post-2')];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    expect(screen.getByText('Related Articles')).toBeInTheDocument();
  });

  it('renders up to 3 related posts', () => {
    const posts = [
      createMockPost('post-1'),
      createMockPost('post-2'),
      createMockPost('post-3'),
      createMockPost('post-4'),
    ];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    // Should only render 3 posts even though 4 are provided
    const links = screen.getAllByRole('link', { name: /Test Post/ });
    expect(links).toHaveLength(3);
  });

  it('links to correct blog post URLs', () => {
    const posts = [createMockPost('my-awesome-post')];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    const link = screen.getByRole('link', { name: /Test Post my-awesome-post/ });
    expect(link).toHaveAttribute('href', '/blog/my-awesome-post');
  });

  it('displays post titles', () => {
    const posts = [createMockPost('post-1', { title: 'My Custom Title' })];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    expect(screen.getByText('My Custom Title')).toBeInTheDocument();
  });

  it('displays post descriptions', () => {
    const posts = [createMockPost('post-1', { description: 'This is a test description' })];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('displays reading time', () => {
    const posts = [createMockPost('post-1', { readingTime: 7 })];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    expect(screen.getByText('7 min read')).toBeInTheDocument();
  });

  it('displays up to 2 tags per post', () => {
    const posts = [createMockPost('post-1', { tags: ['tag1', 'tag2', 'tag3', 'tag4'] })];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.queryByText('tag3')).not.toBeInTheDocument();
    expect(screen.queryByText('tag4')).not.toBeInTheDocument();
  });

  it('renders featured image when provided', () => {
    const posts = [
      createMockPost('post-1', {
        title: 'Post With Image',
        featuredImage: '/images/blog/test-image.jpg',
      }),
    ];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    const image = screen.getByAltText('Post With Image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src');
  });

  it('renders without image when featuredImage is not provided', () => {
    const posts = [
      createMockPost('post-1', { title: 'Post Without Image', featuredImage: undefined }),
    ];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Post Without Image')).toBeInTheDocument();
  });

  it('renders View All Articles link', () => {
    const posts = [createMockPost('post-1')];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    const viewAllLink = screen.getByRole('link', { name: /View All Articles/ });
    expect(viewAllLink).toHaveAttribute('href', '/blog');
  });

  it('filters out current post even when in the middle of the array', () => {
    const posts = [createMockPost('post-1'), createMockPost('current'), createMockPost('post-3')];

    render(<RelatedPosts posts={posts} currentSlug="current" />);

    const links = screen.getAllByRole('link', { name: /Test Post/ });
    expect(links).toHaveLength(2);
    expect(screen.getByText('Test Post post-1')).toBeInTheDocument();
    expect(screen.getByText('Test Post post-3')).toBeInTheDocument();
    expect(screen.queryByText('Test Post current')).not.toBeInTheDocument();
  });
});
