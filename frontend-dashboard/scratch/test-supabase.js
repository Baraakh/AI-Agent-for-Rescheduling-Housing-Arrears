import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: apps, error: err } = await supabase
      .from('applications')
      .select(`
        *,
        loan_details (*),
        documents (*),
        validation_results (*),
        recommendations (*),
        audit_logs (*)
      `)
      .order('submitted_at', { ascending: false });

    if (err) {
      console.error('Database query error:', err);
      return;
    }

    console.log('SUCCESS! Fetched apps:');
    for (const app of apps) {
      console.log(`- ID: ${app.application_id}, Status: ${app.status}`);
      console.log('  Documents:', app.documents);
      console.log('  Audit Logs:', app.audit_logs);
      console.log('  Validation:', app.validation_results);
    }
  } catch (e) {
    console.error('Script error:', e);
  }
}

run();
