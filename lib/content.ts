import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

export type ContentType = 'blog' | 'work' | 'playbooks';

export type ContentMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tag?: string;
  cover?: string;
  author?: string;
  readingTime: string;
  draft?: boolean;
  gated?: boolean;
  // case study specific
  client?: string;
  metrics?: { label: string; value: string }[];
  stack?: string[];
  liveUrl?: string;
};

const ROOT = path.join(process.cwd(), 'content');

export function getAllSlugs(type: ContentType): string[] {
  const dir = path.join(ROOT, type);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
    .map((f) => f.replace(/\.mdx?$/, ''));
}

export function getContent(type: ContentType, slug: string): { meta: ContentMeta; body: string } | null {
  const filePath = path.join(ROOT, type, `${slug}.mdx`);
  const altPath = path.join(ROOT, type, `${slug}.md`);
  const finalPath = fs.existsSync(filePath) ? filePath : fs.existsSync(altPath) ? altPath : null;
  if (!finalPath) return null;
  const raw = fs.readFileSync(finalPath, 'utf8');
  const { data, content } = matter(raw);
  const stats = readingTime(content);
  return {
    meta: {
      slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      date: data.date ?? new Date().toISOString().slice(0, 10),
      tag: data.tag,
      cover: data.cover,
      author: data.author,
      readingTime: stats.text,
      draft: data.draft ?? false,
      gated: data.gated ?? false,
      client: data.client,
      metrics: data.metrics,
      stack: data.stack,
      liveUrl: data.liveUrl,
    },
    body: content,
  };
}

export function listContent(type: ContentType, includeDrafts = false): ContentMeta[] {
  return getAllSlugs(type)
    .map((slug) => getContent(type, slug))
    .filter((c): c is { meta: ContentMeta; body: string } => c !== null)
    .filter((c) => includeDrafts || !c.meta.draft)
    .map((c) => c.meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
