// Reports the live Twilio A2P 10DLC state: brand, campaign, customer profile, end users.
// Usage: node scripts/a2p-status.mjs
import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd())

const SID = process.env.TWILIO_ACCOUNT_SID
const TOK = process.env.TWILIO_AUTH_TOKEN
const MG = process.env.TWILIO_MESSAGING_SERVICE_SID
const auth = 'Basic ' + Buffer.from(`${SID}:${TOK}`).toString('base64')

async function get(url) {
  const r = await fetch(url, { headers: { Authorization: auth } })
  const t = await r.text()
  let j
  try { j = JSON.parse(t) } catch { j = t }
  return { status: r.status, body: j }
}

const out = {}
out.brands = await get('https://messaging.twilio.com/v1/a2p/BrandRegistrations')
out.campaigns_on_service = await get(`https://messaging.twilio.com/v1/Services/${MG}/Compliance/Usa2p`)
out.customer_profiles = await get('https://trusthub.twilio.com/v1/CustomerProfiles')
out.trust_products = await get('https://trusthub.twilio.com/v1/TrustProducts')

console.log(JSON.stringify(out, null, 2))
