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
