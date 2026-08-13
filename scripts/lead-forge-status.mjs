#!/usr/bin/env node
/**
 * Was this lead's website forged?
 *
 * Read-only. Matches a name against outbound_leads (business_name and
 * contact_name), then reports the real forge state for each match: the
 * site_demo_status pointer on the lead, the outbound_demo_sites row behind it,
 * and the public demo URL if one exists.
 *
 * Zero dependencies. Talks to the Supabase REST API with fetch, so it runs
 * without npm install.
 *
 * Usage, from the repo root:
 *   node scripts/lead-forge-status.mjs "Coy Smith"
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
if (existsSync(path.join(root, ".env.local"))) {
  for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.supabase_url || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("No supabase url / service role key found in env or .env.local.");
  console.error("Run this from the repo root, with .env.local present.");
  process.exit(1);
}

const needle = process.argv.slice(2).join(" ").trim();
if (!needle) {
  console.error('Pass a name. Example: node scripts/lead-forge-status.mjs "Coy Smith"');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function rest(pathAndQuery) {
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${pathAndQuery}`, { headers });
  if (!res.ok) {
    console.error(`Supabase ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  return res.json();
}

// Match the whole phrase, and also each word, so "Coy Smith" still finds a
// lead filed as business "Smith Plumbing" with contact "Coy".
const terms = [needle, ...needle.split(/\s+/)].filter((t, i, a) => t && a.indexOf(t) === i);
const ors = terms.flatMap((t) => [`business_name.ilike.*${t}*`, `contact_name.ilike.*${t}*`]).join(",");

const leads = await rest(
  `outbound_leads?or=(${encodeURIComponent(ors)})&select=id,business_name,contact_name,trade,city,state,phone,email,status,site_demo_id,site_demo_url,site_demo_status,demo_url,created_at&order=created_at.desc&limit=25`
);

if (!leads.length) {
  console.log(`No lead in outbound_leads matches "${needle}".`);
  console.log("Nothing was forged for that name, because there is no such lead.");
  process.exit(0);
}

console.log(`${leads.length} matching lead(s) for "${needle}":\n`);

for (const l of leads) {
  const who = [l.business_name, l.contact_name ? `(${l.contact_name})` : null].filter(Boolean).join(" ");
  const where = [l.city, l.state].filter(Boolean).join(", ");
  console.log("=".repeat(70));
  console.log(`${who}${where ? `  ${where}` : ""}${l.trade ? `  ${l.trade}` : ""}`);
  console.log(`  lead id      ${l.id}`);
  console.log(`  lead status  ${l.status ?? "n/a"}`);
  console.log(`  created      ${l.created_at}`);

  const status = l.site_demo_status;
  if (!status) {
    console.log("  WEBSITE      NOT FORGED. No site_demo_status on the lead.");
  } else {
    const verdict =
      status === "ready" ? "FORGED, live" :
      status === "failed" ? "FORGE FAILED" :
      status === "building" ? "FORGING now" :
      status === "queued" ? "QUEUED, not built yet" : status;
    console.log(`  WEBSITE      ${verdict}  (site_demo_status=${status})`);
    if (l.site_demo_url) console.log(`  site url     ${l.site_demo_url}`);
  }
  console.log(`  voice demo   ${l.demo_url ?? "none"}`);

  if (l.site_demo_id) {
    const [row] = await rest(
      `outbound_demo_sites?id=eq.${l.site_demo_id}&select=id,status,worker,error,claimed_at,built_at,created_at,updated_at,html`
    );
    if (!row) {
      console.log(`  forge row    MISSING. Lead points at ${l.site_demo_id} but no outbound_demo_sites row exists.`);
    } else {
      console.log(`  forge row    status=${row.status}  worker=${row.worker ?? "unclaimed"}`);
      console.log(`               queued ${row.created_at}`);
      console.log(`               claimed ${row.claimed_at ?? "never"}`);
      console.log(`               built   ${row.built_at ?? "never"}`);
      console.log(`               html    ${row.html ? `${row.html.length.toLocaleString()} chars` : "empty"}`);
      if (row.error) console.log(`               error   ${row.error}`);
    }
  }

  // Catch orphans: rows forged against this lead that the pointer lost track of.
  const all = await rest(
    `outbound_demo_sites?lead_id=eq.${l.id}&select=id,status,built_at,created_at&order=created_at.desc`
  );
  if (all.length > 1 || (all.length === 1 && all[0].id !== l.site_demo_id)) {
    console.log(`  all forge runs for this lead (${all.length}):`);
    for (const r of all) {
      const flag = r.id === l.site_demo_id ? " <- current pointer" : "";
      console.log(`               ${r.created_at}  ${r.status}  ${r.id}${flag}`);
    }
  }
  console.log("");
}
