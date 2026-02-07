-- FinMind Supabase Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (device-based identification)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT UNIQUE NOT NULL,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshots table (financial data)
CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_date TEXT NOT NULL,
    -- Assets
    cash_savings NUMERIC DEFAULT 0,
    investments NUMERIC DEFAULT 0,
    personal_assets NUMERIC DEFAULT 0,
    other_assets NUMERIC DEFAULT 0,
    -- Liabilities
    short_term_debt NUMERIC DEFAULT 0,
    long_term_debt NUMERIC DEFAULT 0,
    debt_interest_rate NUMERIC DEFAULT 0,
    -- Income/Expenses
    income NUMERIC DEFAULT 0,
    expenses NUMERIC DEFAULT 0,
    -- Settings
    risk_level TEXT DEFAULT 'moderate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, market_date)
);

-- Advice history table (AI responses)
CREATE TABLE IF NOT EXISTS advice_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    financial_status TEXT,
    risk_level TEXT,
    liquidity_label TEXT,
    summary TEXT,
    key_insights JSONB DEFAULT '[]',
    actionable_steps JSONB DEFAULT '[]',
    raw_response TEXT,
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI usage tracking (rate limiting)
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_market_date ON snapshots(market_date DESC);
CREATE INDEX IF NOT EXISTS idx_advice_snapshot_id ON advice_history(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, usage_date);

-- Row Level Security (RLS) - Optional but recommended
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE advice_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data (via service_role key, backend handles this)
-- For now, we'll use service_role key which bypasses RLS

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS snapshots_updated_at ON snapshots;
CREATE TRIGGER snapshots_updated_at
    BEFORE UPDATE ON snapshots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Success message
SELECT 'FinMind schema created successfully!' AS status;
