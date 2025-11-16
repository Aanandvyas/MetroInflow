import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY;

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

let _supabase;

export function getSupabase() {
  if (_supabase) return _supabase;
  const isBrowser = typeof window !== 'undefined';
  _supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: {
      storage: isBrowser ? window.localStorage : noopStorage,
      autoRefreshToken: isBrowser,
      persistSession: isBrowser,
      detectSessionInUrl: isBrowser,
    },
  });
  return _supabase;
}