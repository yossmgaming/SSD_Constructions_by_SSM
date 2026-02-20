import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing connection to:', supabaseUrl);

    // Try to select from projects
    const { data: selectData, error: selectError } = await supabase.from('projects').select('*').limit(1);

    if (selectError) {
        console.error('Select Error:', selectError);
    } else {
        console.log('Select successful. Data:', selectData);
    }

    // Try to insert into projects
    const testProject = { name: 'Test Connection Project', status: 'Active' };
    const { data: insertData, error: insertError } = await supabase.from('projects').insert([testProject]).select();

    if (insertError) {
        console.error('Insert Error:', insertError);
    } else {
        console.log('Insert successful. Data:', insertData);

        // Clean up
        if (insertData && insertData[0]) {
            const { error: deleteError } = await supabase.from('projects').delete().eq('id', insertData[0].id);
            if (deleteError) console.error('Cleanup Error:', deleteError);
            else console.log('Cleanup successful.');
        }
    }
}

testConnection();
