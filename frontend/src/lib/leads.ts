import { supabase } from './accounts'

const CLEAR_PENDING_TRANSITION = {
  pending_transition: null,
  pending_transition_requested_by: null,
  pending_transition_requested_by_name: null,
  pending_transition_requested_at: null,
  pending_transition_action: null,
}

// Prerequisite checks a rep must satisfy before a stage move can even be
// requested. Mirrors the branching in api/leads/[id]/stage/route.ts exactly -
// kept as a pure function so both that route and (if ever needed) the
// approve route can call the identical check.
export function getLeadStagePrerequisiteError(
  lead: { stage: string; forecast_close_date: string | null },
  contacts: any[],
  activities: any[],
  toStage: string,
  postDemoOutcome?: string | null
): string | null {
  const fromStage = lead.stage
  if (toStage === 'disqualified') return null

  if (fromStage === 'contact' && toStage === 'outreach') {
    const hasEmail = activities.some((a: any) => a.activity_type?.toLowerCase() === 'email')
    if (!hasEmail) return 'At least one activity of type "email" is required to move to Outreach.'
  }
  if (fromStage === 'outreach' && toStage === 'connected') {
    const hasCallOrMeeting = activities.some((a: any) => ['call', 'meeting'].includes(a.activity_type?.toLowerCase()))
    if (!hasCallOrMeeting) return 'At least one activity of type "call" or "meeting" is required to move to Connected.'
  }
  if (fromStage === 'connected' && toStage === 'presentation') {
    if (contacts.length === 0) return 'At least one contact is required to move to Presentation.'
  }
  if (fromStage === 'presentation' && toStage === 'demo') {
    const hasPresentation = activities.some((a: any) => a.activity_type?.toLowerCase() === 'presentation')
    if (!hasPresentation) return 'At least one activity of type "presentation" is required to move to Demo.'
  }
  if (fromStage === 'demo' && toStage === 'evaluating') {
    const hasDemo = activities.some((a: any) => a.activity_type?.toLowerCase() === 'demo')
    if (!hasDemo) return 'At least one activity of type "demo" is required to move to Evaluating.'
    if (!lead.forecast_close_date) return 'Forecast Close Date must be set to move to Evaluating.'
    const hasBuyerOrDecisionMaker = contacts.some((c: any) => ['economic_buyer', 'decision_maker'].includes(c.stakeholder_role?.toLowerCase() || ''))
    if (!hasBuyerOrDecisionMaker) return 'At least one contact with role "Economic Buyer" or "Decision Maker" is required to move to Evaluating.'
  }
  if (fromStage === 'evaluating' && toStage === 'deal') {
    if (!postDemoOutcome) return 'A post demo outcome must be selected to close this lead.'
  }
  return null
}

// Applies a stage transition that has already passed prerequisite checks -
// used both by the manager-direct path and by the approve endpoint replaying
// a rep's previously-deferred request. Always clears any pending_transition*
// columns as part of the write: a successful stage write of any kind makes
// an outstanding proposal stale by definition, whether it's the one just
// approved or one a manager's direct write is superseding.
export async function applyLeadStageTransition(
  leadId: string,
  toStage: string,
  postDemoOutcome: string | null | undefined,
  changedBy: string | null
) {
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()
  if (leadErr || !lead) throw new Error('Lead not found')

  const fromStage = lead.stage

  // Special case inherited from the original route: closing evaluating→deal
  // with a negative outcome disqualifies the lead instead.
  if (fromStage === 'evaluating' && toStage === 'deal' && ['not_now', 'not_a_fit'].includes(postDemoOutcome || '')) {
    const { data: updatedLead, error: upErr } = await supabase
      .from('leads')
      .update({
        stage: 'disqualified',
        post_demo_outcome: postDemoOutcome,
        disqualification_reason: postDemoOutcome === 'not_now' ? 'no_timing' : 'no_need',
        ...CLEAR_PENDING_TRANSITION,
      })
      .eq('id', leadId)
      .select()
      .single()
    if (upErr) throw upErr

    const { error: histErr } = await supabase
      .from('lead_stage_history')
      .insert({ lead_id: leadId, from_stage: fromStage, to_stage: 'disqualified', changed_by: changedBy })
    if (histErr) throw histErr

    return { lead: updatedLead, autoDisqualified: true }
  }

  const { data: updatedLead, error: updateErr } = await supabase
    .from('leads')
    .update({
      stage: toStage,
      post_demo_outcome: toStage === 'deal' || toStage === 'evaluating' ? postDemoOutcome : lead.post_demo_outcome,
      ...CLEAR_PENDING_TRANSITION,
    })
    .eq('id', leadId)
    .select()
    .single()
  if (updateErr) throw updateErr

  const { error: histErr } = await supabase
    .from('lead_stage_history')
    .insert({ lead_id: leadId, from_stage: fromStage, to_stage: toStage, changed_by: changedBy })
  if (histErr) throw histErr

  return { lead: updatedLead, autoDisqualified: false }
}

export async function applyLeadDisqualify(leadId: string, reason: string, changedBy: string | null) {
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('id, stage')
    .eq('id', leadId)
    .single()
  if (leadErr || !lead) throw new Error('Lead not found')

  const { data: updatedLead, error: updateErr } = await supabase
    .from('leads')
    .update({
      stage: 'disqualified',
      disqualification_reason: reason,
      ...CLEAR_PENDING_TRANSITION,
    })
    .eq('id', leadId)
    .select()
    .single()
  if (updateErr) throw updateErr

  const { error: histErr } = await supabase
    .from('lead_stage_history')
    .insert({ lead_id: leadId, from_stage: lead.stage, to_stage: 'disqualified', changed_by: changedBy })
  if (histErr) throw histErr

  return updatedLead
}

export function camelCaseContact(c: any) {
  if (!c) return null
  return {
    id: c.id,
    name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || null,
    firstName: c.first_name,
    lastName: c.last_name,
    email: c.email,
    phone: c.phone,
    organization: c.organization,
    leadId: c.lead_id,
    accountId: c.account_id,
    dealId: c.deal_id,
    stakeholderRole: c.stakeholder_role,
    createdBy: c.created_by,
    createdByName: c.created_by_name,
    createdAt: c.created_at
  }
}

export function camelCaseActivity(a: any) {
  if (!a) return null
  return {
    id: a.id,
    leadId: a.lead_id,
    activityType: a.activity_type,
    activityDate: a.activity_date,
    note: a.note,
    loggedBy: a.logged_by,
    createdAt: a.created_at
  }
}

function camelCaseStageHistory(h: any) {
  return {
    id: h.id,
    leadId: h.lead_id,
    fromStage: h.from_stage,
    toStage: h.to_stage,
    changedAt: h.changed_at,
    changedBy: h.changed_by
  }
}

export function camelCaseLead(lead: any) {
  if (!lead) return null
  return {
    id: lead.id,
    opportunityName: lead.opportunity_name,
    accountId: lead.account_id,
    stage: lead.stage,
    openDate: lead.open_date,
    forecastCloseDate: lead.forecast_close_date,
    painPoints: lead.pain_points,
    competitor: lead.competitor,
    lastConnectDate: lead.last_connect_date,
    assignedRepId: lead.assigned_rep_id,
    assignedRepName: lead.assigned_rep_name,
    needsReassignment: lead.needs_reassignment,
    disqualificationReason: lead.disqualification_reason,
    postDemoOutcome: lead.post_demo_outcome,
    dealValue: lead.deal_value,
    createdAt: lead.created_at,
    pendingTransition: lead.pending_transition,
    pendingTransitionRequestedBy: lead.pending_transition_requested_by,
    pendingTransitionRequestedByName: lead.pending_transition_requested_by_name,
    pendingTransitionRequestedAt: lead.pending_transition_requested_at,
    pendingTransitionAction: lead.pending_transition_action,
    account: lead.account ? {
      id: lead.account.id,
      name: lead.account.name,
      notes: lead.account.notes,
      industry: lead.account.industry,
      companySize: lead.account.company_size,
      salesRegion: lead.account.sales_region,
      createdAt: lead.account.created_at
    } : null,
    contacts: (lead.contacts || []).map(camelCaseContact),
    activities: (lead.activities || []).map(camelCaseActivity),
    stageHistory: (lead.stageHistory || []).map(camelCaseStageHistory)
  }
}
