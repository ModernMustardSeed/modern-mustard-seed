import FrontOfficeBoard from '@/components/admin/FrontOfficeBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Front Office', robots: { index: false, follow: false } };

export default function Page() {
  return <FrontOfficeBoard />;
}
