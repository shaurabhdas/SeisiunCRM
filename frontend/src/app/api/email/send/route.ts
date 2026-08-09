import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'
import { getValidAccessToken, sendEmailViaGraph } from '@/lib/microsoft-graph'
import { sanitizeEmailHtml } from '@/lib/sanitize-html'

type Recipient = { email: string; name?: string }

function substituteVariables(html: string, vars: Record<string, string>) {
  let result = html
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value)
  }
  return result
}

export async function POST(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const body = await request.json()
      const {
        toRecipients,
        ccRecipients = [],
        subject,
        bodyHtml,
        templateId,
        templateName,
        attachmentIds = [],
        leadIds = [],
        dealIds = [],
        accountIds = [],
      }: {
        toRecipients: Recipient[]
        ccRecipients?: Recipient[]
        subject: string
        bodyHtml: string
        templateId?: string
        templateName?: string
        attachmentIds?: string[]
        leadIds?: string[]
        dealIds?: string[]
        accountIds?: string[]
      } = body

      if (!Array.isArray(toRecipients) || toRecipients.length === 0 || toRecipients.length > 500) {
        return NextResponse.json(
          { error: 'toRecipients must contain between 1 and 500 recipients' },
          { status: 400 }
        )
      }

      if (!subject || !subject.trim() || !bodyHtml || !bodyHtml.trim()) {
        return NextResponse.json(
          { error: 'subject and bodyHtml are required' },
          { status: 400 }
        )
      }

      const accessToken = await getValidAccessToken(authUser.id)
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Outlook account not connected. Connect your account in Settings.' },
          { status: 403 }
        )
      }

      const attachments: Array<{ name: string; contentBytes: string }> = []
      if (attachmentIds.length > 0) {
        const { data: attachmentRecords, error: attachErr } = await supabase
          .from('email_attachments')
          .select('*')
          .in('id', attachmentIds)

        if (attachErr) throw attachErr

        for (const record of attachmentRecords || []) {
          const { data: fileData, error: downloadErr } = await supabase
            .storage
            .from('email-attachments')
            .download(record.storage_path)

          if (downloadErr || !fileData) continue

          const buffer = Buffer.from(await fileData.arrayBuffer())
          attachments.push({
            name: record.file_name,
            contentBytes: buffer.toString('base64'),
          })
        }
      }

      const substitutedBody = sanitizeEmailHtml(substituteVariables(bodyHtml, {
        rep_name: authUser.full_name,
        company_name: 'Seisiun Analytics',
        prospect_name: toRecipients[0]?.name || '',
        prospect_company: '',
      }))

      const { messageId } = await sendEmailViaGraph(accessToken, {
        toRecipients,
        ccRecipients,
        subject,
        bodyHtml: substitutedBody,
        attachments,
      })

      const { data: email, error: insertErr } = await supabase
        .from('emails')
        .insert({
          sent_by: authUser.id,
          sent_by_name: authUser.full_name,
          sent_from: authUser.email,
          to_recipients: toRecipients,
          cc_recipients: ccRecipients,
          subject,
          body_html: substitutedBody,
          template_id: templateId || null,
          template_name: templateName || null,
          lead_ids: leadIds,
          deal_ids: dealIds,
          account_ids: accountIds,
          attachment_ids: attachmentIds,
          microsoft_message_id: messageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      const activityDate = new Date().toISOString().split('T')[0]

      for (const leadId of leadIds) {
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          activity_type: 'email',
          activity_date: activityDate,
          note: subject,
          logged_by: authUser.id,
        })
      }

      for (const dealId of dealIds) {
        await supabase.from('deal_activities').insert({
          deal_id: dealId,
          activity_type: 'email',
          activity_date: activityDate,
          note: subject,
          logged_by: authUser.id,
        })
      }

      return NextResponse.json(email, { status: 201 })
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  })
}
