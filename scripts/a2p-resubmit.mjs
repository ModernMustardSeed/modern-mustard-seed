// Resubmits the EXISTING A2P campaign for vetting after the /sms opt-in page is live.
//
// Why an UPDATE and not a delete+recreate: recreating a campaign can incur a
// fresh vetting fee, and the campaign SID is referenced by the messaging
// service. POST to the campaign SID resubmits the same campaign (learned
// 2026-07-20).
//
// PRECONDITION: https://modernmustardseed.com/sms must be LIVE and must match
// the message_flow text below word for word. The campaign failed 3 times
// (errors 30882 TERMS_AND_CONDITIONS_URL + 30908 PRIVACY_POLICY_URL) because
// the flow described an opt-in form that the reviewer could not find on the
// page: /contact was rendering the tap-to-text fallback instead.
//
// Usage: node scripts/a2p-resubmit.mjs          (dry run, prints the payload)
//        node scripts/a2p-resubmit.mjs --submit (actually resubmits)
import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd())

const SID = process.env.TWILIO_ACCOUNT_SID
const TOK = process.env.TWILIO_AUTH_TOKEN
const MG = process.env.TWILIO_MESSAGING_SERVICE_SID
const CAMPAIGN = 'QE2c6890da8086d771620e9b13fadeba0b'
const OPT_IN_URL = 'https://modernmustardseed.com/sms'
const auth = 'Basic ' + Buffer.from(`${SID}:${TOK}`).toString('base64')

const messageFlow =
  `End users opt in on our website at ${OPT_IN_URL}, a page titled "The Text Line" that is publicly reachable ` +
  `with no login. On that page they enter their own mobile number in a form, tick an unchecked consent checkbox, and ` +
  `tap the button labelled "Text me back". The checkbox label reads: "By checking this box and tapping Text me back, ` +
  `I agree to receive text messages from Modern Mustard Seed at the mobile number I provided, including messages sent ` +
  `by an automated system. Consent is not a condition of any purchase. Message frequency varies. Message and data ` +
  `rates may apply. Reply STOP to opt out, HELP for help." That same label links directly to our privacy policy at ` +
  `https://modernmustardseed.com/privacy and our terms of service at https://modernmustardseed.com/terms. The page ` +
  `also displays, in full, who is texting them, what we send, how often, what it costs, how to stop, and that consent ` +
  `is not required to buy anything, plus the exact message samples below. We do not buy, rent, or sell phone numbers, ` +
  `and no mobile information is shared with third parties or affiliates for marketing or promotional purposes.`

const payload = {
  Description:
    'Modern Mustard Seed replies by text to people who entered their own mobile number and gave express written ' +
    'consent on our website opt-in page at ' + OPT_IN_URL + '. Conversational customer care and the demo link they ' +
    'requested. Privacy policy https://modernmustardseed.com/privacy and terms https://modernmustardseed.com/terms.',
  MessageFlow: messageFlow,
  MessageSamples: [
    'Hey Jordan! Sarah\'s team at Modern Mustard Seed here. You asked for a text from our site about: "missed calls are costing us jobs". What are you working on? Reply here and a human answers. Reply STOP to opt out.',
    'Thanks Jordan, here is the demo we built you: https://modernmustardseed.com/demos. Reply with questions, a human answers. Msg and data rates may apply. Reply STOP to opt out, HELP for help.',
  ],
  HasEmbeddedLinks: true,
  HasEmbeddedPhone: true,
  OptInMessage:
    'You asked for a text from Modern Mustard Seed. Reply here and a human answers. Reply STOP to opt out, HELP for help. Msg and data rates may apply.',
  OptOutMessage:
    'You have successfully been unsubscribed from Modern Mustard Seed. You will not receive any more messages from this number. Reply START to resubscribe.',
  HelpMessage:
    'Modern Mustard Seed: reply to this thread and a human answers, or email sarah@modernmustardseed.com. Reply STOP to unsubscribe. Msg&Data Rates May Apply.',
  OptInKeywords: ['START', 'YES', 'UNSTOP'],
  OptOutKeywords: ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE'],
  HelpKeywords: ['HELP', 'INFO'],
}

function encode(obj) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) v.forEach((item) => p.append(k, String(item)))
    else p.append(k, String(v))
  }
  return p
}

const url = `https://messaging.twilio.com/v1/Services/${MG}/Compliance/Usa2p/${CAMPAIGN}`

if (!process.argv.includes('--submit')) {
  console.log('DRY RUN. Payload that would be POSTed to:\n' + url + '\n')
  console.log(JSON.stringify(payload, null, 2))
  console.log('\nRe-run with --submit to resubmit the campaign for vetting.')
  process.exit(0)
}

// Verify the opt-in page is actually live before spending a vetting attempt.
const probe = await fetch(OPT_IN_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
const html = await probe.text()
const required = ['Text me back', 'Consent is not a condition', '/privacy', '/terms', 'Reply STOP']
const missing = required.filter((s) => !html.includes(s))
if (probe.status !== 200 || missing.length) {
  console.error(`ABORT: ${OPT_IN_URL} returned ${probe.status}; missing: ${missing.join(', ') || 'none'}`)
  console.error('Deploy the opt-in page before resubmitting. Each failed vetting is a wasted attempt.')
  process.exit(1)
}
console.log(`Opt-in page verified live (${probe.status}, all required copy present).`)

const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: encode(payload),
})
const text = await res.text()
console.log(`HTTP ${res.status}`)
try {
  const j = JSON.parse(text)
  console.log(JSON.stringify({ sid: j.sid, campaign_status: j.campaign_status, errors: j.errors }, null, 2))
} catch {
  console.log(text)
}
