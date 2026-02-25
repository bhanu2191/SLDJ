import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Fetching operators...");
    const { data, error } = await supabase.from('operators').select('id, name, email, role, status, lastActive, created_at');
    console.log('Data:', data);
    console.log('Error:', error);
}

test();
