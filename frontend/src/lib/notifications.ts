import { supabase } from './accounts'

export type NotificationType = 'approval_requested' | 'approval_granted' | 'record_updated'
export type NotificationRecordType = 'lead' | 'deal'

type CreateNotificationParams = {
  recipientId: string
  type: NotificationType
  recordType: NotificationRecordType
  recordId: string
  recordName: string
  message: string
  actorId?: string | null
  actorName?: string | null
}

// Notifications are a side effect of CRM actions, not the action itself -
// never let a failure here block the caller.
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      recipient_id: params.recipientId,
      type: params.type,
      record_type: params.recordType,
      record_id: params.recordId,
      record_name: params.recordName,
      message: params.message,
      actor_id: params.actorId || null,
      actor_name: params.actorName || null,
    })
    if (error) console.error('Failed to create notification:', error)
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

// Fans a notification out to every active manager/super_admin - there's no
// reporting hierarchy in this app, so "the manager" means all of them.
export async function notifyManagers(params: Omit<CreateNotificationParams, 'recipientId'>): Promise<void> {
  try {
    const { data: managers } = await supabase
      .from('user_profiles')
      .select('id')
      .in('role', ['manager', 'super_admin'])
      .eq('status', 'active')
    if (!managers || managers.length === 0) return

    await Promise.all(managers.map((m: { id: string }) => createNotification({ ...params, recipientId: m.id })))
  } catch (error) {
    console.error('Failed to notify managers:', error)
  }
}
