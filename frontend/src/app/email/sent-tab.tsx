"use client"

import * as React from "react"
import { X, Loader2, Paperclip } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import type { SentEmail } from "./types"
import type { CurrentUser } from "./page"

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  sent: { bg: "var(--muted)", text: "var(--muted-foreground)" },
  failed: { bg: "var(--color-destructive)", text: "#ffffff" },
  replied: { bg: "var(--followup-safe)", text: "#ffffff" },
  draft: { bg: "var(--muted)", text: "var(--muted-foreground)" },
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export function SentTab({ currentUser }: { currentUser: CurrentUser }) {
  const isManagerOrAbove = currentUser.role === "super_admin" || currentUser.role === "manager"
  const [showAll, setShowAll] = React.useState(false)
  const [emails, setEmails] = React.useState<SentEmail[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<SentEmail | null>(null)
  const [leadNames, setLeadNames] = React.useState<Record<string, string>>({})
  const [dealNames, setDealNames] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    async function loadLookups() {
      try {
        const [leadsRes, dealsRes] = await Promise.all([fetch("/api/leads"), fetch("/api/deals")])
        if (leadsRes.ok) {
          const leads = await leadsRes.json()
          setLeadNames(Object.fromEntries((leads || []).map((l: any) => [l.id, l.opportunityName])))
        }
        if (dealsRes.ok) {
          const deals = await dealsRes.json()
          setDealNames(Object.fromEntries((deals || []).map((d: any) => [d.id, d.opportunity_name])))
        }
      } catch {
        // non-fatal
      }
    }
    loadLookups()
  }, [])

  React.useEffect(() => {
    async function loadEmails() {
      setLoading(true)
      try {
        const res = await fetch(`/api/email/sent${showAll ? "?all=true" : ""}`)
        if (res.ok) setEmails(await res.json())
      } finally {
        setLoading(false)
      }
    }
    loadEmails()
  }, [showAll])

  const linkedRecordsLabel = (email: SentEmail) => {
    const names = [
      ...email.lead_ids.map(id => leadNames[id]).filter(Boolean),
      ...email.deal_ids.map(id => dealNames[id]).filter(Boolean),
    ]
    return names.length > 0 ? names.join(", ") : "Standalone"
  }

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-3">
        {isManagerOrAbove && (
          <div className="flex justify-end">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              Show all reps
            </label>
          </div>
        )}

        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Linked Records</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8"><Loader2 className="size-4 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : emails.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">No emails sent yet.</TableCell></TableRow>
              ) : (
                emails.map(email => {
                  const first = email.to_recipients[0]
                  const style = STATUS_STYLES[email.status] || STATUS_STYLES.sent
                  return (
                    <TableRow key={email.id} className="cursor-pointer" onClick={() => setSelected(email)}>
                      <TableCell className="text-xs">
                        {first ? (
                          <>
                            {first.name || first.email}
                            {email.to_recipients.length > 1 && (
                              <span className="ml-1.5 text-3xs text-muted-foreground">+{email.to_recipients.length - 1} more</span>
                            )}
                          </>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{email.subject}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{email.template_name || "Custom"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{linkedRecordsLabel(email)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(email.sent_at)}</TableCell>
                      <TableCell>
                        <span
                          className="text-3xs font-semibold uppercase rounded-full px-2 py-0.5"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {email.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selected && (
        <div className="w-1/3 border-l bg-card p-6 h-[calc(100vh-var(--header-height)-3rem)] overflow-y-auto rounded-r-xl shadow-lg animate-slide-in shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">{selected.subject}</h3>
            <button type="button" onClick={() => setSelected(null)}><X className="size-4" /></button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-3xs uppercase font-bold text-muted-foreground">To</p>
              <p>{selected.to_recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(", ")}</p>
            </div>
            {selected.cc_recipients.length > 0 && (
              <div>
                <p className="text-3xs uppercase font-bold text-muted-foreground">CC</p>
                <p>{selected.cc_recipients.map(r => r.email).join(", ")}</p>
              </div>
            )}
            <div>
              <p className="text-3xs uppercase font-bold text-muted-foreground">Sent</p>
              <p>{formatDate(selected.sent_at)}</p>
            </div>
            <div>
              <p className="text-3xs uppercase font-bold text-muted-foreground">Status</p>
              <p className="capitalize">{selected.status}{selected.reply_received ? " · Replied" : ""}</p>
            </div>
            {selected.attachment_ids.length > 0 && (
              <div>
                <p className="text-3xs uppercase font-bold text-muted-foreground">Attachments</p>
                <p className="flex items-center gap-1"><Paperclip className="size-3.5" /> {selected.attachment_ids.length} file(s)</p>
              </div>
            )}
            {(selected.lead_ids.length > 0 || selected.deal_ids.length > 0) && (
              <div>
                <p className="text-3xs uppercase font-bold text-muted-foreground">Linked Records</p>
                <p>{linkedRecordsLabel(selected)}</p>
              </div>
            )}
            <div>
              <p className="text-3xs uppercase font-bold text-muted-foreground mb-1">Body</p>
              <div className="prose prose-sm max-w-none text-xs border rounded p-3 bg-background" dangerouslySetInnerHTML={{ __html: selected.body_html }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
