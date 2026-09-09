/**
 * DAILY POSTING. Their words, our edit, one version per platform, at the hour
 * each feed rewards. Nothing posts that the client did not write.
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

/**
 * The hour (Mountain) each feed tends to reward, used when a client has not
 * set their own. Instagram and X later in the morning when people are on
 * their phones; LinkedIn early on a workday; Facebook and Google at the
 * business's own hour.
 */
export const DEFAULT_PLATFORM_HOURS: Record<Platform, number> = {
  facebook: 9,
  instagram: 11,
  linkedin: 8,
  x: 12,
  gbp: 9,
  houzz: 9,
};

export type Captions = Partial<Record<Platform, string>>;
export type Notes = Partial<Record<Platform, string>>;

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

export type PlatformStats = { reach?: number; likes?: number; comments?: number; shares?: number; saves?: number; clicks?: number; at: string };

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
  notes: Notes | null;
  platforms: Platform[] | null;
  link: string | null;
  source: 'material' | 'evergreen' | 'manual';
  evergreen_key: string | null;
  status: PostStatus;
  results: Partial<Record<Platform, PostResult>> & { note?: string };
  stats: Partial<Record<Platform, PlatformStats>> | null;
  stats_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  llm_job_id: string | null;
  written_by: string | null;
  edited_by: string | null;
  sheet_sent_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * A submission: what the client wants to say, in their words, with any photo
 * or graphic they have, the platforms they want it on, and a link if there
 * is one. `kind` 'post' is the only kind the planner turns into a day.
 */
export type MaterialRow = {
  id: string;
  client_email: string;
  url: string | null;
  kind: 'post' | 'photo' | 'brand';
  text: string | null;
  platforms: Platform[] | null;
  link: string | null;
  wants_graphic: boolean;
  graphic_brief: string | null;
  graphic_done_at: string | null;
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
  platform_hours: Partial<Record<Platform, number>>;
  auto_publish: boolean;
  approve_first: boolean;
  visible: boolean;
  weekly_summary: boolean;
  notify_emails: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

/** The hour a platform posts for this client: their own setting, else the feed's default. */
export function hourFor(s: SettingsRow, p: Platform): number {
  const h = s.platform_hours?.[p];
  return typeof h === 'number' && h >= 0 && h <= 23 ? h : DEFAULT_PLATFORM_HOURS[p];
}

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
