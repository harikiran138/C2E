import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Validation to prevent "Invalid supabaseUrl" error during build time
  const isValidUrl = supabaseUrl.startsWith('http');

  if (!isValidUrl || !supabaseKey) {
    // Only log error on the client (browser), avoid cluttering build logs 
    // unless absolutely necessary.
    if (typeof window !== 'undefined') {
      console.warn('Supabase credentials missing or invalid. Using placeholders.');
    }
    
    // Return a client initialized with placeholders to prevent crashes during SSR/Prerendering
    return createBrowserClient(
      isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co',
      supabaseKey || 'placeholder-key'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
