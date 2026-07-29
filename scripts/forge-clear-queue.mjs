#!/usr/bin/env node
/**
 * Take everything off the forge queue so Sarah can pick the leads she wants.
 *
 * Safe because the cockpit's "Forge website" button INSERTS a fresh row every
 * time, so removing a queued row costs nothing but the wait. A build already in
 * flight is never touched.
 *
 * Two things this is careful about:
 *  1. It snapshots every row and every lead pointer it is about to change, so the
 *     whole operation can be undone.
 *  2. Queueing a rebuild overwrites the lead's site_demo_id with the NEW row. If
 *     that lead already had a WORKING demo, naively clearing the pointer would
 *     throw away a live link. So each lead is pointed back at its most recent
 *     ready build where one exists, and only cleared when there is none.
 *
 *   node scripts/forge-clear-queue.mjs           # dry run, shows what it would do
 *   node scripts/forge-clear-queue.mjs --apply   # do it
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const supabase = createClient(
  process.env.supabase_url || process.env.SUPABASE_URL,
  process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: queued, error } = await supabase
  .from("outbound_demo_sites")
  .select("*")
  .eq("status", "queued")
  .order("created_at", { ascending: false });

if (error) {
  console.error("could not read the queue:", error.message);
  process.exit(1);
}
if (!queued.length) {
  console.log("Queue is already empty. Nothing to do.");
  process.exit(0);
}

const leadIds = [...new Set(queued.map((r) => r.lead_id).filter(Boolean))];
const { data: leads } = await supabase
  .from("outbound_leads")
  .select("id,business_name,site_demo_id,site_demo_url,site_demo_status")
  .in("id", leadIds.length ? leadIds : ["none"]);

// Where a lead already has a finished build, send its pointer back there rather
// than blanking a link that works.
const { data: readyRows } = await supabase
  .from("outbound_demo_sites")
  .select("id,lead_id,updated_at")
  .eq("status", "ready")
  .in("lead_id", leadIds.length ? leadIds : ["none"])
  .order("updated_at", { ascending: false });

const newestReadyFor = new Map();
for (const r of readyRows ?? []) if (!newestReadyFor.has(r.lead_id)) newestReadyFor.set(r.lead_id, r);

console.log(`${queued.length} queued build(s) to remove:\n`);
const plan = [];
for (const row of queued) {
  const lead = (leads ?? []).find((l) => l.id === row.lead_id);
  const fallback = newestReadyFor.get(row.lead_id);
  const restores = Boolean(fallback);
  plan.push({ row, lead, fallback });
  console.log(
    `  ${(row.business_name || "?").slice(0, 30).padEnd(30)} ${restores ? "-> restore its earlier finished demo" : "-> clear (no earlier demo)"}`,
  );
}

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to do it.");
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.join(process.cwd(), ".forge-backups");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const backup = path.join(dir, `queue-${stamp}.json`);
writeFileSync(backup, JSON.stringify({ queued, leads, takenAt: new Date().toISOString() }, null, 2));
console.log(`\nsnapshot written to ${backup}`);

let cleared = 0;
let restored = 0;
for (const { row, fallback } of plan) {
  const { error: delErr } = await supabase.from("outbound_demo_sites").delete().eq("id", row.id).eq("status", "queued");
  if (delErr) {
    console.log(`  could not remove ${row.business_name}: ${delErr.message}`);
    continue;
  }
  cleared += 1;

  if (!row.lead_id) continue;
  const patch = fallback
    ? { site_demo_id: fallback.id, site_demo_url: `https://modernmustardseed.com/demo/site/${fallback.id}`, site_demo_status: "ready" }
    : { site_demo_id: null, site_demo_url: null, site_demo_status: null };
  if (fallback) restored += 1;
  await supabase.from("outbound_leads").update(patch).eq("id", row.lead_id);
}

console.log(`\nremoved ${cleared} queued build(s). ${restored} lead(s) pointed back at an earlier finished demo.`);
console.log("Forge any lead again from the cockpit whenever you want; it queues a fresh build.");
console.log(`To undo, the snapshot at ${backup} holds every removed row and every lead pointer.`);
