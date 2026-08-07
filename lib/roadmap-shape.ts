/**
 * The shape of a Hundredfold Roadmap, and nothing else.
 *
 * Split out from lib/scaling-roadmap.ts because the renderer and the client tool
 * need the types and the stage list, and that module statically imports the
 * Anthropic SDK and the Claude Code CLI shim. Importing it from a client
 * component would drag node:child_process into the browser bundle.
 *
 * lib/scaling-roadmap.ts re-exports everything here, so server callers can keep
 * importing from one place.
 */

/** The five rungs of the MMS growth ladder. Seed is pre-revenue, Orchard runs without the owner. */
export const STAGES = ['Seed', 'Sprout', 'Sapling', 'Tree', 'Orchard'] as const;
export type Stage = (typeof STAGES)[number];

/** Which of the six things is actually capping the business right now. */
export const CONSTRAINTS = ['leads', 'sales', 'delivery', 'cash', 'offer', 'owner'] as const;
export type ConstraintType = (typeof CONSTRAINTS)[number];

export type RoadmapReport = {
  business_name: string;
  one_liner: string;
  stage: Stage;
  scale_score: number;
  headline: string;
  verdict: string;
  constraint: {
    type: ConstraintType;
    title: string;
    evidence: string;
    cost_of_ignoring: string;
    first_move: string;
  };
  value_equation: { lever: string; score: number; note: string; fix: string }[];
  offer: {
    name: string;
    promise: string;
    price: string;
    price_logic: string;
    guarantee: string;
    urgency: string;
  };
  offer_stack: { item: string; value: string; why: string }[];
  offer_cuts: string[];
  money_model: {
    attraction: string;
    core: string;
    continuity: string;
    upsell: string;
    downsell: string;
    cash_rule: string;
    ltgp_cac: string;
  };
  lead_engine: {
    primary_channel: string;
    why: string;
    lead_magnet: string;
    weekly_volume: string;
  };
  channel_plays: { channel: string; play: string; hook: string; cadence: string }[];
  phases: {
    window: string;
    title: string;
    goal: string;
    moves: string[];
    metric: string;
    gate: string;
  }[];
  scoreboard: { metric: string; why: string; current: string; target: string }[];
  ai_leverage: { title: string; what: string; department: string }[];
  next_three: string[];
  angles: { title: string; argument: string }[];
};

/** Optional context the owner types in. Every field makes the roadmap sharper. */
export type RoadmapContext = {
  revenue?: string;
  team_size?: string;
  main_offer?: string;
  price_point?: string;
  biggest_headache?: string;
  goal?: string;
};
