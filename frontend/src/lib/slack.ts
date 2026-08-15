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
