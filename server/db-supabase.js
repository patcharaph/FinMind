/**
 * FinMind Database Layer - Supabase (PostgreSQL)
 * Replaces SQLite with Supabase for production use
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service_role key for backend

if (!supabaseUrl || !supabaseKey) {
    console.warn('[db] SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Database operations will fail.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
    auth: { persistSession: false }
});

// --- User Management (device_id based) ---

const getOrCreateUser = async (device_id) => {
    if (!device_id) throw new Error('device_id is required');

    // Try to find existing user
    const { data: existing, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', device_id)
        .single();

    if (existing) return existing;

    // Create new user if not found
    const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ device_id })
        .select()
        .single();

    if (createError) throw createError;
    return newUser;
};

const getUserByDeviceId = async (device_id) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', device_id)
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data || null;
};

// --- Computed Metrics (pure function, no DB) ---

const computeMetrics = (snap) => {
    const cash = Number(snap.cash) || 0;
    const investments = Number(snap.investments) || 0;
    const debt = Number(snap.debt) || 0;
    const income = Number(snap.income) || 0;
    const expenses = Number(snap.expenses) || 0;

    const netWorth = cash + investments - debt;
    const surplus = income - expenses;
    const savingsRate = income > 0 ? surplus / income : 0;
    const runwayMonths = expenses > 0 ? cash / expenses : 0;
    const cashDebtRatio = debt > 0 ? cash / debt : -1;
    const debtToAsset = (cash + investments) > 0 ? debt / (cash + investments) : 0;
    const investmentRatio = (cash + investments) > 0 ? investments / (cash + investments) : 0;

    return {
        netWorth: Math.round(netWorth * 100) / 100,
        surplus: Math.round(surplus * 100) / 100,
        savingsRate: Math.round(savingsRate * 10000) / 10000,
        runwayMonths: Math.round(runwayMonths * 10) / 10,
        cashDebtRatio: cashDebtRatio === -1 ? -1 : Math.round(cashDebtRatio * 100) / 100,
        debtToAsset: Math.round(debtToAsset * 10000) / 10000,
        investmentRatio: Math.round(investmentRatio * 10000) / 10000,
    };
};

// --- Snapshot CRUD ---

const upsertSnapshot = async (data) => {
    const { user_id, market_date, cash, investments, debt, debt_interest_rate, income, expenses, risk_level } = data;

    // Check if snapshot exists for this user + month
    const { data: existing } = await supabase
        .from('snapshots')
        .select('id')
        .eq('user_id', user_id)
        .eq('market_date', market_date)
        .single();

    const snapshotData = {
        user_id,
        market_date,
        cash: Number(cash) || 0,
        investments: Number(investments) || 0,
        debt: Number(debt) || 0,
        debt_interest_rate: Number(debt_interest_rate) || 0,
        income: Number(income) || 0,
        expenses: Number(expenses) || 0,
        risk_level: risk_level || 'moderate',
    };

    let result;
    if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
            .from('snapshots')
            .update(snapshotData)
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        result = updated;
    } else {
        // Insert new
        const { data: inserted, error } = await supabase
            .from('snapshots')
            .insert(snapshotData)
            .select()
            .single();
        if (error) throw error;
        result = inserted;
    }

    return result;
};

const getSnapshots = async (user_id) => {
    const { data, error } = await supabase
        .from('snapshots')
        .select('*')
        .eq('user_id', user_id)
        .order('market_date', { ascending: false });

    if (error) throw error;
    return data || [];
};

const getLatestSnapshot = async (user_id) => {
    const { data, error } = await supabase
        .from('snapshots')
        .select('*')
        .eq('user_id', user_id)
        .order('market_date', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
};

const getSnapshotById = async (id, user_id) => {
    const { data, error } = await supabase
        .from('snapshots')
        .select('*')
        .eq('id', id)
        .eq('user_id', user_id)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
};

// --- Advice CRUD ---

const saveAdvice = async (data) => {
    const {
        user_id, snapshot_id, financial_status, risk_level, liquidity_label,
        summary, key_insights, actionable_steps, raw_response, model_used
    } = data;

    const { data: inserted, error } = await supabase
        .from('advice_history')
        .insert({
            user_id,
            snapshot_id,
            financial_status,
            risk_level,
            liquidity_label,
            summary,
            key_insights: key_insights || [],
            actionable_steps: actionable_steps || [],
            raw_response,
            model_used,
        })
        .select()
        .single();

    if (error) throw error;
    return inserted.id;
};

const getAdviceForSnapshot = async (snapshot_id) => {
    const { data, error } = await supabase
        .from('advice_history')
        .select('*')
        .eq('snapshot_id', snapshot_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
};

// --- AI Usage Tracking (Beta limits) ---

const AI_DAILY_LIMIT = 3;

const getAiUsageToday = async (user_id) => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const { data, error } = await supabase
        .from('ai_usage')
        .select('request_count')
        .eq('user_id', user_id)
        .eq('usage_date', today)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? data.request_count : 0;
};

const incrementAiUsage = async (user_id) => {
    const today = new Date().toISOString().slice(0, 10);

    // Try to get existing record
    const { data: existing } = await supabase
        .from('ai_usage')
        .select('id, request_count')
        .eq('user_id', user_id)
        .eq('usage_date', today)
        .single();

    if (existing) {
        // Update count
        await supabase
            .from('ai_usage')
            .update({ request_count: existing.request_count + 1 })
            .eq('id', existing.id);
    } else {
        // Insert new record
        await supabase
            .from('ai_usage')
            .insert({ user_id, usage_date: today, request_count: 1 });
    }
};

const canUseAi = async (user_id) => {
    const used = await getAiUsageToday(user_id);
    return used < AI_DAILY_LIMIT;
};

const getAiUsageInfo = async (user_id) => {
    const used = await getAiUsageToday(user_id);
    return { used, limit: AI_DAILY_LIMIT, remaining: Math.max(0, AI_DAILY_LIMIT - used) };
};

// --- Health Check ---

const healthCheck = async () => {
    try {
        const { data, error } = await supabase.from('users').select('id').limit(1);
        if (error) throw error;
        return { status: 'ok', database: 'supabase' };
    } catch (err) {
        return { status: 'error', database: 'supabase', error: err.message };
    }
};

module.exports = {
    supabase,
    getOrCreateUser,
    getUserByDeviceId,
    computeMetrics,
    upsertSnapshot,
    getSnapshots,
    getLatestSnapshot,
    getSnapshotById,
    saveAdvice,
    getAdviceForSnapshot,
    getAiUsageToday,
    incrementAiUsage,
    canUseAi,
    getAiUsageInfo,
    healthCheck,
    AI_DAILY_LIMIT,
};
