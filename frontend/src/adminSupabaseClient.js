// Admin Supabase client — uses the service_role key for admin operations
// like creating/deleting users via supabase.auth.admin.*
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

let _adminClient = null;

/**
 * Returns the admin Supabase client (lazy-initialized).
 * Throws a descriptive error if the service role key is not configured.
 */
export function getAdminSupabase() {
  if (_adminClient) return _adminClient;

  if (!serviceRoleKey) {
    throw new Error(
      "REACT_APP_SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Please add it to frontend/.env and restart the dev server."
    );
  }

  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
