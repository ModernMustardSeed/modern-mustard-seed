'use client';

import Prompter from '@/components/studio/Prompter';
import { BOOK_STUDIO } from './studio';

/**
 * Client mount so the studio config stays bundle-only and never gets serialized
 * through the server/client boundary. Same reasoning as the other two studios.
 */
export default function PrompterMount() {
  return <Prompter studio={BOOK_STUDIO} />;
}
