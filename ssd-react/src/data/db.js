import { supabase } from './supabase';

// Collection keys matching Supabase Tables
export const KEYS = {
    projects: 'projects',
    workers: 'workers',
    materials: 'materials',
    projectWorkers: 'projectWorkers',
    projectMaterials: 'projectMaterials',
    payments: 'payments',
    paymentHeaders: 'paymentHeaders',
    paymentLines: 'paymentLines',
    settlements: 'settlements',
    boqs: 'boqs',
    boqItems: 'boqItems',
    attendances: 'attendances',
    obligationHeaders: 'obligationHeaders',
    obligationLines: 'obligationLines',
    cashSettlements: 'cashSettlements',
    advanceApplications: 'advanceApplications',
    advances: 'advances',
    suppliers: 'suppliers',
    workerRates: 'workerRates',
    workRates: 'workRates',
    bankAccounts: 'bankAccounts',
};

// --- Supabase Async CRUD Functions ---

export async function getAll(table) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
        console.error(`Error fetching ${table}:`, error);
        return [];
    }
    return data || [];
}

export async function getById(table, id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) {
        if (error.code !== 'PGRST116') { // not found
            console.error(`Error fetching ${table} by id ${id}:`, error);
        }
        return null;
    }
    return data;
}

export async function create(table, item) {
    // Generate ISO timestamp here to match old behavior
    const newItem = {
        ...item,
        createdAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from(table).insert([newItem]).select().single();
    if (error) {
        console.error(`Error creating in ${table}:`, error);
        throw error;
    }
    return data;
}

export async function update(table, id, updates) {
    const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error(`Error updating ${table} with id ${id}:`, error);
        throw error;
    }
    return data;
}

export async function remove(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
        console.error(`Error deleting from ${table} with id ${id}:`, error);
        throw error;
    }
    return true;
}

// Emulates JS array filter. Use carefully, as it pulls the whole table first.
export async function query(table, filterFn) {
    const all = await getAll(table);
    return all.filter(filterFn);
}

// Warning: upsert using a custom match function is tricky with Supabase. 
// We recommend refactoring callers to use primary keys or unique constraints directly with Supabase upsert.
// For now, doing a read-then-write approach to mimic old behavior:
export async function customUpsert(table, matchFn, item) {
    const all = await getAll(table);
    const existing = all.find(matchFn);

    if (existing) {
        return update(table, existing.id, item);
    } else {
        return create(table, item);
    }
}

export function seedIfEmpty() {
    // Supabase handles database structure independently
}
