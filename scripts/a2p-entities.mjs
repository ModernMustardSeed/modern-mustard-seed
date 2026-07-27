// Dumps every TrustHub end-user/supporting-document attached to the A2P bundles,
// so we can see exactly what business info (esp. website_url) is registered.
// Usage: node scripts/a2p-entities.mjs
import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd())

const SID = process.env.TWILIO_ACCOUNT_SID
const TOK = process.env.TWILIO_AUTH_TOKEN
const auth = 'Basic ' + Buffer.from(`${SID}:${TOK}`).toString('base64')

async function get(url) {
  const r = await fetch(url, { headers: { Authorization: auth } })
  const t = await r.text()
  try { return JSON.parse(t) } catch { return t }
}

const BUNDLES = [
  ['customer_profile', 'CustomerProfiles', 'BU2d26f673e772d95fbd3c04d113be25d9'],
  ['a2p_trust_product', 'TrustProducts', 'BU87173c6f50d08a7ba80adae4afbe6c5d'],
  ['secondary_trust_product', 'TrustProducts', 'BUbf90c813ca776cfa27b99b1ba46b90ff'],
]

for (const [label, kind, bu] of BUNDLES) {
  console.log(`\n===== ${label} ${bu} =====`)
  const assigns = await get(`https://trusthub.twilio.com/v1/${kind}/${bu}/EntityAssignments`)
  for (const a of assigns.results || []) {
    const obj = a.object_sid
    const src = obj.startsWith('IT')
      ? await get(`https://trusthub.twilio.com/v1/EndUsers/${obj}`)
      : await get(`https://trusthub.twilio.com/v1/SupportingDocuments/${obj}`)
    console.log(JSON.stringify(src, null, 2))
  }
}

// All end users on the account, in case something is unattached.
console.log('\n===== ALL END USERS =====')
console.log(JSON.stringify(await get('https://trusthub.twilio.com/v1/EndUsers?PageSize=50'), null, 2))
