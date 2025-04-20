import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    anonKey: supabaseAnonKey ? 'Set' : 'Missing'
  });
  throw new Error('Missing Supabase configuration');
}

// Sanitize URL: trim, remove leading '@', ensure single https:// prefix
let formattedUrl = supabaseUrl.trim();
if (formattedUrl.startsWith('@')) {
  formattedUrl = formattedUrl.slice(1);
}

// Remove protocol if present and trailing slashes
formattedUrl = formattedUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

// Prepend https:// to create final URL
formattedUrl = `https://${formattedUrl}`;

console.log('Initializing Supabase client with URL:', formattedUrl);

// Test DNS resolution and connection
try {
  const url = new URL(formattedUrl);
  console.log('Supabase hostname:', url.hostname);
} catch (error) {
  console.error('Invalid Supabase URL:', error);
  throw new Error('Invalid Supabase URL format');
}

export const supabase = createClient(formattedUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'polydan-auth-token',
    storage: window.localStorage
  },
  global: {
    headers: {
      'x-application-name': 'polydan'
    }
  }
}); 