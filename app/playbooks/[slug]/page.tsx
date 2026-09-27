import Link from '@/components/AttributionLink';
import EditorialByline from '@/components/EditorialByline';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import NewsletterSignup from '@/components/NewsletterSignup';
import EmailPlaybookCTA from '@/components/EmailPlaybookCTA';
import { JsonLd, breadcrumbJsonLd, howToJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { getAllSlugs, getContent } from '@/lib/content';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return getAllSlugs('playbooks').filter((slug) => !getContent('playbooks', slug)?.meta.draft).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const pb = getContent('playbooks', slug);
  if (!pb || pb.meta.draft) return buildMetadata({ title: 'Not Found', noindex: true });
  return buildMetadata({
    title: pb.meta.title,
    description: pb.meta.description,
    path: `/playbooks/${slug}`,
    article: { published: pb.meta.date, modified: pb.meta.dateModified },
  });
}

export default async function PlaybookPage({ params }: { params: Params }) {
  const { slug } = await params;
  const pb = getContent('playbooks', slug);
  if (!pb || pb.meta.draft) notFound();

  return (
    <>
      <JsonLd
        data={[
          howToJsonLd({
            title: pb.meta.title,
            description: pb.meta.description,
            slug,
            date: pb.meta.date,
            dateModified: pb.meta.dateModified,
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Playbooks', url: '/playbooks' },
            { name: pb.meta.title, url: `/playbooks/${slug}` },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#f1ede4] text-[#0d0d0d] pb-20 overflow-x-clip">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
        <PopPageHero
          eyebrow={
            <>
              <Link href="/playbooks" className={pop.back}>
                &larr; All playbooks
              </Link>
              {pb.meta.tag && <span className={pop.pill}>{pb.meta.tag}</span>}
            </>
          }
          title={pb.meta.title}
          mascot={{ bubble: 'Run it yourself!' }}
        >
          <p className={pop.note}>
            <span className="font-mono">{pb.meta.readingTime}</span>
          </p>
          <p>
            {pb.meta.description}
          </p>
          <EditorialByline author={pb.meta.author} date={pb.meta.date} modified={pb.meta.dateModified} />
        </PopPageHero>
        <div className="relative max-w-3xl mx-auto px-6 md:px-8 pt-6 md:pt-10">

          <div className="mdx-prose mdx-prose-pop">
            <MDXRemote
              source={pb.body}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          <EmailPlaybookCTA slug={slug} title={pb.meta.title} />
        </div>
      </article>

      <div className="px-6 md:px-8 pb-28">
        <NewsletterSignup
          headline="Get the next playbook in your inbox."
          subhead="One email per drop. No fluff. Subscribers get PDFs of every playbook."
        />
      </div>
    </>
  );
}
