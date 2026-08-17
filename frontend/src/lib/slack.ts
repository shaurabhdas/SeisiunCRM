import { supabase } from './accounts'

type SlackConfig = {
  botAccessToken: string
  defaultChannelId: string | null
  notifyNewLead: boolean
  notifyDealWon: boolean
  notifyDealLost: boolean
}

async function getSlackConfig(): Promise<SlackConfig | null> {
  const { data } = await supabase
    .from('slack_integrations')
    .select('bot_access_token, default_channel_id, notify_new_lead, notify_deal_won, notify_deal_lost')
    .eq('id', 'default')
    .maybeSingle()

  if (!data || !data.bot_access_token || !data.default_channel_id) return null

  return {
    botAccessToken: data.bot_access_token,
    defaultChannelId: data.default_channel_id,
    notifyNewLead: data.notify_new_lead,
    notifyDealWon: data.notify_deal_won,
    notifyDealLost: data.notify_deal_lost,
  }
}

async function postToSlack(botAccessToken: string, channelId: string, text: string): Promise<void> {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botAccessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: channelId, text, unfurl_links: false }),
  })

  const data = await res.json()
  if (!data.ok) {
    console.error('Slack postMessage failed:', data.error)
  }
}

// Notifications are a best-effort side effect of CRM actions - never let a
// Slack failure (or Slack simply not being connected) block the caller.
async function notify(enabledCheck: (c: SlackConfig) => boolean, text: string): Promise<void> {
  try {
    const config = await getSlackConfig()
    if (!config || !enabledCheck(config)) return
    await postToSlack(config.botAccessToken, config.defaultChannelId!, text)
  } catch (error) {
    console.error('Slack notification failed:', error)
  }
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function notifyNewLead(lead: { opportunityName: string; accountName?: string | null; assignedRepName?: string | null; dealValue?: number | null }): Promise<void> {
  const parts = [`:sparkles: New lead: *${lead.opportunityName}*`]
  if (lead.accountName) parts.push(`for ${lead.accountName}`)
  if (lead.assignedRepName) parts.push(`(assigned to ${lead.assignedRepName})`)
  if (lead.dealValue) parts.push(`— ${currencyFormatter.format(lead.dealValue)}`)
  return notify(c => c.notifyNewLead, parts.join(' '))
}

export function notifyDealWon(deal: { opportunityName: string; accountName?: string | null; assignedRepName?: string | null; value?: number | null }): Promise<void> {
  const parts = [`:tada: Deal won: *${deal.opportunityName}*`]
  if (deal.accountName) parts.push(`with ${deal.accountName}`)
  if (deal.value) parts.push(`— ${currencyFormatter.format(deal.value)}`)
  if (deal.assignedRepName) parts.push(`(${deal.assignedRepName})`)
  return notify(c => c.notifyDealWon, parts.join(' '))
}

export function notifyDealLost(deal: { opportunityName: string; accountName?: string | null; assignedRepName?: string | null; lostReason?: string | null }): Promise<void> {
  const parts = [`:disappointed: Deal lost: *${deal.opportunityName}*`]
  if (deal.accountName) parts.push(`with ${deal.accountName}`)
  if (deal.lostReason) parts.push(`— ${deal.lostReason.replace(/_/g, ' ')}`)
  if (deal.assignedRepName) parts.push(`(${deal.assignedRepName})`)
  return notify(c => c.notifyDealLost, parts.join(' '))
}

// DMing a specific manager doesn't depend on the shared-channel config
// (default channel, per-event toggles) - just whether Slack is connected at all.
async function getSlackBotToken(): Promise<string | null> {
  const { data } = await supabase
    .from('slack_integrations')
    .select('bot_access_token')
    .eq('id', 'default')
    .maybeSingle()
  return data?.bot_access_token || null
}

// Resolves a manager's Slack member id from their CRM email, caching the
// result on user_profiles.slack_member_id so repeat notifications skip the
// lookup. Requires the users:read.email scope on the connected Slack app -
// returns null (silently) if the lookup fails, e.g. the scope isn't granted
// yet or the CRM/Slack emails don't match.
async function resolveSlackMemberId(botAccessToken: string, userId: string, email: string, cachedId: string | null): Promise<string | null> {
  if (cachedId) return cachedId

  const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${botAccessToken}` },
  })
  const data = await res.json()
  if (!data.ok || !data.user?.id) {
    console.error('Slack users.lookupByEmail failed for', email, ':', data.error)
    return null
  }

  await supabase.from('user_profiles').update({ slack_member_id: data.user.id }).eq('id', userId)
  return data.user.id
}

async function dmSlackUser(botAccessToken: string, slackMemberId: string, text: string): Promise<void> {
  const openRes = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botAccessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ users: slackMemberId }),
  })
  const openData = await openRes.json()
  if (!openData.ok || !openData.channel?.id) {
    console.error('Slack conversations.open failed:', openData.error)
    return
  }

  await postToSlack(botAccessToken, openData.channel.id, text)
}

// Best-effort DM to every manager/super_admin that a rep's stage-change
// request needs approval. A failure for one manager (or all of them, e.g.
// Slack not connected) never blocks the approval-request flow itself.
export async function notifyApprovalNeeded(params: { recordType: 'lead' | 'deal'; recordName: string; requestedByName: string; link: string }): Promise<void> {
  try {
    const botAccessToken = await getSlackBotToken()
    if (!botAccessToken) return

    const { data: managers } = await supabase
      .from('user_profiles')
      .select('id, email, slack_member_id')
      .in('role', ['manager', 'super_admin'])
      .eq('status', 'active')
    if (!managers || managers.length === 0) return

    const text = `:hourglass_flowing_sand: *${params.requestedByName}* is requesting approval to move ${params.recordType} *${params.recordName}* to its next stage.\n${params.link}`

    await Promise.all(managers.map(async (manager: { id: string; email: string; slack_member_id: string | null }) => {
      const memberId = await resolveSlackMemberId(botAccessToken, manager.id, manager.email, manager.slack_member_id)
      if (!memberId) return
      await dmSlackUser(botAccessToken, memberId, text)
    }))
  } catch (error) {
    console.error('Slack approval notification failed:', error)
  }
}
