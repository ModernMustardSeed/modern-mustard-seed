/**
 * A FINISHED AUDIT HAS TO REACH THE LEAD BY ITSELF.
 *
 * The audit route enqueues an `llm_jobs` row, waits ninety-five seconds, and if
 * the answer has not landed it tells Sarah the audit is queued and to try again
 * shortly. The drainer then finishes the job and writes a complete report into
 * `result_json`. Until #128 nothing ever read that row, and #128 only fixed the
 * half where she comes back and clicks inside fifteen minutes.
 *
 * The other half is the half that actually keeps happening. On 2026-08-26 the
 * workstation drainer was asleep with the laptop, so K-Ram Roofing's audit was
 * answered by the GitHub runner FORTY-SIX MINUTES after the click. A retry
 * window cannot catch that, and nobody is sitting there refreshing. The report
 * scored the site 68 and the lead read `audit_at = NEVER`.
 *
 * The root cause is one sentence long: `llm_jobs` cannot say who an answer is
 * for. `auditPreferringWorker` is handed `sourceTable` and `sourceId` and drops
 * both on the floor, because they belong to the older `audit_jobs` table and the
 * generic queue has no columns for them. The clean repair is those two columns.
 * This is the repair that needs no migration and, unlike a new column, also
 * rescues every answer that was already orphaned before it shipped.
 *
 * Idempotent by construction, so the drainers can call it as often as they like:
 * a report is only written when the lead has no audit at all, or an audit older
 * than this one.
 */

/** How far back to look. A fortnight matches `prune_llm_jobs()`. */
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

/** Ceiling on one pass, so a busy queue cannot turn this into a table scan. */
const SCAN_LIMIT = 200;

/** `audit example.com` -> `example.com`. Anything else is not ours. */
function hostFromLabel(label) {
  const m = /^audit\s+(\S+)$/.exec(String(label || '').trim());
  // Normalised the same way a lead's website is, so `www.` on one side and not
  // the other cannot silently strand a report.
  return m ? m[1].toLowerCase().replace(/^www\./, '') : null;
}

/** The hostname a lead's website actually resolves to, `www.` folded away. */
function hostOfWebsite(website) {
  if (!website) return null;
  try {
    const raw = String(website).trim();
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * File every finished website audit onto the lead it was run for.
 *
 * Returns what it delivered, so a caller can log it. Never throws: a delivery
 * pass that takes the drainer down would cost far more than the reports it
 * saves.
 */
export async function deliverFinishedAudits(sb, log = () => {}) {
  const delivered = [];
  try {
    const { data: jobs, error } = await sb
      .from('llm_jobs')
      .select('id, label, result_json, finished_at')
      .eq('status', 'done')
      .like('label', 'audit %')
      .gte('finished_at', new Date(Date.now() - LOOKBACK_MS).toISOString())
      .order('finished_at', { ascending: false })
      .limit(SCAN_LIMIT);
    if (error) { log('audit delivery: could not read the queue (ignored):', error.message); return delivered; }

    // Newest answer per host wins. An older one for the same site has nothing
    // to add and would only churn the row.
    const newest = new Map();
    for (const job of jobs || []) {
      const host = hostFromLabel(job.label);
      if (!host || !job.result_json || typeof job.result_json.overall_score !== 'number') continue;
      if (!newest.has(host)) newest.set(host, job);
    }

    for (const [host, job] of newest) {
      // `ilike` narrows in the database; the hostname compare below is what
      // actually decides, because '%kramroofing.com%' also matches a lead whose
      // site is notkramroofing.com.
      const { data: candidates } = await sb
        .from('outbound_leads')
        .select('id, business_name, website, audit_at')
        .ilike('website', `%${host}%`)
        .limit(20);

      const matches = (candidates || []).filter((l) => hostOfWebsite(l.website) === host);
      if (matches.length !== 1) {
        // Zero is normal: the public /website-audit page has no lead behind it.
        // More than one is a judgement call this pass must not make on its own.
        if (matches.length > 1) log(`audit delivery: ${host} matches ${matches.length} leads, left alone`);
        continue;
      }

      const lead = matches[0];
      // Never overwrite a grade that is already newer than this answer.
      if (lead.audit_at && new Date(lead.audit_at).getTime() >= new Date(job.finished_at).getTime()) continue;

      // Compare-and-swap on what we read, so a live request that wrote a fresher
      // grade mid-pass wins rather than being clobbered by this sweep. `.eq` can
      // never match a NULL in SQL, so an ungraded lead has to be matched with
      // `.is` or the delivery silently writes nothing at all, which is the exact
      // failure this file exists to end.
      let q = sb
        .from('outbound_leads')
        .update({
          audit_url: lead.website,
          audit_score: Math.round(job.result_json.overall_score),
          audit_json: job.result_json,
          audit_at: job.finished_at,
        })
        .eq('id', lead.id);
      q = lead.audit_at ? q.eq('audit_at', lead.audit_at) : q.is('audit_at', null);
      const { error: updErr } = await q;
      if (updErr) { log(`audit delivery: ${host} failed (ignored):`, updErr.message); continue; }

      delivered.push({ host, lead: lead.business_name, score: Math.round(job.result_json.overall_score) });
    }

    if (delivered.length) {
      log(`delivered ${delivered.length} finished audit(s):`, delivered.map((d) => `${d.lead} ${d.score}`).join(', '));
    }
  } catch (e) {
    log('audit delivery failed (ignored):', e?.message || e);
  }
  return delivered;
}
