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

// Ensure URL has https:// prefix and remove any trailing slashes
const formattedUrl = supabaseUrl
  .replace(/\/+$/, '') // Remove trailing slashes
  .replace(/^https?:\/\//, '') // Remove existing protocol
  .replace(/^/, 'https://'); // Add https:// prefix

console.log('Initializing Supabase client with URL:', formattedUrl);

// Test DNS resolution and connection
try {
  const url = new URL(formattedUrl);
  console.log('Supabase hostname:', url.hostname);
  
  // Test DNS resolution and connection
  (async () => {
    try {
      // Test DNS resolution
      const dnsTest = await fetch(`https://dns.google/resolve?name=${url.hostname}`);
      const dnsData = await dnsTest.json();
      console.log('DNS resolution test:', dnsData);
      
      // Test connection
      const connectionTest = await fetch(formattedUrl);
      console.log('Supabase connection test:', {
        status: connectionTest.status,
        statusText: connectionTest.statusText,
        headers: Object.fromEntries(connectionTest.headers.entries())
      });
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('Network error - please check your internet connection and DNS settings');
      } else {
        console.error('Error details:', error);
      }
    }
  })();
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