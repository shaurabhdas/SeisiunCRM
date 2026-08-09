-- Schema migration script for ApexCRM
-- Creates the required database tables and triggers for both development (public) and testing (test) schemas.

-- 1. Create the test schema if it does not exist
CREATE SCHEMA IF NOT EXISTS test;

-- 2. Define the schema structure (designed to run under SET search_path)
CREATE OR REPLACE FUNCTION create_crm_schema() RETURNS void AS $$
BEGIN
  -- Accounts Table
  CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    industry TEXT,
    company_size TEXT,
    sales_region TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Leads Table
  CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_name TEXT NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    stage TEXT NOT NULL DEFAULT 'contact',
    open_date DATE NOT NULL DEFAULT CURRENT_DATE,
    forecast_close_date DATE,
    pain_points TEXT,
    competitor TEXT,
    last_connect_date DATE,
    assigned_rep_id UUID,
    assigned_rep_name TEXT,
    needs_reassignment BOOLEAN DEFAULT FALSE NOT NULL,
    disqualification_reason TEXT,
    post_demo_outcome TEXT,
    deal_value NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Contacts Table
  CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    stakeholder_role TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Lead Activities Table
  CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    logged_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Lead Stage History Table
  CREATE TABLE IF NOT EXISTS lead_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    changed_by TEXT
  );

  -- Deals Table
  CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
    originating_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    opportunity_name TEXT NOT NULL,
    deal_type TEXT NOT NULL,
    reported_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    value_confidence TEXT NOT NULL,
    stage TEXT NOT NULL,
    sales_region TEXT,
    needs_reassignment BOOLEAN DEFAULT FALSE NOT NULL,
    assigned_rep_name TEXT,
    proposal_date DATE,
    close_date DATE,
    lost_reason TEXT,
    sow_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Deal Activities Table
  CREATE TABLE IF NOT EXISTS deal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Deal Stage History Table
  CREATE TABLE IF NOT EXISTS deal_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Tasks Table
  CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    assigned_to_name TEXT,
    created_by_name TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'complete')),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- User Profiles Table
  CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'sales_rep',
    status TEXT NOT NULL DEFAULT 'active',
    password_set BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Disable Row Level Security (RLS) on all tables for ease of integration
  ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
  ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
  ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
  ALTER TABLE lead_activities DISABLE ROW LEVEL SECURITY;
  ALTER TABLE lead_stage_history DISABLE ROW LEVEL SECURITY;
  ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
  ALTER TABLE deal_activities DISABLE ROW LEVEL SECURITY;
  ALTER TABLE deal_stage_history DISABLE ROW LEVEL SECURITY;
  ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
  ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger functions and bind triggers (unqualified so they go into active search_path)
CREATE OR REPLACE FUNCTION trigger_insert_lead_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_stage_history (lead_id, from_stage, to_stage)
  VALUES (NEW.id, NULL, NEW.stage);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_lead_last_connect_date()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads
  SET last_connect_date = NEW.activity_date
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply schema and bind triggers to 'public' schema
SET search_path = public;
SELECT create_crm_schema();

DROP TRIGGER IF EXISTS lead_insert_history_trigger ON leads;
CREATE TRIGGER lead_insert_history_trigger
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION trigger_insert_lead_history();

DROP TRIGGER IF EXISTS lead_activity_insert_trigger ON lead_activities;
CREATE TRIGGER lead_activity_insert_trigger
AFTER INSERT ON lead_activities
FOR EACH ROW
EXECUTE FUNCTION update_lead_last_connect_date();

-- 5. Apply schema and bind triggers to 'test' schema
SET search_path = test;
SELECT create_crm_schema();

DROP TRIGGER IF EXISTS lead_insert_history_trigger ON leads;
CREATE TRIGGER lead_insert_history_trigger
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION trigger_insert_lead_history();

DROP TRIGGER IF EXISTS lead_activity_insert_trigger ON lead_activities;
CREATE TRIGGER lead_activity_insert_trigger
AFTER INSERT ON lead_activities
FOR EACH ROW
EXECUTE FUNCTION update_lead_last_connect_date();
