import { createClient } from '@supabase/supabase-js';

// Ensure we have the full URL with https://
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL?.startsWith('https://')
  ? process.env.REACT_APP_SUPABASE_URL
  : `https://${process.env.REACT_APP_SUPABASE_URL}`;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    anonKey: supabaseAnonKey ? 'Set' : 'Missing'
  });
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);

// Initialize with additional options for better error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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