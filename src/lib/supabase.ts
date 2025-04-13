import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase configuration');
}

// Ensure URL has https:// prefix and remove any trailing slashes
const formattedUrl = supabaseUrl
  .replace(/\/+$/, '') // Remove trailing slashes
  .replace(/^https?:\/\//, '') // Remove existing protocol
  .replace(/^/, 'https://'); // Add https:// prefix

console.log('Initializing Supabase client with URL:', formattedUrl);

// Test DNS resolution
try {
  const url = new URL(formattedUrl);
  console.log('Supabase hostname:', url.hostname);
  
  // Test connection
  fetch(formattedUrl)
    .then(response => {
      console.log('Supabase connection test:', response.status);
    })
    .catch(error => {
      console.error('Supabase connection test failed:', error);
    });
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