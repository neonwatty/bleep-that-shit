import Link from 'next/link';
import Image from 'next/image';
import type { BlogPostMeta } from '@/lib/blog/types';

interface RelatedPostsProps {
  posts: BlogPostMeta[];
  currentSlug: string;
}

export function RelatedPosts({ posts, currentSlug }: RelatedPostsProps) {
  // Filter out the current post
  const filteredPosts = posts.filter(post => post.slug !== currentSlug);

  if (filteredPosts.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="font-inter mb-6 text-2xl font-bold text-black">Related Articles</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPosts.slice(0, 3).map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-indigo-300 hover:shadow-lg"
          >
            {post.featuredImage && (
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={post.featuredImage}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            )}
            <div className="p-4">
              <div className="mb-2 flex flex-wrap gap-1">
                {post.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="font-inter mb-2 line-clamp-2 font-semibold text-gray-900 group-hover:text-indigo-600">
                {post.title}
              </h3>
              <p className="line-clamp-2 text-sm text-gray-600">{post.description}</p>
              <div className="mt-3 text-xs text-gray-500">{post.readingTime} min read</div>
            </div>
          </Link>
        ))}
      </div>

      {/* View All Link */}
      <div className="mt-6 text-center">
        <Link
          href="/blog"
          className="font-inter inline-flex items-center gap-2 font-semibold text-indigo-600 hover:text-indigo-800"
        >
          View All Articles <span>→</span>
        </Link>
      </div>
    </div>
  );
}
