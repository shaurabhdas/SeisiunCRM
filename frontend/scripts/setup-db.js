const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Helper to load env files manually
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`Loading env from: ${filePath}`);
    const envConfig = fs.readFileSync(filePath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1);
        }
        if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Determine which environment to load based on --env flag
const envFlag = process.argv.find(arg => arg.startsWith('--env='));
const targetEnv = envFlag ? envFlag.split('=')[1] : 'local';

// Load env files in priority order based on target environment
if (targetEnv === 'prod' || targetEnv === 'production') {
  loadEnvFile(path.resolve(__dirname, '../.env.prod'));
  loadEnvFile(path.resolve(__dirname, '../../.env.prod'));
} else if (targetEnv === 'test') {
  loadEnvFile(path.resolve(__dirname, '../.env.test'));
  loadEnvFile(path.resolve(__dirname, '../../.env.test'));
} else {
  loadEnvFile(path.resolve(__dirname, '../.env.local'));
  loadEnvFile(path.resolve(__dirname, '../../.env.local'));
}

// Always load base .env as fallback
loadEnvFile(path.resolve(__dirname, '../../.env'));
loadEnvFile(path.resolve(__dirname, '../.env'));

// Resolve DATABASE_URL from either direct setting or Supabase credentials
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Attempt to construct DATABASE_URL from Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl) {
    // Extract the project ref from the Supabase URL
    // Format: https://PROJECT_REF.supabase.co
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (urlMatch) {
      const projectRef = urlMatch[1];
      const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;

      if (password) {
        databaseUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`;
        console.log('Constructed DATABASE_URL from Supabase credentials.');
      } else {
        console.error('Error: Found NEXT_PUBLIC_SUPABASE_URL but no database password.');
        console.error('Add SUPABASE_DB_PASSWORD or POSTGRES_PASSWORD to your env file.');
        console.error('You can find this in Supabase Dashboard > Settings > Database > Connection string.');
        process.exit(1);
      }
    }
  }
}

if (!databaseUrl) {
  console.error('Error: No database connection available.');
  console.error('Provide one of the following in your env file:');
  console.error('  - DATABASE_URL (direct PostgreSQL connection string)');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD');
  console.error('');
  console.error('Usage: node setup-db.js <action> [--env=local|test|prod]');
  console.error('  Actions: migrate, seed, setup, all');
  console.error('  Examples:');
  console.error('    node setup-db.js migrate --env=prod');
  console.error('    node setup-db.js seed --env=test');
  console.error('    node setup-db.js setup --env=prod');
  console.error('    node setup-db.js all');
  process.exit(1);
}

// Parse the action from arguments, ignoring --env flags
const action = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'all';

async function runSQLFile(client, filePath, typeName) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${typeName} file not found at: ${filePath}`);
    return false;
  }

  console.log(`Reading ${typeName} from: ${filePath}...`);
  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`Executing ${typeName} SQL on database...`);
  try {
    await client.query(sql);
    console.log(`Success: ${typeName} executed successfully!`);
    return true;
  } catch (err) {
    console.error(`Error executing ${typeName} SQL:`, err.message);
    return false;
  }
}

async function runSetup(client) {
  console.log('\n=== Running Initial Setup ===\n');

  // Check if tables already exist
  const { rows: existingTables } = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('accounts', 'leads', 'contacts', 'lead_activities', 'lead_stage_history', 'deals', 'deal_activities', 'deal_stage_history', 'tasks', 'user_profiles')
    ORDER BY table_name;
  `);

  if (existingTables.length > 0) {
    console.log('Existing tables found:');
    existingTables.forEach(row => console.log(`  - ${row.table_name}`));
    console.log('');
  }

  // Run schema migration
  const schemaPath = path.resolve(__dirname, '../../supabase/migrations/schema.sql');
  const altSchemaPath = path.resolve(__dirname, '../supabase/migrations/schema.sql');
  const finalSchemaPath = fs.existsSync(schemaPath) ? schemaPath : altSchemaPath;

  if (fs.existsSync(finalSchemaPath)) {
    const migrationSuccess = await runSQLFile(client, finalSchemaPath, 'Schema Migration');
    if (!migrationSuccess) return false;
  } else {
    console.log('No schema migration file found. Running inline setup SQL...');

    try {
      await client.query(`
        -- Accounts
        CREATE TABLE IF NOT EXISTS public.accounts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          industry text,
          company_size text,
          sales_region text,
          notes text,
          created_at timestamptz DEFAULT now()
        );

        -- Leads
        CREATE TABLE IF NOT EXISTS public.leads (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          opportunity_name text NOT NULL,
          account_id uuid REFERENCES public.accounts(id),
          stage text NOT NULL DEFAULT 'contact',
          open_date date DEFAULT current_date,
          forecast_close_date date,
          pain_points text,
          competitor text,
          last_connect_date date,
          assigned_rep_id uuid,
          assigned_rep_name text,
          needs_reassignment boolean DEFAULT false,
          disqualification_reason text,
          post_demo_outcome text,
          deal_value numeric(12,2) DEFAULT 0,
          deal_id uuid,
          created_at timestamptz DEFAULT now()
        );

        -- Contacts
        CREATE TABLE IF NOT EXISTS public.contacts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id uuid REFERENCES public.leads(id),
          account_id uuid REFERENCES public.accounts(id),
          first_name text NOT NULL,
          last_name text NOT NULL,
          email text,
          phone text,
          stakeholder_role text,
          created_at timestamptz DEFAULT now()
        );

        -- Lead Activities
        CREATE TABLE IF NOT EXISTS public.lead_activities (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id uuid REFERENCES public.leads(id),
          activity_type text NOT NULL,
          activity_date date DEFAULT current_date,
          note text,
          logged_by uuid,
          created_at timestamptz DEFAULT now()
        );

        -- Lead Stage History
        CREATE TABLE IF NOT EXISTS public.lead_stage_history (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id uuid REFERENCES public.leads(id),
          from_stage text,
          to_stage text NOT NULL,
          changed_at timestamptz DEFAULT now(),
          changed_by uuid
        );

        -- Deals
        CREATE TABLE IF NOT EXISTS public.deals (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
          lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
          originating_deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
          opportunity_name text NOT NULL,
          deal_type text NOT NULL,
          stage text NOT NULL DEFAULT 'proposal_submitted',
          reported_value numeric(12,2) NOT NULL DEFAULT 0,
          potential_full_contract_value numeric(12,2),
          value_confidence text NOT NULL DEFAULT 'estimated',
          sow_reference text,
          proposal_date date,
          close_date date,
          forecast_close_date date,
          lost_reason text,
          on_hold_resume_date date,
          assigned_rep_id uuid,
          assigned_rep_name text,
          needs_reassignment boolean DEFAULT false,
          sales_region text,
          competitor text,
          notes text,
          created_at timestamptz DEFAULT now()
        );

        -- Deal Activities
        CREATE TABLE IF NOT EXISTS public.deal_activities (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
          activity_type text NOT NULL,
          activity_date date DEFAULT current_date,
          note text,
          logged_by uuid,
          created_at timestamptz DEFAULT now()
        );

        -- Deal Stage History
        CREATE TABLE IF NOT EXISTS public.deal_stage_history (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
          from_stage text,
          to_stage text NOT NULL,
          changed_at timestamptz DEFAULT now(),
          changed_by uuid
        );

        -- Tasks
        CREATE TABLE IF NOT EXISTS public.tasks (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL,
          description text,
          assigned_to uuid,
          assigned_to_name text,
          created_by uuid,
          created_by_name text,
          priority text NOT NULL DEFAULT 'medium',
          status text NOT NULL DEFAULT 'open',
          due_date date,
          completed_at timestamptz,
          lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
          deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
          account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'complete'))
        );

        -- User Profiles
        CREATE TABLE IF NOT EXISTS public.user_profiles (
          id uuid PRIMARY KEY,
          email text NOT NULL,
          full_name text,
          role text NOT NULL DEFAULT 'pending',
          status text NOT NULL DEFAULT 'pending',
          avatar_url text,
          password_set boolean DEFAULT false,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          CONSTRAINT valid_role CHECK (role IN ('super_admin', 'manager', 'rep', 'pending')),
          CONSTRAINT valid_status_chk CHECK (status IN ('active', 'revoked', 'pending'))
        );
      `);
      console.log('Success: Inline schema setup executed successfully!');
    } catch (err) {
      console.error('Error executing inline schema setup:', err.message);
      return false;
    }
  }

  // Create triggers
  console.log('\nCreating database triggers...');
  try {
    // Trigger: update last_connect_date on activity insert
    await client.query(`
      CREATE OR REPLACE FUNCTION public.update_last_connect_date()
      RETURNS trigger AS $$
      BEGIN
        UPDATE public.leads
        SET last_connect_date = (
          SELECT max(activity_date)
          FROM public.lead_activities
          WHERE lead_id = NEW.lead_id
        )
        WHERE id = NEW.lead_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_update_last_connect_date ON public.lead_activities;
      CREATE TRIGGER trg_update_last_connect_date
      AFTER INSERT ON public.lead_activities
      FOR EACH ROW
      EXECUTE FUNCTION public.update_last_connect_date();
    `);
    console.log('  - last_connect_date trigger created');

    // Trigger: handle new user profile creation
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.user_profiles (id, email, full_name, role, status)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
          'pending',
          'pending'
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
      CREATE TRIGGER trg_on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    `);
    console.log('  - new user profile trigger created');

    // Trigger: handle rep revocation
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_rep_revocation()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.status = 'revoked' AND OLD.status = 'active' THEN
          UPDATE public.leads
          SET needs_reassignment = true
          WHERE assigned_rep_id = NEW.id
          AND stage NOT IN ('disqualified', 'converted');

          UPDATE public.deals
          SET needs_reassignment = true
          WHERE assigned_rep_id = NEW.id
          AND stage NOT IN ('closed_won', 'closed_lost');
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS trg_handle_rep_revocation ON public.user_profiles;
      CREATE TRIGGER trg_handle_rep_revocation
      AFTER UPDATE ON public.user_profiles
      FOR EACH ROW
      WHEN (OLD.status IS DISTINCT FROM NEW.status)
      EXECUTE FUNCTION public.handle_rep_revocation();
    `);
    console.log('  - rep revocation trigger created');

    console.log('Success: All triggers created!');
  } catch (err) {
    console.error('Error creating triggers:', err.message);
    return false;
  }

  // Enable RLS on user_profiles
  console.log('\nConfiguring Row Level Security...');
  try {
    await client.query(`
      ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.user_profiles;
      CREATE POLICY "Authenticated users can read all profiles"
      ON public.user_profiles FOR SELECT
      TO authenticated
      USING (true);

      DROP POLICY IF EXISTS "Super admin can update profiles" ON public.user_profiles;
      CREATE POLICY "Super admin can update profiles"
      ON public.user_profiles FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
          AND role = 'super_admin'
          AND status = 'active'
        )
      );
    `);
    console.log('Success: RLS policies configured!');
  } catch (err) {
    console.error('Error configuring RLS:', err.message);
    return false;
  }

  // Verify final state
  console.log('\n=== Setup Verification ===\n');
  const { rows: finalTables } = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('accounts', 'leads', 'contacts', 'lead_activities', 'lead_stage_history', 'deals', 'deal_activities', 'deal_stage_history', 'tasks', 'user_profiles')
    ORDER BY table_name;
  `);
  console.log(`Tables present: ${finalTables.length}/10`);
  finalTables.forEach(row => console.log(`  [x] ${row.table_name}`));

  const { rows: triggers } = await client.query(`
    SELECT trigger_name, event_object_table 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    ORDER BY trigger_name;
  `);
  console.log(`\nTriggers present: ${triggers.length}`);
  triggers.forEach(row => console.log(`  [x] ${row.trigger_name} on ${row.event_object_table}`));

  console.log('\n=== Setup Complete ===\n');
  return true;
}

async function main() {
  console.log(`\nEnvironment: ${targetEnv}`);
  console.log(`Action: ${action}`);
  console.log(`Connecting to: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.co') || databaseUrl.includes('supabase.com')
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully.\n');

    let success = true;

    if (action === 'setup') {
      success = await runSetup(client);
    } else if (action === 'migrate' || action === 'all') {
      const schemaPath = path.resolve(__dirname, '../../supabase/migrations/schema.sql');
      const altSchemaPath = path.resolve(__dirname, '../supabase/migrations/schema.sql');
      const finalPath = fs.existsSync(schemaPath) ? schemaPath : altSchemaPath;
      success = await runSQLFile(client, finalPath, 'Schema Migration');
    }

    if (success && (action === 'seed' || action === 'all')) {
      const seedPath = path.resolve(__dirname, '../../supabase/seed.sql');
      const altSeedPath = path.resolve(__dirname, '../supabase/seed.sql');
      const finalPath = fs.existsSync(seedPath) ? seedPath : altSeedPath;
      success = await runSQLFile(client, finalPath, 'Database Seed');
    }

    if (!success) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

main();