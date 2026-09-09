import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,'')];}));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.from('client_products').select('*').eq('client_email','builtbyshan@gmail.com');
console.log(JSON.stringify(data, null, 1));
const { data: cu } = await sb.from('client_updates').select('id,author_name,body,created_at').eq('project_id','a217eb20-6a24-403c-9045-cbfe0f7a9d97');
console.log('updates:', JSON.stringify(cu));
