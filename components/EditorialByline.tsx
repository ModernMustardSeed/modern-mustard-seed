import Link from 'next/link';
import { SITE } from '@/lib/seo';

export default function EditorialByline({ author = SITE.founder, date, modified }: { author?: string; date: string; modified?: string }) {
  const format = (value: string) => new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  return <p className="mt-5 text-sm text-[#3a3733] leading-relaxed">
    By {author === SITE.founder ? <Link href="/about" rel="author" className="font-bold text-[#1E50C8] underline">{author}</Link> : author}
    {' · '}Published <time dateTime={date}>{format(date)}</time>
    {modified && modified !== date && <> · Updated <time dateTime={modified}>{format(modified)}</time></>}
  </p>;
}
