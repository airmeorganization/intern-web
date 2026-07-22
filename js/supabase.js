import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jdaeivcfxppeocjplcxy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWVpdmNmeHBwZW9janBsY3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2OTI2ODUsImV4cCI6MjEwMDI2ODY4NX0.xPMXV9qG0y3v4fD1VrkLrpcSvzN5Y467Mne04tFJe3k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'intern_auth_token',
    storage: window.localStorage,
    autoRefreshToken: true
  }
});
