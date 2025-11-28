import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts } from '@/lib/blog/posts';
import { SITE_URL } from '@/lib/constants/structuredData';

export const metadata: Metadata = {
  title: 'Blog - Audio & Video Censoring Tips',
  description:
    'Learn how to bleep words, censor audio, and clean up video content. Tutorials, tips, and guides for content creators.',
  keywords: [
    'audio censoring tutorial',
    'video bleeping guide',
    'content moderation tips',
    'podcast censoring',
    'YouTube video editing',
  ],
  openGraph: {
    title: 'Blog - Audio & Video Censoring Tips | Bleep That Sh*t!',
    description:
      'Learn how to bleep words, censor audio, and clean up video content. Tutorials and guides for content creators.',
    url: `${SITE_URL}/blog`,
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="editorial-section font-merriweather">
      <h1
        className="font-inter mb-8 text-3xl font-extrabold text-black uppercase sm:text-4xl"
        style={{ lineHeight: 1.1 }}
      >
        Blog
      </h1>

      <p className="mb-10 max-w-2xl text-lg text-gray-700">
        Tutorials, tips, and guides for censoring audio and video content. Learn how to use Bleep
        That Sh*t! and other tools to keep your content clean.
      </p>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-lg text-gray-600">No blog posts yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block overflow-hidden rounded-xl border border-gray-200 transition-all hover:border-gray-300 hover:shadow-lg"
            >
              {/* Thumbnail */}
              {post.featuredImage ? (
                <div className="relative aspect-video w-full overflow-hidden">
                  <Image
                    src={post.featuredImage}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-r from-yellow-100 to-pink-100">
                  <span className="text-4xl">📢</span>
                </div>
              )}

              {/* Card Content */}
              <div className="p-6">
                <div className="mb-3 flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="font-inter mb-2 text-xl font-bold text-black group-hover:text-indigo-600">
                  {post.title}
                </h2>
                <p className="mb-4 line-clamp-2 text-gray-700">{post.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{post.readingTime} min read</span>
                  <span>{new Date(post.date).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* CTA Section */}
      <div className="mt-16 rounded-xl bg-gradient-to-r from-yellow-100 to-pink-100 p-8 text-center">
        <h2 className="font-inter mb-3 text-2xl font-bold text-black">
          Ready to Bleep Your Content?
        </h2>
        <p className="mb-6 text-lg text-gray-700">
          Try our free in-browser tool - no uploads, 100% private.
        </p>
        <Link
          href="/bleep"
          className="inline-block rounded-full bg-black px-8 py-3 text-lg font-bold text-white transition-all hover:scale-105 hover:bg-gray-800"
        >
          Bleep Your Sh*t!
        </Link>
      </div>
    </div>
  );
}
