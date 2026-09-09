/**
 * DAILY POSTING. One post a day, on every platform the client has connected,
 * from the photos and lines they drop in their portal. When the portal is
 * empty the evergreen bank fills the day, so the feed never goes quiet.
 */
export const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'x', 'gbp', 'houzz'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Platforms we can post to by API once an account is connected. The rest go on the hand-post sheet. */
export const API_PLATFORMS: Platform[] = ['facebook', 'instagram', 'x', 'linkedin', 'gbp'];

export const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  gbp: 'Google Business Profile',
  houzz: 'Houzz',
};

export type Captions = Partial<Record<Platform, string>>;

export type PostResult = {
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
  at: string;
  /** Posted by a person from the hand-post sheet, not by API. */
  manual?: boolean;
  /** Waiting for a person: no API connection for this platform. */
  pending?: boolean;
};

export type PostStatus = 'writing' | 'scheduled' | 'held' | 'publishing' | 'published' | 'partial' | 'failed' | 'skipped';

export type PostRow = {
  id: string;
  client_email: string;
  scheduled_for: string;
  publish_at: string;
  material_id: string | null;
  image_url: string | null;
  headline: string | null;
  captions: Captions;
  source: 'material' | 'evergreen' | 'manual';
  evergreen_key: string | null;
  status: PostStatus;
  results: Partial<Record<Platform, PostResult>>;
  llm_job_id: string | null;
  written_by: string | null;
  edited_by: string | null;
  sheet_sent_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MaterialRow = {
  id: string;
  client_email: string;
  url: string;
  kind: 'photo' | 'brand';
  note: string | null;
  uploaded_by: string | null;
  status: 'fresh' | 'used' | 'archived';
  used_count: number;
  last_used_on: string | null;
  created_at: string;
};

export type SettingsRow = {
  client_email: string;
  business_name: string;
  site_url: string | null;
  phone: string | null;
  towns: string[];
  services: string[];
  facts: string | null;
  tone: string | null;
  hard_nos: string | null;
  platforms: Platform[];
  post_hour_mt: number;
  auto_publish: boolean;
  weekly_summary: boolean;
  notify_emails: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountView = {
  provider: Platform;
  connected: boolean;
  status: 'connected' | 'revoked' | 'error' | 'none';
  accountName: string | null;
  externalId: string | null;
  error: string | null;
  /** True when the platform has no API path and is always hand-posted. */
  manualOnly: boolean;
  /** What is missing before it can connect, in words a person can act on. */
  needs: string | null;
};
