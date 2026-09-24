import ClientDesks from '@/components/admin/ClientDesks';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Client Desks', robots: { index: false, follow: false } };

export default function Page() {
  return <ClientDesks />;
}
