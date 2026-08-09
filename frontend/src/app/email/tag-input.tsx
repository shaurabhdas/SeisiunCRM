"use client"

import * as React from "react"
import { X } from "lucide-react"

export type TagOption = {
  label: string
  value: string
  sublabel?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function TagInput({
  selected,
  onChange,
  options = [],
  placeholder,
  allowFreeform = false,
  maxItems,
}: {
  selected: TagOption[]
  onChange: (next: TagOption[]) => void
  options?: TagOption[]
  placeholder?: string
  allowFreeform?: boolean
  maxItems?: number
}) {
  const [query, setQuery] = React.useState("")
  const [showDropdown, setShowDropdown] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const queryRef = React.useRef("")

  const selectedValues = new Set(selected.map(s => s.value))
  const filteredOptions = options.filter(
    o =>
      o.label &&
      o.value &&
      !selectedValues.has(o.value) &&
      query.trim().length > 0 &&
      (o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.value.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8)

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const addTag = (tag: TagOption) => {
    if (maxItems && selected.length >= maxItems) return
    if (selectedValues.has(tag.value)) return
    onChange([...selected, tag])
    setQuery("")
    queryRef.current = ""
    setShowDropdown(false)
  }

  const removeTag = (value: string) => {
    onChange(selected.filter(s => s.value !== value))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && allowFreeform) {
      e.preventDefault()
      const trimmed = query.trim().replace(/,$/, "")
      if (trimmed && EMAIL_PATTERN.test(trimmed)) {
        addTag({ label: trimmed, value: trimmed })
      }
    } else if (e.key === "Backspace" && !query && selected.length > 0) {
      removeTag(selected[selected.length - 1].value)
    }
  }

  const handleBlur = () => {
    // Delay so a dropdown option's onClick (which also blurs the input) can run first.
    setTimeout(() => {
      const trimmed = queryRef.current.trim()
      if (allowFreeform && trimmed && EMAIL_PATTERN.test(trimmed)) {
        addTag({ label: trimmed, value: trimmed })
      }
      setShowDropdown(false)
    }, 150)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 border rounded bg-card px-2 py-1.5 min-h-9">
        {selected.map(tag => (
          <span
            key={tag.value}
            className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-3xs font-medium text-foreground"
          >
            {tag.label}
            <button type="button" onClick={() => removeTag(tag.value)} className="hover:text-destructive">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            queryRef.current = e.target.value
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-24 bg-transparent text-xs outline-none py-0.5"
        />
      </div>

      {showDropdown && filteredOptions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-md max-h-48 overflow-y-auto z-50">
          {filteredOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => addTag(opt)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted"
            >
              <div className="font-medium">{opt.label}</div>
              {opt.sublabel && <div className="text-3xs text-muted-foreground">{opt.sublabel}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
