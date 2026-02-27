import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jzqnwspmhdysimayxuty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cBA_p9hx5rzAMX9aYnLm9w_XYlHAh94';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
