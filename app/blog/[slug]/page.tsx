import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllSlugs, getRelatedPosts } from '@/lib/blog/posts';
import { BlogCTA } from '@/components/blog/BlogCTA';
import { RelatedPosts } from '@/components/blog/RelatedPosts';
import { SITE_URL, createBreadcrumbSchema } from '@/lib/constants/structuredData';
import { JsonLd } from '@/components/JsonLd';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Required for static export - generate all blog post pages at build time
export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const imageUrl = post.featuredImage
    ? `${SITE_URL}${post.featuredImage}`
    : `${SITE_URL}/og-image.png`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    openGraph: {
      title: `${post.title} | Bleep That Sh*t!`,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${SITE_URL}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Get related posts based on tags
  const relatedPosts = getRelatedPosts(slug, post.tags, 3);

  const imageUrl = post.featuredImage
    ? `${SITE_URL}${post.featuredImage}`
    : `${SITE_URL}/og-image.png`;

  const articleSchema = {
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    image: imageUrl,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`,
    },
    keywords: post.tags.join(', '),
  };

  // Breadcrumb schema for SEO
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: post.title, url: `${SITE_URL}/blog/${post.slug}` },
  ]);

  return (
    <>
      <JsonLd data={[articleSchema, breadcrumbSchema]} />
      <article className="editorial-section font-merriweather">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-indigo-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-indigo-600">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{post.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1
            className="font-inter mb-4 text-3xl font-extrabold text-black sm:text-4xl"
            style={{ lineHeight: 1.2 }}
          >
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span>By {post.author}</span>
            <span>•</span>
            <span>{new Date(post.date).toLocaleDateString()}</span>
            <span>•</span>
            <span>{post.readingTime} min read</span>
          </div>
        </header>

        {/* Hero Image */}
        {post.featuredImage && (
          <div className="relative mb-8 aspect-video overflow-hidden rounded-xl">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <BlogCTA />

        {/* Related Posts */}
        <RelatedPosts posts={relatedPosts} currentSlug={slug} />

        {/* Back link */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <Link
            href="/blog"
            className="font-inter inline-flex items-center gap-2 font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <span>←</span> Back to Blog
          </Link>
        </div>
      </article>
    </>
  );
}
