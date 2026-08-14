import { supabase } from './accounts'
import { camelCaseContact } from './leads'

export type ContactInput = {
  name?: string | null
  phone?: string | null
  email?: string | null
  organization?: string | null
  stakeholderRole?: string | null
  leadId?: string | null
  accountId?: string | null
  dealId?: string | null
}

function toColumns(input: ContactInput): Record<string, any> {
  const columns: Record<string, any> = {}
  if ('name' in input) columns.name = input.name || null
  if ('phone' in input) columns.phone = input.phone || null
  if ('email' in input) columns.email = input.email || null
  if ('organization' in input) columns.organization = input.organization || null
  if ('stakeholderRole' in input) columns.stakeholder_role = input.stakeholderRole || null
  if ('leadId' in input) columns.lead_id = input.leadId || null
  if ('accountId' in input) columns.account_id = input.accountId || null
  if ('dealId' in input) columns.deal_id = input.dealId || null
  return columns
}

export async function fetchContactsWithRelations() {
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      lead:leads(id, opportunity_name),
      account:accounts(id, name),
      deal:deals(id, opportunity_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((c: any) => ({
    ...camelCaseContact(c),
    lead: c.lead ? { id: c.lead.id, opportunityName: c.lead.opportunity_name } : null,
    account: c.account ? { id: c.account.id, name: c.account.name } : null,
    deal: c.deal ? { id: c.deal.id, opportunityName: c.deal.opportunity_name } : null,
  }))
}

export async function createContact(input: ContactInput, createdBy: string, createdByName: string) {
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      ...toColumns(input),
      created_by: createdBy,
      created_by_name: createdByName,
    })
    .select()
    .single()

  if (error) throw error
  return camelCaseContact(data)
}

// Callers must pre-filter `input` to association-only fields for non-manager
// creators (restrictToAssociationFields below) - this function trusts
// whatever columns are passed in. contacts has no updated_at column.
export async function updateContact(id: string, input: ContactInput) {
  const { data, error } = await supabase
    .from('contacts')
    .update(toColumns(input))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return camelCaseContact(data)
}

export function restrictToAssociationFields(input: ContactInput): ContactInput {
  const restricted: ContactInput = {}
  if ('leadId' in input) restricted.leadId = input.leadId
  if ('accountId' in input) restricted.accountId = input.accountId
  if ('dealId' in input) restricted.dealId = input.dealId
  return restricted
}
