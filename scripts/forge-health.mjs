#!/usr/bin/env node
/**
 * Why has nothing new appeared in the cockpit?
 *
 * Read-only. Reports the real state of the forge queue so the answer comes from
 * the database rather than from a guess.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd());
if (existsSync(path.join(root, ".env.local"))) {
  for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.supabase_url || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("No supabase url / service role key found in env or .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("outbound_demo_sites")
  .select("id,status,business_name,kind,worker,claimed_at,created_at,updated_at,error")
  .order("created_at", { ascending: false })
  .limit(60);

if (error) {
  console.error("query failed:", error.message);
  process.exit(1);
}

const byStatus = {};
for (const r of data) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

const age = (iso) => (iso ? `${Math.round((Date.now() - new Date(iso).getTime()) / 60000)}m` : "never");

console.log("=== queue, last 60 rows ===");
console.log(byStatus);

console.log("\n=== 12 most recent ===");
for (const r of data.slice(0, 12)) {
  console.log(
    `${(r.status || "?").padEnd(9)} ${age(r.created_at).padStart(6)} old  upd ${age(r.updated_at).padStart(6)}  ${(r.business_name || "?").slice(0, 26).padEnd(26)} ${r.kind || ""}`,
  );
  if (r.error) console.log(`          ERROR: ${String(r.error).slice(0, 220).replace(/\s+/g, " ")}`);
}

const ready = data.filter((r) => r.status === "ready");
console.log("\n=== most recent READY (what the cockpit shows) ===");
console.log(ready.length ? `${ready[0].business_name}, ${age(ready[0].updated_at)} ago` : "NONE in the last 60 rows");

const failed = data.filter((r) => r.status === "failed");
if (failed.length) {
  console.log(`\n=== ${failed.length} failed. Distinct errors: ===`);
  const seen = new Set();
  for (const f of failed) {
    const sig = String(f.error || "").slice(0, 120).replace(/\s+/g, " ");
    if (seen.has(sig)) continue;
    seen.add(sig);
    console.log(` x${failed.filter((o) => String(o.error || "").startsWith(sig.slice(0, 60))).length}  ${sig}`);
  }
}

const stuck = data.filter((r) => r.status === "building");
if (stuck.length) {
  console.log(`\n=== ${stuck.length} stuck in BUILDING ===`);
  for (const s of stuck) console.log(`  ${s.business_name} claimed ${age(s.claimed_at)} ago by ${s.worker || "?"}`);
}
