/* Seeds (or removes) the fictional demo client used to record the
   client-experience video, and mints a 20-minute portal magic link.

   Usage:
     node scripts/launch-video/seed-demo.mjs            # seed + print magic link
     node scripts/launch-video/seed-demo.mjs --cleanup  # remove all demo rows

   Reads .env.video (vercel env pull .env.video --environment=production).
   The demo client is entirely fictional: Avery Brooks / Harbor & Pine Outfitters.
*/
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.video"), "utf8")
    .split("\n")
    .map((l) => l.match(/^([^#=\s]+)="?([^"]*)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);

const SUPABASE_URL = env.supabase_url || env.SUPABASE_URL;
const SERVICE_KEY = env.supabase_service_role_key || env.SUPABASE_SERVICE_ROLE_KEY;
const SECRET = env.CLIENT_SESSION_SECRET || env.ADMIN_SESSION_SECRET;
if (!SUPABASE_URL || !SERVICE_KEY || !SECRET) throw new Error("missing env (.env.video)");

const db = createClient(SUPABASE_URL, SERVICE_KEY);
const EMAIL = "demo.client@modernmustardseed.com";

if (process.argv.includes("--cleanup")) {
  for (const [table, col] of [
    ["client_files", "client_email"],
    ["projects", "client_email"],
    ["proposals", "client_email"],
    ["clients", "email"],
  ]) {
    const { error } = await db.from(table).delete().eq(col, EMAIL);
    console.log(`✓ ${table} cleared${error ? ` (${error.message})` : ""}`);
  }
  process.exit(0);
}

/* ---- seed ---- */
const fail = (label, error) => { if (error) throw new Error(`${label}: ${error.message}`); };

fail("clients", (await db.from("clients").upsert({
  email: EMAIL,
  name: "Avery Brooks",
  company: "Harbor & Pine Outfitters",
  tier: "engagement",
  status: "active",
  welcome_note: "Avery, the storefront is ahead of schedule and the booking engine demo is in your files. See you Thursday.",
}, { onConflict: "email" })).error);

await db.from("projects").delete().eq("client_email", EMAIL);
fail("projects", (await db.from("projects").insert({
  client_email: EMAIL,
  name: "Harbor & Pine: Storefront + Booking Engine",
  status: "building",
  summary: "A custom ecommerce storefront with guided-trip booking, deposits, and an AI concierge that answers gear questions around the clock.",
  progress: 72,
  milestones: [
    { title: "Discovery and kickoff", detail: "Scope locked, brand board approved", done: true },
    { title: "Design direction approved", detail: "Lakeside lodge system, signed off", done: true, due: "Jun 3" },
    { title: "Storefront build and bookings", detail: "Catalog live on staging, booking flow in test", done: false, due: "Jun 24" },
    { title: "Launch", detail: "DNS cutover + announcement kit", done: false, due: "Jul 1" },
  ],
  launch_target: "2026-07-01",
})).error);

await db.from("proposals").delete().eq("client_email", EMAIL);
fail("proposals", (await db.from("proposals").insert({
  client_name: "Avery Brooks",
  client_company: "Harbor & Pine Outfitters",
  client_email: EMAIL,
  status: "accepted",
  signed_at: new Date().toISOString(),
  signed_name: "Avery Brooks",
  one_time_total: 14500,
  monthly_total: 0,
  deposit_amount: 7250,
  deposit_status: "paid",
  deposit_paid_at: new Date().toISOString(),
  balance_status: "unpaid",
  subscription_status: "none",
})).error);

await db.from("client_files").delete().eq("client_email", EMAIL);
fail("client_files", (await db.from("client_files").insert([
  { client_email: EMAIL, label: "Staging site (live preview)", url: "https://staging.example.com", kind: "site" },
  { client_email: EMAIL, label: "GitHub repository", url: "https://github.com/ModernMustardSeed", kind: "repo" },
  { client_email: EMAIL, label: "Brand board", url: "https://staging.example.com/brand", kind: "design" },
  { client_email: EMAIL, label: "Owner's manual (draft)", url: "https://staging.example.com/manual", kind: "doc" },
])).error);

/* ---- mint the magic link (mirrors lib/client-auth.ts exactly) ---- */
const b64url = (s) => Buffer.from(s).toString("base64url");
const payload = `magic:${EMAIL}:${Date.now() + 20 * 60 * 1000}`;
const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
const token = `${b64url(payload)}.${sig}`;

console.log("✓ Demo client seeded: Avery Brooks / Harbor & Pine Outfitters");
console.log(`\nMAGIC_LINK=https://modernmustardseed.com/api/portal/verify?token=${token}`);
