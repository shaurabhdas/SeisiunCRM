import { supabase } from '@/lib/accounts'

export type Task = {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  assigned_to_name: string | null
  created_by: string | null
  created_by_name: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'complete'
  due_date: string | null
  completed_at: string | null
  lead_id: string | null
  deal_id: string | null
  account_id: string | null
  created_at: string
  updated_at: string
  lead?: { opportunity_name: string; stage: string } | null
  deal?: { opportunity_name: string; stage: string; deal_type: string } | null
  account?: { name: string } | null
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      lead:leads(opportunity_name, stage),
      deal:deals(opportunity_name, stage, deal_type),
      account:accounts(name)
    `)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description || null,
      assigned_to: task.assigned_to || null,
      assigned_to_name: task.assigned_to_name || null,
      created_by: task.created_by || null,
      created_by_name: task.created_by_name || null,
      priority: task.priority || 'medium',
      status: 'open',
      due_date: task.due_date || null,
      lead_id: task.lead_id || null,
      deal_id: task.deal_id || null,
      account_id: task.account_id || null,
    })
    .select(`
      *,
      lead:leads(opportunity_name, stage),
      deal:deals(opportunity_name, stage, deal_type),
      account:accounts(name)
    `)
    .single()

  if (error) throw error
  return data
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task> {
  const updatePayload: any = { ...updates, updated_at: new Date().toISOString() }

  if (updates.status === 'complete' && !updates.completed_at) {
    updatePayload.completed_at = new Date().toISOString()
  }

  if (updates.status !== 'complete') {
    updatePayload.completed_at = null
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', id)
    .select(`
      *,
      lead:leads(opportunity_name, stage),
      deal:deals(opportunity_name, stage, deal_type),
      account:accounts(name)
    `)
    .single()

  if (error) throw error
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}
