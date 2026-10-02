import { listAgencies, updateAgency, type Agency } from '@/lib/white-label/store';
import { mailApproved } from '@/lib/white-label/mail';
import { WL_PROGRAM } from '@/data/white-label';

/**
 * Approve an agency: mark it founding while seats remain, and send the
 * welcome with its portal, price sheet and demo. Shared by the desk's
 * approve button and the add-by-hand form.
 */
export async function approveAgency(id: string): Promise<Agency> {
  const all = await listAgencies();
  const seated = all.filter((x) => x.founding && (x.status === 'approved' || x.status === 'active')).length;
  const a = await updateAgency(id, {
    status: 'approved',
    approved_at: new Date().toISOString(),
    founding: seated < WL_PROGRAM.foundingAgencies,
  });
  await mailApproved(a);
  return a;
}
