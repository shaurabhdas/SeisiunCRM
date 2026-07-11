import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Old Supabase credentials (Source)
const OLD_URL = 'https://jdbgqlueshcyjvuoxpcr.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYmdxbHVlc2hjeWp2dW94cGNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzE5MDk3NCwiZXhwIjoyMDk4NzY2OTc0fQ.4C6RVCLFT12-FfwwGxuB4tMOtHs6F0YgziPUGGqDa8I';

// New Supabase credentials (Target) from process.env
const TARGET_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const TARGET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const oldAdmin = createClient(OLD_URL, OLD_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const newAdmin = createClient(TARGET_URL, TARGET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Map old user ID to new user ID
const OLD_USER_ID = '6700f943-dd13-4df5-a2f6-bd56841ab7ef'; // shaurabh.franciscan21@gmail.com
const NEW_USER_ID = 'de74e7ca-c5b3-461b-b2a7-5f010cca9947'; // shaurabh.das@seisiunanalytics.com

function mapUser(val: any) {
  if (val === OLD_USER_ID) return NEW_USER_ID;
  return val;
}

export async function GET() {
  const summary: Record<string, any> = {};

  try {
    // 1. Accounts
    const { data: accounts, error: accErr } = await oldAdmin.from('accounts').select('*');
    if (accErr) throw new Error(`Accounts fetch failed: ${accErr.message}`);
    if (accounts && accounts.length > 0) {
      const { error: insAccErr } = await newAdmin.from('accounts').upsert(accounts);
      if (insAccErr) throw new Error(`Accounts upsert failed: ${insAccErr.message}`);
      summary.accounts = accounts.length;
    } else {
      summary.accounts = 0;
    }

    // 2. Leads
    const { data: leads, error: leadErr } = await oldAdmin.from('leads').select('*');
    if (leadErr) throw new Error(`Leads fetch failed: ${leadErr.message}`);
    if (leads && leads.length > 0) {
      const mappedLeads = leads.map(l => ({
        ...l,
        assigned_rep_id: mapUser(l.assigned_rep_id)
      }));
      const { error: insLeadErr } = await newAdmin.from('leads').upsert(mappedLeads);
      if (insLeadErr) throw new Error(`Leads upsert failed: ${insLeadErr.message}`);
      summary.leads = leads.length;
    } else {
      summary.leads = 0;
    }

    // 3. Contacts
    const { data: contacts, error: conErr } = await oldAdmin.from('contacts').select('*');
    if (conErr) throw new Error(`Contacts fetch failed: ${conErr.message}`);
    if (contacts && contacts.length > 0) {
      const { error: insConErr } = await newAdmin.from('contacts').upsert(contacts);
      if (insConErr) throw new Error(`Contacts upsert failed: ${insConErr.message}`);
      summary.contacts = contacts.length;
    } else {
      summary.contacts = 0;
    }

    // 4. Lead Activities
    const { data: leadActs, error: laErr } = await oldAdmin.from('lead_activities').select('*');
    if (laErr) throw new Error(`Lead activities fetch failed: ${laErr.message}`);
    if (leadActs && leadActs.length > 0) {
      const mappedLeadActs = leadActs.map(a => ({
        ...a,
        logged_by: mapUser(a.logged_by)
      }));
      const { error: insLaErr } = await newAdmin.from('lead_activities').upsert(mappedLeadActs);
      if (insLaErr) throw new Error(`Lead activities upsert failed: ${insLaErr.message}`);
      summary.leadActivities = leadActs.length;
    } else {
      summary.leadActivities = 0;
    }

    // 5. Lead Stage History
    const { data: leadHist, error: lhErr } = await oldAdmin.from('lead_stage_history').select('*');
    if (lhErr) throw new Error(`Lead stage history fetch failed: ${lhErr.message}`);
    if (leadHist && leadHist.length > 0) {
      const mappedLeadHist = leadHist.map(h => ({
        ...h,
        changed_by: mapUser(h.changed_by)
      }));
      const { error: insLhErr } = await newAdmin.from('lead_stage_history').upsert(mappedLeadHist);
      if (insLhErr) throw new Error(`Lead stage history upsert failed: ${insLhErr.message}`);
      summary.leadStageHistory = leadHist.length;
    } else {
      summary.leadStageHistory = 0;
    }

    // 6. Deals
    const { data: deals, error: dealErr } = await oldAdmin.from('deals').select('*');
    if (dealErr) throw new Error(`Deals fetch failed: ${dealErr.message}`);
    if (deals && deals.length > 0) {
      const mappedDeals = deals.map(d => ({
        ...d,
        assigned_rep_id: mapUser(d.assigned_rep_id)
      }));
      const { error: insDealErr } = await newAdmin.from('deals').upsert(mappedDeals);
      if (insDealErr) throw new Error(`Deals upsert failed: ${insDealErr.message}`);
      summary.deals = deals.length;
    } else {
      summary.deals = 0;
    }

    // 7. Deal Activities
    const { data: dealActs, error: daErr } = await oldAdmin.from('deal_activities').select('*');
    if (daErr) throw new Error(`Deal activities fetch failed: ${daErr.message}`);
    if (dealActs && dealActs.length > 0) {
      const mappedDealActs = dealActs.map(a => ({
        ...a,
        logged_by: mapUser(a.logged_by)
      }));
      const { error: insDaErr } = await newAdmin.from('deal_activities').upsert(mappedDealActs);
      if (insDaErr) throw new Error(`Deal activities upsert failed: ${insDaErr.message}`);
      summary.dealActivities = dealActs.length;
    } else {
      summary.dealActivities = 0;
    }

    // 8. Deal Stage History
    const { data: dealHist, error: dhErr } = await oldAdmin.from('deal_stage_history').select('*');
    if (dhErr) throw new Error(`Deal stage history fetch failed: ${dhErr.message}`);
    if (dealHist && dealHist.length > 0) {
      const mappedDealHist = dealHist.map(h => ({
        ...h,
        changed_by: mapUser(h.changed_by)
      }));
      const { error: insDhErr } = await newAdmin.from('deal_stage_history').upsert(mappedDealHist);
      if (insDhErr) throw new Error(`Deal stage history upsert failed: ${insDhErr.message}`);
      summary.dealStageHistory = dealHist.length;
    } else {
      summary.dealStageHistory = 0;
    }

    // 9. Tasks
    const { data: tasks, error: taskErr } = await oldAdmin.from('tasks').select('*');
    if (taskErr) throw new Error(`Tasks fetch failed: ${taskErr.message}`);
    if (tasks && tasks.length > 0) {
      const mappedTasks = tasks.map(t => ({
        ...t,
        assigned_to: mapUser(t.assigned_to),
        created_by: mapUser(t.created_by)
      }));
      const { error: insTaskErr } = await newAdmin.from('tasks').upsert(mappedTasks);
      if (insTaskErr) throw new Error(`Tasks upsert failed: ${insTaskErr.message}`);
      summary.tasks = tasks.length;
    } else {
      summary.tasks = 0;
    }

    return NextResponse.json({
      success: true,
      message: 'Data migration completed successfully!',
      summary
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      summary
    }, { status: 500 });
  }
}
