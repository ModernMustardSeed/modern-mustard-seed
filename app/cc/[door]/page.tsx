import { notFound } from 'next/navigation';
import Login from '@/components/cc/Login';
import { hasStudioPass } from '@/lib/client-auth';
import { allDoors, brandFor, doorOf, projectForDoor } from '@/lib/cc-access';
import { hydrateDesks } from '@/lib/client-desks';

export const dynamic = 'force-dynamic';

/**
 * A CLIENT'S OWN DOOR: modernmustardseed.com/cc/brim. The same sign-in as
 * /cc/login, wearing their name and mark, so the link they save is theirs.
 * Sarah's address works on every door and lands her in that client's view.
 */
export default async function CommandCenterDoorPage({ params }: { params: Promise<{ door: string }> }) {
  const { door } = await params;
  await hydrateDesks();
  const project = projectForDoor(door);
  if (!project) notFound();
  const brand = brandFor(project);
  const studio = (await hasStudioPass()) ? allDoors().map(({ door: d, business }) => ({ door: d, business })) : null;
  return <Login door={doorOf(project)} business={brand.business} logo={brand.logo} accent={brand.colors.accent} studioDoors={studio} />;
}
