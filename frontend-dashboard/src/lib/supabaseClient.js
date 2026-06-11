// ============================================================================
// src/lib/supabaseClient.js
// ----------------------------------------------------------------------------
// Single shared Supabase client used by BOTH frontends:
//   • the Applicant service frontend (inserts applications, uploads documents)
//   • the Employee dashboard frontend (reads + updates applications)
//
// Both frontends point at the SAME Supabase project/database — that is what
// makes "submit on one side → appears live on the other side" work.
//
// SECURITY — READ THIS:
//   • Only ever use the ANON / PUBLIC key here. It is safe to ship in a
//     browser bundle because every request it makes is still filtered by
//     your Row Level Security (RLS) policies (see supabase/schema.sql).
//   • NEVER import, paste, or reference the SERVICE ROLE key in any frontend
//     file. The service role key bypasses RLS entirely — if it ends up in a
//     browser bundle, anyone can read/write/delete your whole database.
//     Service-role-key usage belongs ONLY in a trusted server environment
//     (which this project intentionally does not use).
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in development so a missing .env.local is obvious immediately,
  // instead of surfacing as a confusing "Failed to fetch" deep in the app.
  // eslint-disable-next-line no-console
  console.error(
    '[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Create a .env.local file in your project root — see docs/SUPABASE_INTEGRATION_GUIDE.md.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // This demo does not use Supabase Auth (no applicant/employee login),
    // so we keep the client lightweight and avoid persisting auth sessions.
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Name of the Storage bucket that holds applicant-uploaded documents.
// Create this bucket once in Supabase Dashboard → Storage (see docs).
export const DOCUMENTS_BUCKET = 'application-documents';

export default supabase;
