/**
 * Send a client the delivery email, from the terminal.
 *
 * The admin panel is the normal way in. This exists because it is the thing
 * that works when a deploy is mid-flight, when she is on a call and cannot get
 * to a browser, and when the answer to "did it send" needs to be a message id
 * rather than a spinner.
 *
 * It prints exactly what is in the email BEFORE anything leaves, split into
 * what goes and what is held back, so a wrong link is caught here instead of
 * in a client's inbox. With no recipient it prints that list and sends
 * nothing, which is the safe way to check a card.
 *
 *   npx tsx scripts/send-delivery-email.mts                       # dry run
 *   npx tsx scripts/send-delivery-email.mts me@example.com --preview
 *   npx tsx scripts/send-delivery-email.mts him@example.com
 *
 * The client is the one whose card the links live on. Change CLIENT below, or
 * pass --client=<email>.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { buildDeliveryEmail, type DeliveryLink } from "../lib/delivery-email";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
) as Record<string, string>;

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const E =
  process.argv.find((a) => a.startsWith("--client="))?.slice(9) ??
  "heath@wildhorse.pending-email.invalid";

const { data: client } = await db.from("clients").select("name, company").ilike("email", E).maybeSingle();
const { data: files } = await db.from("client_files").select("label, url, kind").ilike("client_email", E).order("created_at");

const built = buildDeliveryEmail({
  firstName: String(client?.name ?? "").split(/\s+/)[0] ?? "",
  company: String(client?.company ?? "your business"),
  links: (files ?? []) as DeliveryLink[],
  preview: process.argv.includes("--preview"),
});

// What is actually in it, printed before anything leaves, so a wrong link is
// caught here rather than in a client's inbox.
const PRIVATE = /^(go-live|golive|runbook|call sheet|notes|internal|admin|sent:)/i;
console.log("IN THE EMAIL:");
for (const l of (files ?? []).filter((l) => !PRIVATE.test(l.label))) console.log("  -", l.label);
console.log("NOT IN IT:");
for (const l of (files ?? []).filter((l) => PRIVATE.test(l.label))) console.log("  x", l.label);

const TO = process.argv.slice(2).filter((a) => a.includes("@"));
if (!TO.length) { console.log("\nNo recipient given, nothing sent."); process.exit(0); }

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: "Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>",
    to: TO,
    subject: built.subject,
    html: built.html,
    text: built.text,
    reply_to: "sarah@modernmustardseed.com",
  }),
});
const out = await res.json();
console.log(res.ok ? `\nsent to ${TO.join(", ")}  id ${out.id}` : `\nFAILED ${res.status} ${JSON.stringify(out)}`);
