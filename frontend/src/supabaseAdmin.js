import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;



// Check if environment variables are available
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for admin client');
  console.error('URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.error('Service Key:', supabaseServiceKey ? 'OK' : 'MISSING');
}

// Admin client with service role key for admin operations
let supabaseAdmin = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
  } else {
    console.error('Cannot create admin client: missing environment variables');
  }
} catch (error) {
  console.error('Error creating Supabase admin client:', error);
}

export { supabaseAdmin };