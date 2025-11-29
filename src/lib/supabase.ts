import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (typeof window === 'undefined') { // Only warn on server
        console.warn('Supabase credentials missing. Check .env.local');
    }
}

// Ensure this client is only used on the server
if (typeof window !== 'undefined') {
    throw new Error('Supabase client should not be used on the client side');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
