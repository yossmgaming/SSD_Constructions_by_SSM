import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const requiredTables = [
    'projects',
    'workers',
    'materials',
    'projectWorkers',
    'projectMaterials',
    'payments',
    'paymentHeaders',
    'paymentLines',
    'settlements',
    'boqs',
    'boqItems',
    'attendances',
    'obligationHeaders',
    'obligationLines',
    'cashSettlements',
    'advanceApplications',
    'advances',
    'suppliers',
    'workerRates',
    'workRates',
    'bankAccounts'
];

async function initializeDatabase() {
    console.log('Checking database tables...');

    for (const table of requiredTables) {
        // We will try to insert a dummy row to test table schemas, or just a select
        const { data, error } = await supabase.from(table).select('id').limit(1);

        if (error) {
            console.log(`❌ Table issue with '${table}':`, error.message);
        } else {
            console.log(`✅ Table '${table}' exists and is accessible.`);
        }
    }
}

initializeDatabase();
