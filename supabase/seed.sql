-- Database seed data for ApexCRM
-- Seeds initial mock data for accounts, leads, contacts, activities, and tasks.

-- 1. Apply seeds to public schema
SET search_path = public;

-- Seed Accounts
INSERT INTO accounts (id, name, industry, company_size, sales_region, notes)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Acme Corporation', 'Manufacturing', 'Enterprise', 'US East', 'Key account for SaaS solutions'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Initech LLC', 'Technology', 'SMB', 'US West', 'Evaluating migration to cloud platforms')
ON CONFLICT (id) DO NOTHING;

-- Seed Leads
INSERT INTO leads (id, opportunity_name, account_id, stage, open_date, forecast_close_date, pain_points, competitor, deal_value, assigned_rep_name)
VALUES 
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Enterprise Cloud Migration', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'contact', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 'Legacy systems are slow and expensive', 'AWS Professional Services', 150000.00, 'Sarah'),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'CRM Upgrade Project', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'outreach', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '60 days', 'Need better dashboard and task manager', 'Salesforce', 75000.00, 'David')
ON CONFLICT (id) DO NOTHING;

-- Seed Contacts
INSERT INTO contacts (id, lead_id, account_id, first_name, last_name, email, phone, stakeholder_role)
VALUES 
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Jane', 'Smith', 'jane.smith@initech.com', '555-0199', 'champion'),
  ('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'John', 'Doe', 'john.doe@acme.com', '555-0144', 'decision_maker')
ON CONFLICT (id) DO NOTHING;

-- Seed Lead Activities
INSERT INTO lead_activities (id, lead_id, activity_type, activity_date, note, logged_by)
VALUES 
  ('12345678-1234-1234-1234-123456789012', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'email', CURRENT_DATE - INTERVAL '5 days', 'Sent initial introduction and overview pdf.', 'Sarah'),
  ('23456789-2345-2345-2345-234567890123', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'call', CURRENT_DATE - INTERVAL '2 days', 'Discussed current bottlenecks with Initech team.', 'David')
ON CONFLICT (id) DO NOTHING;

-- Seed Deals
INSERT INTO deals (id, account_id, opportunity_name, deal_type, reported_value, value_confidence, stage, sales_region, assigned_rep_name, proposal_date)
VALUES 
  ('a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Acme Cloud Deal', 'full_contract', 250000.00, 'committed', 'proposal_submitted', 'US East', 'Sarah', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Seed Tasks
INSERT INTO tasks (id, title, description, priority, due_date, assigned_to_name, created_by_name, status, lead_id)
VALUES 
  ('34567890-3456-3456-3456-345678901234', 'Follow up on presentation', 'Send follow up email with presentation slides.', 'high', CURRENT_DATE + INTERVAL '2 days', 'Sarah', 'David', 'open', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f'),
  ('45678901-4567-4567-4567-456789012345', 'Prepare contract draft', 'Draft the contract document for review.', 'medium', CURRENT_DATE + INTERVAL '5 days', 'Sarah', 'Sarah', 'open', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a')
ON CONFLICT (id) DO NOTHING;


-- 2. Apply seeds to test schema
SET search_path = test;

-- Seed Accounts
INSERT INTO accounts (id, name, industry, company_size, sales_region, notes)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Acme Corporation', 'Manufacturing', 'Enterprise', 'US East', 'Key account for SaaS solutions'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Initech LLC', 'Technology', 'SMB', 'US West', 'Evaluating migration to cloud platforms')
ON CONFLICT (id) DO NOTHING;

-- Seed Leads
INSERT INTO leads (id, opportunity_name, account_id, stage, open_date, forecast_close_date, pain_points, competitor, deal_value, assigned_rep_name)
VALUES 
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Enterprise Cloud Migration', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'contact', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 'Legacy systems are slow and expensive', 'AWS Professional Services', 150000.00, 'Sarah'),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'CRM Upgrade Project', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'outreach', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '60 days', 'Need better dashboard and task manager', 'Salesforce', 75000.00, 'David')
ON CONFLICT (id) DO NOTHING;

-- Seed Contacts
INSERT INTO contacts (id, lead_id, account_id, first_name, last_name, email, phone, stakeholder_role)
VALUES 
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Jane', 'Smith', 'jane.smith@initech.com', '555-0199', 'champion'),
  ('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'John', 'Doe', 'john.doe@acme.com', '555-0144', 'decision_maker')
ON CONFLICT (id) DO NOTHING;

-- Seed Lead Activities
INSERT INTO lead_activities (id, lead_id, activity_type, activity_date, note, logged_by)
VALUES 
  ('12345678-1234-1234-1234-123456789012', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'email', CURRENT_DATE - INTERVAL '5 days', 'Sent initial introduction and overview pdf.', 'Sarah'),
  ('23456789-2345-2345-2345-234567890123', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'call', CURRENT_DATE - INTERVAL '2 days', 'Discussed current bottlenecks with Initech team.', 'David')
ON CONFLICT (id) DO NOTHING;

-- Seed Deals
INSERT INTO deals (id, account_id, opportunity_name, deal_type, reported_value, value_confidence, stage, sales_region, assigned_rep_name, proposal_date)
VALUES 
  ('a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Acme Cloud Deal', 'full_contract', 250000.00, 'committed', 'proposal_submitted', 'US East', 'Sarah', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Seed Tasks
INSERT INTO tasks (id, title, description, priority, due_date, assigned_to_name, created_by_name, status, lead_id)
VALUES 
  ('34567890-3456-3456-3456-345678901234', 'Follow up on presentation', 'Send follow up email with presentation slides.', 'high', CURRENT_DATE + INTERVAL '2 days', 'Sarah', 'David', 'open', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f'),
  ('45678901-4567-4567-4567-456789012345', 'Prepare contract draft', 'Draft the contract document for review.', 'medium', CURRENT_DATE + INTERVAL '5 days', 'Sarah', 'Sarah', 'open', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a')
ON CONFLICT (id) DO NOTHING;
