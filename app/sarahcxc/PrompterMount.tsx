'use client';

import Prompter from '@/components/studio/Prompter';
import { CXC_STUDIO } from './studio';

/**
 * Client mount so the CXC studio config stays bundle-only and never gets
 * serialized through the server/client boundary. Same reasoning as the MMS
 * mount next door.
 */
export default function PrompterMount() {
  return <Prompter studio={CXC_STUDIO} />;
}
