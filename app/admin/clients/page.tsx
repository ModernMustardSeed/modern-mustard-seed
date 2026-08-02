import type { Metadata } from 'next';
import AdminHeader from '@/components/admin/AdminHeader';
import ClientsHub from '@/components/admin/ClientsHub';

export const metadata: Metadata = { title: 'Client Book', robots: { index: false, follow: false } };

export default function AdminClientsPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="clients" title="Client Book" />
      <ClientsHub />
    </div>
  );
}
