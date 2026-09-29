import Login from '@/components/cc/Login';
import { hasStudioPass } from '@/lib/client-auth';
import { allDoors } from '@/lib/cc-access';
import { hydrateDesks } from '@/lib/client-desks';

export const dynamic = 'force-dynamic';

export default async function CommandCenterLoginPage() {
  // A live studio pass skips the form and picks a client.
  let studio: Array<{ door: string; business: string }> | null = null;
  if (await hasStudioPass()) {
    await hydrateDesks();
    studio = allDoors().map(({ door, business }) => ({ door, business }));
  }
  return <Login studioDoors={studio} />;
}
