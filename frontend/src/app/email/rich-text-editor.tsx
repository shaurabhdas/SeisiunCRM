"use client"

import * as React from "react"
import { useEditor, EditorContent, Extension } from "@tiptap/react"
import type { CommandProps } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Loader2 } from "lucide-react"

const VARIABLE_PATTERN = /\{\{[a-zA-Z_]+\}\}/g

// Displays the resolved value in place of a {{variable}} token (e.g. the
// matched contact's first name instead of the literal token) without
// touching the underlying doc, so the token is still there if the
// recipient changes or the content is reused as a template. Falls back to
// today's highlighted-token look when nothing resolves yet.
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    variableHighlight: {
      setVariableHighlightVars: (vars: Record<string, string>) => ReturnType
    }
  }
  interface Storage {
    variableHighlight: { vars: Record<string, string> }
  }
}

const VariableHighlight = Extension.create<Record<string, never>, { vars: Record<string, string> }>({
  name: "variableHighlight",
  addStorage() {
    return { vars: {} }
  },
  addCommands() {
    return {
      setVariableHighlightVars:
        (vars: Record<string, string>) =>
        ({ editor, tr, dispatch }: CommandProps) => {
          editor.storage.variableHighlight.vars = vars
          if (dispatch) dispatch(tr)
          return true
        },
    }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("variableHighlight"),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = []
            const vars = this.storage.vars
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              for (const match of node.text.matchAll(VARIABLE_PATTERN)) {
                const start = pos + (match.index ?? 0)
                const end = start + match[0].length
                const key = match[0].slice(2, -2)
                const resolved = vars[key]
                if (resolved) {
                  decorations.push(Decoration.inline(start, end, { style: "display: none" }))
                  decorations.push(
                    Decoration.widget(
                      start,
                      () => {
                        const span = document.createElement("span")
                        span.className = "email-var-highlight"
                        span.textContent = resolved
                        span.contentEditable = "false"
                        return span
                      },
                      { side: 1, key: `var-${key}-${start}` }
                    )
                  )
                } else {
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: "email-var-highlight",
                    })
                  )
                }
              }
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-1.5 py-1 text-xs hover:bg-muted ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  vars,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  vars?: Record<string, string>
}) {
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ HTMLAttributes: { class: "max-w-full rounded" } }),
      VariableHighlight,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-40 text-xs text-foreground [&_.email-var-highlight]:bg-teal-100 [&_.email-var-highlight]:text-teal-800 [&_.email-var-highlight]:rounded [&_.email-var-highlight]:px-0.5 dark:[&_.email-var-highlight]:bg-teal-900/40 dark:[&_.email-var-highlight]:text-teal-300",
      },
    },
  })

  React.useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  React.useEffect(() => {
    // Re-resolves {{variable}} tokens already in the doc (e.g. after
    // picking a different To recipient) by re-running decorations, without
    // touching the underlying content.
    editor?.commands.setVariableHighlightVars(vars || {})
  }, [vars, editor])

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/email/images", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Image upload failed")
      editor.chain().focus().setImage({ src: data.url }).run()
    } catch (err) {
      console.error("Image upload failed", err)
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ""
    }
  }

  if (!editor) return null

  return (
    <div className="border rounded bg-card">
      <div className="flex items-center gap-0.5 border-b px-1.5 py-1">
        <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("URL")
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
        >
          <LinkIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Insert image"
          onClick={() => imageInputRef.current?.click()}
        >
          {uploadingImage ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
        </ToolbarButton>
        <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={handleImageFile} />
      </div>
      <div className="px-3 py-2" data-placeholder={placeholder}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
