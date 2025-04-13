import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Ensure URL has https:// prefix
const formattedUrl = supabaseUrl.startsWith('https://') 
  ? supabaseUrl 
  : `https://${supabaseUrl}`;

console.log('Initializing Supabase client with URL:', formattedUrl);

export const supabase = createClient(formattedUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'polydan'
    }
  }
}); 