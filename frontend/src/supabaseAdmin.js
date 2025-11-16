import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;

const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

let _admin;

export function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(url, serviceKey, {
    auth: {
      storage: noopStorage,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return _admin;
}