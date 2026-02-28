import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://jzqnwspmhdysimayxuty.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cW53c3BtaGR5c2ltYXl4dXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Nzk3ODYsImV4cCI6MjA4NzM1NTc4Nn0.6dCJ8BaQCgUM0FWwGgUPHCPfvPeTJ6_ZtGFfFKBlJ-4';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
