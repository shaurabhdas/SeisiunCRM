import type { Industry } from "./industry"

export type EmailTemplate = {
  id: string
  name: string
  industry: Industry
  subject: string
  body_html: string
  created_by: string | null
  created_by_name: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export type EmailAttachment = {
  id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  uploaded_by: string | null
  uploaded_by_name: string | null
  category: "brochure" | "pitch_deck" | "case_study" | "pricing" | "sow" | "other"
  created_at: string
}

export type SentEmail = {
  id: string
  sent_by: string | null
  sent_by_name: string | null
  sent_from: string
  to_recipients: Array<{ email: string; name?: string }>
  cc_recipients: Array<{ email: string; name?: string }>
  subject: string
  body_html: string
  template_id: string | null
  template_name: string | null
  lead_ids: string[]
  deal_ids: string[]
  account_ids: string[]
  attachment_ids: string[]
  microsoft_message_id: string | null
  status: "draft" | "sent" | "failed" | "replied"
  sent_at: string | null
  reply_received: boolean
  reply_received_at: string | null
  created_at: string
}

export const ATTACHMENT_CATEGORIES = [
  { value: "brochure", label: "Brochure" },
  { value: "pitch_deck", label: "Pitch Deck" },
  { value: "case_study", label: "Case Study" },
  { value: "pricing", label: "Pricing" },
  { value: "sow", label: "SOW" },
  { value: "other", label: "Other" },
] as const
