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
    agreements: 'agreements',
    clients: 'clients',
    projectSubcontractors: 'project_subcontractors',
};

// --- Supabase Async CRUD Functions ---

export async function getAll(table, columns = '*') {
    const { data, error } = await supabase.from(table).select(columns);
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

// Efficient equality check using Supabase server-side filtering
export async function queryEq(table, column, value, select = '*') {
    const { data, error } = await supabase.from(table).select(select).eq(column, value);
    if (error) {
        console.error(`Error querying ${table} by ${column}=${value}:`, error);
        return [];
    }
    return data || [];
}

/**
 * Advanced server-side querying
 * @param {string} table 
 * @param {object} options { filters: { eq: {}, range: { column, from, to } }, orderBy: { column, ascending }, limit: number, select: string }
 */
export async function queryAdvanced(table, { filters = {}, orderBy = {}, limit = null, select = '*' } = {}) {
    let q = supabase.from(table).select(select);

    // Filtering
    if (filters.eq) {
        Object.entries(filters.eq).forEach(([col, val]) => {
            if (val !== undefined && val !== null) q = q.eq(col, val);
        });
    }

    // Range
    if (filters.range) {
        const { column, from, to } = filters.range;
        if (from) q = q.gte(column, from);
        if (to) q = q.lte(column, to);
    }

    // Ordering
    if (orderBy.column) {
        q = q.order(orderBy.column, { ascending: !!orderBy.ascending });
    }

    // Limiting
    if (limit) {
        q = q.limit(limit);
    }

    const { data, error } = await q;
    if (error) {
        console.error(`Error in queryAdvanced for ${table}:`, error);
        return [];
    }
    return data || [];
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
