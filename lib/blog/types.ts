export interface BlogPostMeta {
  title: string;
  slug: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  readingTime: number;
  featured?: boolean;
  featuredImage?: string; // Path relative to /public, e.g., "/images/blog/my-post.jpg"
}

export interface BlogPost extends BlogPostMeta {
  content: string; // HTML content
}
