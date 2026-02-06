import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const eventType = payload.message?.type || payload.type;

    if (eventType !== 'end-of-call-report') {
      return res.status(200).json({ status: 'ignored', type: eventType });
    }

    const callData = payload.message || payload;
    const transcript = callData.transcript || callData.artifact?.transcript || '';
    const summary = callData.summary || callData.analysis?.summary || '';
    const duration = callData.endedAt && callData.startedAt
      ? Math.round((new Date(callData.endedAt) - new Date(callData.startedAt)) / 1000)
      : callData.duration || null;

    const structuredData = callData.analysis?.structuredData || {};

    const name = structuredData.name
      || extractFromTranscript(transcript, 'name')
      || 'Unknown Caller';
    const email = structuredData.email
      || extractFromTranscript(transcript, 'email')
      || null;
    const phone = structuredData.phone
      || callData.customer?.number
      || extractFromTranscript(transcript, 'phone')
      || null;
    const serviceInterest = structuredData.service_interest
      || extractServiceInterest(transcript, summary)
      || null;

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name,
        email,
        phone,
        service_interest: serviceInterest,
        summary: summary || null,
        transcript: typeof transcript === 'string' ? transcript : JSON.stringify(transcript),
        call_duration: duration,
        call_id: callData.callId || callData.call?.id || null,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    console.log('Lead saved:', data.id);
    return res.status(200).json({ status: 'success', leadId: data.id });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function extractFromTranscript(transcript, field) {
  if (!transcript) return null;
  const text = typeof transcript === 'string' ? transcript : JSON.stringify(transcript);

  if (field === 'email') {
    const match = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    return match ? match[0] : null;
  }
  if (field === 'phone') {
    const match = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return match ? match[0] : null;
  }
  if (field === 'name') {
    const match = text.match(/(?:my name is|i'm|this is|i am)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
    return match ? match[1] : null;
  }
  return null;
}

function extractServiceInterest(transcript, summary) {
  const text = ((typeof transcript === 'string' ? transcript : '') + ' ' + (summary || '')).toLowerCase();
  const interests = [];
  if (text.includes('voice') || text.includes('phone') || text.includes('call')) interests.push('Voice Agents');
  if (text.includes('automat') || text.includes('workflow') || text.includes('crm') || text.includes('pipeline')) interests.push('Business Automation');
  if (text.includes('website') || text.includes('web app') || text.includes('landing page') || text.includes('application') || text.includes('app')) interests.push('Web/App Development');
  return interests.length > 0 ? interests.join(', ') : null;
}
