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
