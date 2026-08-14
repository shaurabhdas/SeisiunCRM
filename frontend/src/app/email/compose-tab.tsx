"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Paperclip,
  Upload, Library, X, Eye, Loader2, PenLine,
} from "lucide-react"
import { RichTextEditor } from "./rich-text-editor"
import { TagInput, TagOption } from "./tag-input"
import { INDUSTRIES, INDUSTRY_LABELS, INDUSTRY_TOKENS, stripHtml, substituteVariables } from "./industry"
import type { EmailTemplate, EmailAttachment } from "./types"
import { ATTACHMENT_CATEGORIES } from "./types"
import type { CurrentUser } from "./page"

type ListRecord = { id: string; name: string }

const emptyState = {
  to: [] as TagOption[],
  cc: [] as TagOption[],
  showCC: false,
  subject: "",
  body: "",
  templateId: null as string | null,
  templateName: null as string | null,
  attachments: [] as EmailAttachment[],
  linkedLeads: [] as TagOption[],
  linkedDeals: [] as TagOption[],
  linkedAccounts: [] as TagOption[],
}

export function ComposeTab({
  currentUser,
  outlookConnected,
  outlookEmail,
  onSent,
}: {
  currentUser: CurrentUser
  outlookConnected: boolean
  outlookEmail: string | null
  onSent: () => void
}) {
  const searchParams = useSearchParams()
  const [to, setTo] = React.useState<TagOption[]>(emptyState.to)
  const [cc, setCc] = React.useState<TagOption[]>(emptyState.cc)
  const [showCC, setShowCC] = React.useState(false)
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [templateId, setTemplateId] = React.useState<string | null>(null)
  const [templateName, setTemplateName] = React.useState<string | null>(null)

  const [templates, setTemplates] = React.useState<EmailTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = React.useState(false)
  const [templateModalTab, setTemplateModalTab] = React.useState<string>("all")

  const [contactOptions, setContactOptions] = React.useState<TagOption[]>([])
  const [leadOptions, setLeadOptions] = React.useState<TagOption[]>([])
  const [dealOptions, setDealOptions] = React.useState<TagOption[]>([])
  const [accountOptions, setAccountOptions] = React.useState<TagOption[]>([])

  const [linkedLeads, setLinkedLeads] = React.useState<TagOption[]>([])
  const [linkedDeals, setLinkedDeals] = React.useState<TagOption[]>([])
  const [linkedAccounts, setLinkedAccounts] = React.useState<TagOption[]>([])
  const [crmExpanded, setCrmExpanded] = React.useState(false)

  const [libraryAttachments, setLibraryAttachments] = React.useState<EmailAttachment[]>([])
  const [selectedAttachments, setSelectedAttachments] = React.useState<EmailAttachment[]>([])
  const [showLibraryModal, setShowLibraryModal] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [showPreviewModal, setShowPreviewModal] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  const [signatureHtml, setSignatureHtml] = React.useState("")
  const [showSignatureModal, setShowSignatureModal] = React.useState(false)
  const [signatureDraft, setSignatureDraft] = React.useState("")
  const [savingSignature, setSavingSignature] = React.useState(false)

  const withSignature = (sig: string) => sig ? `<p></p><p></p>${sig}` : ""

  React.useEffect(() => {
    async function loadData() {
      try {
        const [templatesRes, recipientsRes, leadsRes, dealsRes, accountsRes, attachmentsRes, signatureRes] = await Promise.all([
          fetch("/api/email/templates"),
          fetch("/api/email/recipients"),
          fetch("/api/leads"),
          fetch("/api/deals"),
          fetch("/api/accounts"),
          fetch("/api/email/attachments"),
          fetch("/api/settings/signature"),
        ])

        if (templatesRes.ok) setTemplates(await templatesRes.json())

        if (signatureRes.ok) {
          const { signatureHtml: sig } = await signatureRes.json()
          setSignatureHtml(sig || "")
          if (sig) setBody(prev => prev || withSignature(sig))
        }

        let matchedContacts: TagOption[] = []
        if (recipientsRes.ok) {
          const contacts = await recipientsRes.json()
          matchedContacts = contacts.map((c: any) => ({ label: c.name, value: c.email, sublabel: c.email, firstName: c.firstName }))
          setContactOptions(matchedContacts)
        }

        const prefillEmail = searchParams.get("to")
        if (prefillEmail) {
          const match = matchedContacts.find(c => c.value === prefillEmail)
          setTo([match || { label: prefillEmail, value: prefillEmail }])
        }

        if (leadsRes.ok) {
          const leads = await leadsRes.json()
          setLeadOptions((leads || []).map((l: any) => ({ label: l.opportunityName, value: l.id })))
        }

        if (dealsRes.ok) {
          const deals = await dealsRes.json()
          setDealOptions((deals || []).map((d: any) => ({ label: d.opportunity_name, value: d.id })))
        }

        if (accountsRes.ok) {
          const accounts = await accountsRes.json()
          setAccountOptions((accounts || []).map((a: any) => ({ label: a.name, value: a.id })))
        }

        if (attachmentsRes.ok) setLibraryAttachments(await attachmentsRes.json())
      } catch (err) {
        console.error("Failed to load compose data", err)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetComposer = () => {
    setTo([])
    setCc([])
    setShowCC(false)
    setSubject("")
    setBody(withSignature(signatureHtml))
    setTemplateId(null)
    setTemplateName(null)
    setSelectedAttachments([])
    setLinkedLeads([])
    setLinkedDeals([])
    setLinkedAccounts([])
    setCrmExpanded(false)
  }

  const openSignatureEditor = () => {
    setSignatureDraft(signatureHtml)
    setShowSignatureModal(true)
  }

  const handleSaveSignature = async () => {
    setSavingSignature(true)
    try {
      const res = await fetch("/api/settings/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureHtml: signatureDraft }),
      })
      if (!res.ok) throw new Error("Failed to save signature")

      // If the composer still only has the old (or no) signature block and
      // nothing else typed, swap it for the new one so the change is visible
      // immediately instead of waiting for the next fresh compose.
      setBody(prev => (prev === withSignature(signatureHtml) ? withSignature(signatureDraft) : prev))
      setSignatureHtml(signatureDraft)
      setShowSignatureModal(false)
    } catch (err) {
      console.error("Failed to save signature", err)
    } finally {
      setSavingSignature(false)
    }
  }

  const applyTemplate = (template: EmailTemplate) => {
    setSubject(template.subject)
    setBody(template.body_html)
    setTemplateId(template.id)
    setTemplateName(template.name)
    setShowTemplateModal(false)
  }

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", "other")
      const res = await fetch("/api/email/attachments", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setLibraryAttachments(prev => [data, ...prev])
      setSelectedAttachments(prev => [...prev, data])
    } catch (err: any) {
      setSendError(err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const toggleLibraryAttachment = (attachment: EmailAttachment) => {
    setSelectedAttachments(prev =>
      prev.some(a => a.id === attachment.id)
        ? prev.filter(a => a.id !== attachment.id)
        : [...prev, attachment]
    )
  }

  // Variable preview values
  const firstToContactMatch = to.length > 0 ? contactOptions.find(c => c.value === to[0].value) : null
  const prospectName = firstToContactMatch?.firstName || null
  const prospectCompany = linkedAccounts.length > 0 ? linkedAccounts[0].label : null

  const previewVars = {
    rep_name: currentUser.fullName,
    company_name: "Seisiun Analytics",
    prospect_name: prospectName || "",
    prospect_company: prospectCompany || "",
  }

  const canSend = outlookConnected && to.length > 0 && subject.trim() && stripHtml(body).length > 0 && !sending

  const missingFields: string[] = []
  if (to.length === 0) missingFields.push("a recipient (press Enter after typing an email)")
  if (!subject.trim()) missingFields.push("a subject")
  if (stripHtml(body).length === 0) missingFields.push("a body")

  const handleSend = async () => {
    setSendError(null)
    setSending(true)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toRecipients: to.map(t => ({ email: t.value, name: t.label !== t.value ? t.label : undefined, firstName: t.firstName })),
          ccRecipients: cc.map(t => ({ email: t.value })),
          subject,
          bodyHtml: body,
          templateId,
          templateName,
          attachmentIds: selectedAttachments.map(a => a.id),
          leadIds: linkedLeads.map(l => l.value),
          dealIds: linkedDeals.map(d => d.value),
          accountIds: linkedAccounts.map(a => a.value),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send email")

      setSuccessBanner("Email sent successfully")
      onSent()
      setTimeout(() => {
        resetComposer()
        setSuccessBanner(null)
      }, 3000)
    } catch (err: any) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  const attachmentsByCategory = ATTACHMENT_CATEGORIES.map(cat => ({
    ...cat,
    items: libraryAttachments.filter(a => a.category === cat.value),
  }))

  const modalTemplates = templateModalTab === "all"
    ? templates
    : templates.filter(t => t.industry === templateModalTab)

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left panel: composer */}
      <div className="lg:w-3/5 space-y-4">
        {!outlookConnected ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Connect your Outlook account in Settings to send emails.</span>
            </div>
            <Link href="/settings/profile" className="font-semibold underline shrink-0">Go to Settings</Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-xs">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">{outlookEmail}</span>
          </div>
        )}

        {successBanner && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0" />
            {successBanner}
          </div>
        )}
        {sendError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-xs text-red-800 dark:text-red-300">
            <AlertTriangle className="size-4 shrink-0" />
            {sendError}
          </div>
        )}

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div>
            <label className="text-3xs uppercase font-bold text-muted-foreground">To</label>
            <TagInput selected={to} onChange={setTo} options={contactOptions} allowFreeform placeholder="Type an email and press Enter..." maxItems={500} />
            {to.length > 5 && <p className="text-3xs text-muted-foreground mt-1">{to.length} recipients</p>}
            {!showCC && (
              <button type="button" onClick={() => setShowCC(true)} className="text-3xs text-(--primary) font-semibold mt-1 hover:underline">
                Add CC
              </button>
            )}
          </div>

          {showCC && (
            <div>
              <label className="text-3xs uppercase font-bold text-muted-foreground">CC</label>
              <TagInput selected={cc} onChange={setCc} allowFreeform placeholder="Type an email and press Enter..." />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={openSignatureEditor}
              className="flex-1 rounded border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted flex items-center justify-center gap-1.5"
            >
              <PenLine className="size-3.5" /> Signature
            </button>
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="flex-1 rounded border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Choose from Template
            </button>
          </div>

          <div>
            <label className="text-3xs uppercase font-bold text-muted-foreground">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded px-2.5 py-1.5 text-xs mt-1 bg-card"
              placeholder="Subject"
            />
          </div>

          <div>
            <label className="text-3xs uppercase font-bold text-muted-foreground">Body</label>
            <div className="mt-1">
              <RichTextEditor value={body} onChange={setBody} placeholder="Write your email..." vars={previewVars} />
            </div>
          </div>

          <div>
            <label className="text-3xs uppercase font-bold text-muted-foreground">Attachments</label>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowLibraryModal(true)}
                className="rounded border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-1.5"
              >
                <Library className="size-3.5" /> From Library
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-1.5 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Upload PDF
              </button>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUploadPdf} />
            </div>
            {selectedAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedAttachments.map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-3xs font-medium">
                    <Paperclip className="size-3" /> {a.file_name}
                    <button type="button" onClick={() => toggleLibraryAttachment(a)} className="hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setCrmExpanded(!crmExpanded)}
              className="flex items-center gap-1.5 text-3xs uppercase font-bold text-muted-foreground"
            >
              {crmExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              Link to CRM Records
            </button>
            {crmExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <div>
                  <label className="text-3xs text-muted-foreground">Link Leads</label>
                  <TagInput selected={linkedLeads} onChange={setLinkedLeads} options={leadOptions} placeholder="Search leads..." />
                </div>
                <div>
                  <label className="text-3xs text-muted-foreground">Link Deals</label>
                  <TagInput selected={linkedDeals} onChange={setLinkedDeals} options={dealOptions} placeholder="Search deals..." />
                </div>
                <div>
                  <label className="text-3xs text-muted-foreground">Link Accounts</label>
                  <TagInput selected={linkedAccounts} onChange={setLinkedAccounts} options={accountOptions} placeholder="Search accounts..." />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {outlookConnected && missingFields.length > 0 && !sending && (
              <p className="text-3xs text-muted-foreground">Add {missingFields.join(", ")} to send.</p>
            )}
            {!outlookConnected ? (
              <button
                type="button"
                disabled
                title="Connect Outlook in Settings"
                className="rounded bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground cursor-not-allowed"
              >
                Send via Outlook
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                title={missingFields.length > 0 ? `Add ${missingFields.join(", ")} to send.` : undefined}
                className="rounded bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50"
              >
                {sending && <Loader2 className="size-3.5 animate-spin" />}
                Send via Outlook
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right panel: variable preview */}
      <div className="lg:w-2/5 space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground mb-3">Template Variables</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <code className="text-teal-700 dark:text-teal-400">{"{{rep_name}}"}</code>
              <span className="font-medium">{currentUser.fullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <code className="text-teal-700 dark:text-teal-400">{"{{company_name}}"}</code>
              <span className="font-medium">Seisiun Analytics</span>
            </div>
            <div className="flex items-center justify-between">
              <code className="text-teal-700 dark:text-teal-400">{"{{prospect_name}}"}</code>
              <span className={prospectName ? "font-medium" : "text-muted-foreground italic"}>{prospectName || "Not matched"}</span>
            </div>
            <div className="flex items-center justify-between">
              <code className="text-teal-700 dark:text-teal-400">{"{{prospect_company}}"}</code>
              <span className={prospectCompany ? "font-medium" : "text-muted-foreground italic"}>{prospectCompany || "Not linked"}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPreviewModal(true)}
          className="w-full rounded border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center justify-center gap-1.5"
        >
          <Eye className="size-3.5" /> Preview Email
        </button>
      </div>

      {/* Template picker modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-bold">Choose from Template</h3>
              <button type="button" onClick={() => setShowTemplateModal(false)}><X className="size-4" /></button>
            </div>
            <div className="flex items-center gap-1 px-4 pt-3 border-b overflow-x-auto">
              {["all", ...INDUSTRIES].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTemplateModalTab(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t whitespace-nowrap ${templateModalTab === tab ? "border-b-2 border-(--primary) text-foreground" : "text-muted-foreground"}`}
                >
                  {tab === "all" ? "All" : INDUSTRY_LABELS[tab as keyof typeof INDUSTRY_LABELS]}
                </button>
              ))}
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
              {modalTemplates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="text-left rounded-lg border p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{t.name}</span>
                    <span
                      className="text-3xs font-semibold uppercase rounded-full px-2 py-0.5"
                      style={{ background: INDUSTRY_TOKENS[t.industry].bg, color: INDUSTRY_TOKENS[t.industry].text }}
                    >
                      {INDUSTRY_LABELS[t.industry]}
                    </span>
                  </div>
                  <p className="text-3xs text-muted-foreground mb-1">{t.subject}</p>
                  <p className="text-3xs text-muted-foreground line-clamp-2">{stripHtml(t.body_html)}</p>
                </button>
              ))}
              {modalTemplates.length === 0 && (
                <p className="text-xs text-muted-foreground col-span-2 text-center py-8">No templates in this industry.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attachment library modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-bold">Document Library</h3>
              <button type="button" onClick={() => setShowLibraryModal(false)}><X className="size-4" /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {attachmentsByCategory.map(cat => (
                cat.items.length > 0 && (
                  <div key={cat.value}>
                    <h4 className="text-3xs uppercase font-bold text-muted-foreground mb-1.5">{cat.label}</h4>
                    <div className="space-y-1">
                      {cat.items.map(a => {
                        const selected = selectedAttachments.some(s => s.id === a.id)
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => toggleLibraryAttachment(a)}
                            className={`w-full flex items-center justify-between text-left rounded px-3 py-2 text-xs hover:bg-muted ${selected ? "bg-muted" : ""}`}
                          >
                            <span className="flex items-center gap-2">
                              <Paperclip className="size-3.5 text-muted-foreground" />
                              {a.file_name}
                            </span>
                            <span className="text-3xs text-muted-foreground">
                              {(a.file_size / 1024 / 1024).toFixed(1)}MB · {new Date(a.created_at).toLocaleDateString()}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              ))}
              {libraryAttachments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No files in the library yet. Upload a PDF to get started.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signature editor modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-bold">Email Signature</h3>
              <button type="button" onClick={() => setShowSignatureModal(false)}><X className="size-4" /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              <p className="text-xs text-muted-foreground">
                Add your name, title, links, or a logo. This is automatically added to the bottom of every new email you compose.
              </p>
              <RichTextEditor value={signatureDraft} onChange={setSignatureDraft} placeholder="Your signature..." />
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t">
              <button type="button" onClick={() => setShowSignatureModal(false)} className="text-xs font-semibold text-muted-foreground hover:underline">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                disabled={savingSignature}
                className="rounded bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingSignature && <Loader2 className="size-3.5 animate-spin" />} Save Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-bold">Email Preview</h3>
              <button type="button" onClick={() => setShowPreviewModal(false)}><X className="size-4" /></button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p className="text-3xs uppercase font-bold text-muted-foreground mb-1">Subject</p>
              <p className="text-sm font-semibold mb-4">{substituteVariables(subject, previewVars) || "(no subject)"}</p>
              <p className="text-3xs uppercase font-bold text-muted-foreground mb-1">Body</p>
              <div
                className="prose prose-sm max-w-none text-xs"
                dangerouslySetInnerHTML={{ __html: substituteVariables(body, previewVars) || "<p class='text-muted-foreground'>(empty)</p>" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
