'use client';

import Prompter from '@/components/studio/Prompter';
import { MMS_STUDIO } from './studio';

/**
 * Client mount so the studio config never crosses the server/client boundary.
 * Rendering <Prompter studio={MMS_STUDIO} /> straight from the server page would
 * serialize every script into the RSC payload AND ship them in the client
 * bundle, paying for the whole library twice. Importing the config from inside a
 * client component keeps it bundle-only, the way it was before the two studios
 * split apart.
 */
export default function PrompterMount() {
  return <Prompter studio={MMS_STUDIO} />;
}
