import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

try {
  const { data: members, error } = await supabase
    .from('members')
    .select('id, name')
    .order('id');

  if (error) throw error;

  console.log('Supabase connection: OK');
  console.log(`Members table: ${members.length} row(s)`);
  console.log(`Members: ${members.map((member) => member.name).join(', ') || '(none)'}`);
} catch (error) {
  console.error('Supabase connection failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
