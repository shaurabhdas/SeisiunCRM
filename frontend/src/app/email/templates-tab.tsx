"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, X, Eye, Loader2 } from "lucide-react"
import { RichTextEditor } from "./rich-text-editor"
import { INDUSTRIES, INDUSTRY_LABELS, INDUSTRY_TOKENS, stripHtml, substituteVariables } from "./industry"
import type { EmailTemplate } from "./types"
import type { CurrentUser } from "./page"

const SAMPLE_VARS = {
  rep_name: "Sarah Chen",
  company_name: "Seisiun Analytics",
  prospect_name: "Alex Rivera",
  prospect_company: "Acme Corporation",
}

const VARIABLES_REFERENCE = [
  { key: "rep_name", description: "Your full name from your account" },
  { key: "company_name", description: "Always \"Seisiun Analytics\"" },
  { key: "prospect_name", description: "The first To recipient's name, if matched to a CRM contact" },
  { key: "prospect_company", description: "The linked account's name, if a CRM record is linked" },
]

type EditorState = {
  id: string | null
  name: string
  industry: string
  subject: string
  bodyHtml: string
}

const blankEditorState: EditorState = { id: null, name: "", industry: "retail", subject: "", bodyHtml: "" }

export function TemplatesTab({ currentUser }: { currentUser: CurrentUser }) {
  const canManage = currentUser.role === "super_admin" || currentUser.role === "manager"
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editorState, setEditorState] = React.useState<EditorState | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<EmailTemplate | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadTemplates = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/email/templates")
      if (res.ok) setTemplates(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const grouped = INDUSTRIES.map(industry => ({
    industry,
    items: templates.filter(t => t.industry === industry),
  })).filter(g => g.items.length > 0)

  const handleSave = async () => {
    if (!editorState) return
    setSaving(true)
    setError(null)
    try {
      const isEdit = !!editorState.id
      const res = await fetch(isEdit ? `/api/email/templates/${editorState.id}` : "/api/email/templates", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editorState.name,
          industry: editorState.industry,
          subject: editorState.subject,
          bodyHtml: editorState.bodyHtml,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save template")
      setEditorState(null)
      await loadTemplates()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/email/templates/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete template")
      }
      setDeleteTarget(null)
      await loadTemplates()
    } catch (err: any) {
      setError(err.message)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-xs text-muted-foreground gap-2"><Loader2 className="size-4 animate-spin" />Loading templates...</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-xs text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEditorState(blankEditorState)}
            className="rounded bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 flex items-center gap-1.5"
          >
            <Plus className="size-3.5" /> New Template
          </button>
        </div>
      )}

      {grouped.map(group => (
        <div key={group.industry}>
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground mb-2">{INDUSTRY_LABELS[group.industry]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map(t => (
              <div key={t.id} className="rounded-lg border bg-card p-4 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold">{t.name}</span>
                  <span
                    className="text-3xs font-semibold uppercase rounded-full px-2 py-0.5 shrink-0"
                    style={{ background: INDUSTRY_TOKENS[t.industry].bg, color: INDUSTRY_TOKENS[t.industry].text }}
                  >
                    {INDUSTRY_LABELS[t.industry]}
                  </span>
                </div>
                <p className="text-3xs text-muted-foreground mb-1">{t.subject}</p>
                <p className="text-3xs text-muted-foreground line-clamp-2 flex-1">{stripHtml(t.body_html)}</p>
                {canManage && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setEditorState({ id: t.id, name: t.name, industry: t.industry, subject: t.subject, bodyHtml: t.body_html })}
                      className="flex items-center gap-1 text-3xs font-semibold text-foreground hover:underline"
                    >
                      <Pencil className="size-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(t)}
                      className="flex items-center gap-1 text-3xs font-semibold text-destructive hover:underline"
                    >
                      <Trash2 className="size-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-12">No templates yet.</p>
      )}

      {/* Full-page New/Edit Template overlay */}
      {editorState && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
          <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
            <h2 className="text-sm font-bold">{editorState.id ? "Edit Template" : "New Template"}</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditorState(null)} className="rounded border px-4 py-2 text-xs font-semibold hover:bg-muted">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !editorState.name || !editorState.subject || !editorState.bodyHtml}
                className="rounded bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />} Save
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex">
            <div className="flex-1 max-w-3xl mx-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-3xs uppercase font-bold text-muted-foreground">Template Name</label>
                  <input
                    type="text"
                    value={editorState.name}
                    onChange={(e) => setEditorState({ ...editorState, name: e.target.value })}
                    className="w-full border rounded px-2.5 py-1.5 text-xs mt-1 bg-card"
                  />
                </div>
                <div>
                  <label className="text-3xs uppercase font-bold text-muted-foreground">Industry</label>
                  <select
                    value={editorState.industry}
                    onChange={(e) => setEditorState({ ...editorState, industry: e.target.value })}
                    className="w-full border rounded px-2.5 py-1.5 text-xs mt-1 bg-card"
                  >
                    {INDUSTRIES.filter(i => i !== "general").map(i => (
                      <option key={i} value={i}>{INDUSTRY_LABELS[i]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-3xs uppercase font-bold text-muted-foreground">Subject</label>
                <input
                  type="text"
                  value={editorState.subject}
                  onChange={(e) => setEditorState({ ...editorState, subject: e.target.value })}
                  className="w-full border rounded px-2.5 py-1.5 text-xs mt-1 bg-card"
                />
              </div>

              <div>
                <label className="text-3xs uppercase font-bold text-muted-foreground">Body</label>
                <div className="mt-1">
                  <RichTextEditor value={editorState.bodyHtml} onChange={(html) => setEditorState({ ...editorState, bodyHtml: html })} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="rounded border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-1.5"
              >
                <Eye className="size-3.5" /> Preview
              </button>
            </div>

            <div className="w-64 border-l p-6 shrink-0 hidden lg:block">
              <h3 className="text-3xs uppercase font-bold text-muted-foreground mb-3">Variables Reference</h3>
              <div className="space-y-3">
                {VARIABLES_REFERENCE.map(v => (
                  <div key={v.key}>
                    <code className="text-xs text-teal-700 dark:text-teal-400">{`{{${v.key}}}`}</code>
                    <p className="text-3xs text-muted-foreground mt-0.5">{v.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && editorState && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-bold">Template Preview</h3>
              <button type="button" onClick={() => setShowPreview(false)}><X className="size-4" /></button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p className="text-3xs uppercase font-bold text-muted-foreground mb-1">Subject</p>
              <p className="text-sm font-semibold mb-4">{substituteVariables(editorState.subject, SAMPLE_VARS)}</p>
              <p className="text-3xs uppercase font-bold text-muted-foreground mb-1">Body</p>
              <div
                className="prose prose-sm max-w-none text-xs"
                dangerouslySetInnerHTML={{ __html: substituteVariables(editorState.bodyHtml, SAMPLE_VARS) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-sm font-bold mb-2">Delete this template?</h3>
            <p className="text-xs text-muted-foreground mb-5">Emails already sent using this template will not be affected.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded border px-4 py-2 text-xs font-semibold hover:bg-muted">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting && <Loader2 className="size-3.5 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
