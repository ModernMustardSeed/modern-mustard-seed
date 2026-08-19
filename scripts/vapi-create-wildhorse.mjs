#!/usr/bin/env node
/**
 * Create Wild Horse Construction's front desk assistant on Vapi, and leave its
 * config in vapi/assistants/ where every other assistant lives.
 *
 * Run once:
 *   node scripts/vapi-create-wildhorse.mjs
 *
 * After that it is an ordinary config-as-code assistant: `--diff` sees it and
 * `--push wild-horse-concrete-front-desk` applies changes. This script exists only
 * because vapi-sync.mjs can PATCH an assistant and cannot POST a new one.
 *
 * Needs the PRIVATE VAPI_API_KEY and a VOICE_WEBHOOK_SECRET. The secret is sent
 * to Vapi and written NOWHERE on disk: the config file it leaves behind carries
 * server.url and no server.secret, exactly like the pulled configs, so it is
 * safe to commit.
 *
 * WHY NO TOOLS
 * Every tool is a live failure mode with a customer on the other end of a phone
 * call. Everything Cornerstone needs already comes back in the end-of-call
 * report, so the agent's only job is to have a good conversation and the report
 * does the filing. Tools get added once this loop has proven itself in
 * production, not before.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG = resolve(__dirname, '../vapi/assistants/wild-horse-concrete-front-desk.json');

function loadEnvFile(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const fileEnv = {
  ...loadEnvFile(resolve(__dirname, '../../modern-mustard-seed-voice-agent/.env')),
  ...loadEnvFile(resolve(__dirname, '../.env.local')),
};

// `vercel env pull` writes this literal for Sensitive vars. It is truthy, so it
// has to be filtered or it lands in an Authorization header as a baffling 401.
const PLACEHOLDER = '[SENSITIVE]';
const env = (k) => {
  const v = process.env[k] ?? fileEnv[k];
  return v === PLACEHOLDER ? undefined : v;
};

const VAPI_API_KEY = env('VAPI_API_KEY');
const WEBHOOK_SECRET = env('VOICE_WEBHOOK_SECRET');
const HOOK =
  env('CORNERSTONE_VOICE_HOOK') ??
  'https://cornerstone-psi.vercel.app/api/inbound/voice';

if (!VAPI_API_KEY) {
  console.error('\nNo usable VAPI_API_KEY. Needs the PRIVATE key, not the public one.\n');
  process.exit(1);
}
if (!WEBHOOK_SECRET) {
  console.error(
    '\nNo VOICE_WEBHOOK_SECRET.\n\n' +
      'Generate one, set it on the Cornerstone Vercel project, and pass the same\n' +
      'value here. Without it the agent can talk but nothing it hears reaches the\n' +
      'console, because /api/inbound/voice rejects an unsigned post.\n',
  );
  process.exit(1);
}

const SYSTEM = `You are the front desk for Wild Horse Construction and Concrete in Kalispell, Montana. Heath owns the company. You answer the phone when he cannot, which on a concrete crew is most of the working day.

WHO CALLS
Homeowners wanting a driveway, patio, garage slab or a walkway. General contractors looking for a concrete sub for flatwork, footings or foundations. People whose slab has cracked and who do not know whether it needs repair or replacement. Occasionally a supplier, or somebody selling something.

WHAT THE COMPANY DOES
Concrete flatwork, driveways, foundations and footings, shop and garage slabs including in-floor heat, stamped and decorative concrete, sidewalks and patios, retaining walls, excavation and site prep, and repair or replacement.

WHERE
Kalispell, Whitefish, Columbia Falls, Bigfork, Lakeside, Somers and Evergreen. If somebody is outside that, say honestly that it is probably outside the usual area, take their details anyway, and let Heath decide.

YOUR JOB ON EVERY CALL
Get these, in roughly this order, without making it feel like a form:
1. Their name.
2. The best number to call back on.
3. What they are looking at. Driveway, slab, patio, footings, repair.
4. Where the job is. Town at minimum.
5. Rough size if they know it. Square feet, or dimensions, or "about the size of a two car garage".
6. When they are hoping to have it done.
7. Whether they have drawings or a plan, if it sounds commercial.

If it is a repair, ask one more thing: is it cracked across the middle, lifting at a joint, or holding water. That answer tells Heath whether the base failed, and it is the difference between a patch and a tear-out.

If a general contractor calls, also ask what the schedule is and whether the site will be ready for concrete when they say. That question alone tells Heath more about the job than the square footage does.

HOW YOU TALK
Short sentences. Montana plain. You work here. You are not a receptionist reading a script and you are not chirpy. "Yep" and "sure" are fine. Never gush.

Let them talk. Homeowners and contractors both explain a job in their own order, and interrupting to collect field four is how you lose the call.

NEVER DO THESE
Never quote a price, a range, or "usually around". Concrete pricing turns on access, base, thickness, finish and the season, and a number invented on the phone becomes the number they expected. Say: "Heath prices these himself once he has seen the ground, and he does not charge for looking."

Never promise a date, a start week, or that the crew is free. Say you will put it in front of Heath and he will call back.

Never guess whether something is possible. If you do not know, say you do not know and that Heath will.

SPELLING AND NUMBERS
Read anything spelled back letter by letter at a measured pace with a word for each one: "b as in boy, r as in Robert". Never say letter sounds on their own. Read phone numbers back in groups of three, three and four, slowly, and confirm before moving on. A wrong callback number wastes the entire call.

IF IT IS URGENT
Concrete has real emergencies: a truck on the way with nowhere to put it, a pour going wrong, a form blowing out. If it sounds like that, say so plainly, get the number first, and tell them you are flagging it so Heath sees it ahead of everything else. Do not stay on the line trying to solve it.

IF THEY WANT HEATH DIRECTLY
Take the details and tell them Heath will call back, usually the same day. Do not put them on hold and do not pretend to transfer.

IF IT IS A SALES CALL
Polite and brief. "We are not looking, thanks." Then end it.

CLOSING
Read the number back, confirm what they want, tell them Heath will call. Then let them go. No closing speech.`;

const SUMMARY_PROMPT =
  'In three sentences or fewer, tell the owner what this caller wants, how urgent it is, and anything that decides whether it is worth his time. Write it the way a foreman leaves a note, not the way a call centre writes a ticket. If it was a sales call or a wrong number, say that in one line and stop.';

/* Everything Cornerstone stores comes out of here.
 *
 * The field names match what /api/inbound/voice reads, and it matches them
 * loosely, so near enough is fine. The route only persists four of them, so
 * `message` is deliberately instructed to be the whole write-up: a town or a
 * square footage that lives only in a field nobody reads is lost. */
const STRUCTURED_SCHEMA = {
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "The caller's name."
    },
    "phone": {
      "type": "string",
      "description": "Best callback number."
    },
    "email": {
      "type": "string",
      "description": "Only if they offered one."
    },
    "reason": {
      "type": "string",
      "description": "One line: what they want. Example: \"Replace a cracked driveway, about 900 sq ft, Whitefish.\" Start it with \"URGENT:\" only for a genuinely time-critical job, such as a concrete truck already rolling. For somebody selling something, write exactly \"Sales call, no action needed.\""
    },
    "message": {
      "type": "string",
      "description": "The full write-up, and the only field the owner reads in detail. Include, when the caller gave it: what the work is, the town and address, rough size or dimensions, when they want it done, whether they have drawings, and for a repair whether it is cracked across, lifting at a joint, or holding water. Write it in plain sentences, in their words where it helps. Do not invent anything they did not say."
    }
  }
};

const config = {
  // Vapi caps assistant names at 40 characters.
  name: 'Wild Horse Concrete Front Desk',
  firstMessage:
    'Wild Horse Construction and Concrete, this is the front desk. What can we do for you?',

  // Haiku on a phone call: fast enough that the pauses read as somebody
  // thinking rather than a machine loading.
  model: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    temperature: 0.4,
    messages: [{ role: 'system', content: SYSTEM }],
  },
  voice: { provider: 'vapi', voiceId: 'Elliot' },

  // English with keyterms rather than `multi`. Deepgram only boosts keyterms on
  // English, and getting "Bigfork" and "flatwork" right on a bad cell
  // connection from a job site is worth more here than Spanish detection.
  transcriber: {
    provider: 'deepgram',
    model: 'nova-3',
    language: 'en',
    numerals: true,
    keyterm: [
      'Kalispell',
      'Whitefish',
      'Columbia Falls',
      'Bigfork',
      'Lakeside',
      'Somers',
      'Evergreen',
      'Flathead',
      'Wild Horse Construction',
      'Heath',
      'flatwork',
      'footings',
      'rebar',
      'stamped concrete',
      'slab',
      'grade beam',
      'in-floor heat',
      'yards',
    ],
  },

  recordingEnabled: true,
  backgroundDenoisingEnabled: true,
  maxDurationSeconds: 900,
  silenceTimeoutSeconds: 45,
  endCallPhrases: ['goodbye', 'bye now', 'thanks, bye', 'have a good one'],

  // A caller pauses mid-sentence to go look at the thing they are describing.
  // Cutting them off there is how the call gets abandoned.
  startSpeakingPlan: { waitSeconds: 0.6 },
  stopSpeakingPlan: { numWords: 2, voiceSeconds: 0.3, backoffSeconds: 1.2 },

  /* Everything Cornerstone stores comes out of here.
   *
   * The field names match what /api/inbound/voice reads, and it matches them
   * loosely, so near enough is fine. The route only persists four of them, so
   * `message` is deliberately instructed to be the whole write-up: a town or a
   * square footage that lives only in a field nobody reads is lost. */
  analysisPlan: {
    /* Use the *Plan shapes, not the flat summaryPrompt / structuredDataPrompt /
     * structuredDataSchema keys Vapi still accepts. Those are stored verbatim
     * and then ignored: a create that sends them comes back with
     * summaryPlan.enabled false, so analysis.summary is empty on every call and
     * the console records "Call completed." forever. It fails silently, and only
     * against a real call, which is the worst way for it to fail. */
    summaryPlan: {
      enabled: true,
      // These are templates. Leave {{transcript}} out and the analysis model
      // gets the instruction and none of the call, then answers anyway.
      messages: [
        {
          role: 'system',
          content: `${SUMMARY_PROMPT}

Here is the transcript of the call:

{{transcript}}

`,
        },
        {
          role: 'user',
          content: 'The call ended for this reason: {{endedReason}}. Write the note.',
        },
      ],
    },
    structuredDataPlan: {
      enabled: true,
      messages: [
        {
          role: 'system',
          content:
            `Pull the caller out of this call. Leave a field empty rather than guessing at it.

Here is the transcript of the call:

{{transcript}}

`,
        },
        { role: 'user', content: 'Return the structured data as JSON matching the schema.' },
      ],
      schema: STRUCTURED_SCHEMA,
    },
    // Off deliberately. It is another model call per call, and it grades the
    // agent against a goal nobody set.
    successEvaluationPlan: { enabled: false },
  },

  // Only the end-of-call report. Status updates and transcript fragments arrive
  // on the same hook and would otherwise write a row per utterance.
  server: { url: HOOK },
  serverMessages: ['end-of-call-report'],

  metadata: {
    client: 'Wild Horse Construction & Concrete',
    city: 'Kalispell, MT',
    reportsInto: 'Cornerstone front desk',
  },
};

if (existsSync(CONFIG)) {
  const existing = JSON.parse(readFileSync(CONFIG, 'utf8'));
  if (existing.id) {
    console.error(
      `\nAlready created: ${existing.id}\n\n` +
        `This script only creates. To change the assistant, edit\n` +
        `vapi/assistants/wild-horse-concrete-front-desk.json and run:\n` +
        `  node scripts/vapi-sync.mjs --push wild-horse-concrete-front-desk\n`,
    );
    process.exit(1);
  }
}

// The secret goes to Vapi and never to disk.
const body = { ...config, server: { ...config.server, secret: WEBHOOK_SECRET } };

const res = await fetch('https://api.vapi.ai/assistant', {
  method: 'POST',
  headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const out = await res.json();

if (!res.ok) {
  // Vapi's validation errors name the offending path, which is the whole value
  // of printing them. No request body is echoed, so no secret can escape.
  console.error(`\nCreate failed: ${res.status}`);
  console.error(JSON.stringify(out?.message ?? out, null, 2).slice(0, 2000));
  process.exit(1);
}

writeFileSync(CONFIG, JSON.stringify({ id: out.id, ...config }, null, 2) + '\n', 'utf8');

console.log('\ncreated');
console.log(`  id       ${out.id}`);
console.log(`  name     ${out.name}`);
console.log(`  model    ${out.model?.model}`);
console.log(`  webhook  ${out.server?.url}`);
console.log(`  secret   ${out.isServerUrlSecretSet ? 'set' : 'NOT SET, calls will 401'}`);
console.log(`\n  config   vapi/assistants/wild-horse-concrete-front-desk.json (no secret in it)`);
console.log(`\nNext: record this id on his tenant so calls file to him rather than`);
console.log(`the fallback company:\n`);
console.log(
  `  update company_front set voice_agent_id = '${out.id}'\n` +
    `  where company_id = 'a1000000-0000-4000-8000-000000000001';\n`,
);
