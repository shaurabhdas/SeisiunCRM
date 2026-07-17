"use client"

import * as React from "react"
import { CircleGauge } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const router = useRouter()

  const [checking, setChecking] = React.useState(true)
  const [setupRequired, setSetupRequired] = React.useState(false)

  const [form, setForm] = React.useState({
    secret: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [serverError, setServerError] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  /* ── Check setup state on mount ── */
  React.useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/setup")
        const data = await res.json()
        if (!data.setupRequired) {
          router.replace("/login")
          return
        }
        setSetupRequired(true)
      } catch {
        // If check fails, show the form so the user can try
        setSetupRequired(true)
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [router])

  /* ── Client-side validation ── */
  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (!form.secret.trim()) errors.secret = "Setup secret is required."
    if (!form.fullName.trim()) errors.fullName = "Full name is required."
    if (!form.email.trim()) errors.email = "Email address is required."
    if (!form.password) {
      errors.password = "Password is required."
    } else if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters."
    } else if (!/[A-Z]/.test(form.password)) {
      errors.password = "Password must contain at least one uppercase letter."
    } else if (!/[0-9]/.test(form.password)) {
      errors.password = "Password must contain at least one number."
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = "Please confirm your password."
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match."
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError("")

    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: form.secret,
          email: form.email,
          password: form.password,
          fullName: form.fullName,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setServerError(data.error || "An unexpected error occurred.")
        return
      }

      setSuccessMessage("Admin account created successfully. Redirecting to sign in…")
      setTimeout(() => router.push("/login"), 2000)
    } catch {
      setServerError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <p className="text-sm text-muted-foreground">Checking setup status…</p>
      </div>
    )
  }

  if (!setupRequired) {
    return null // redirecting
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-[420px] space-y-6">

        {/* Logo and title */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <div className="flex aspect-square size-10 items-center justify-center overflow-hidden rounded-lg">
              <img src="/seisiun-logo.png" alt="Seisiun Logo" className="size-full object-cover" />
            </div>
            <span className="font-semibold text-2xl tracking-tight text-foreground">Seisiun CRM</span>
          </div>
          <div className="mt-2 space-y-1">
            <h1 className="text-xl font-bold text-foreground">Welcome to Seisiun CRM</h1>
            <p className="text-sm text-muted-foreground">Set up your administrator account to get started.</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {successMessage ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100">
                <svg className="size-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Setup Secret */}
              <div className="space-y-1.5">
                <label htmlFor="secret" className="text-sm font-medium text-foreground">
                  Setup Secret <span className="text-destructive">*</span>
                </label>
                <input
                  id="secret"
                  type="password"
                  placeholder="Enter setup secret…"
                  value={form.secret}
                  onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground">Enter the setup secret provided by your system administrator.</p>
                {fieldErrors.secret && <p className="text-xs text-destructive">{fieldErrors.secret}</p>}
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className={inputClass}
                />
                {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                />
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password <span className="text-destructive">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters, one uppercase letter, one number.</p>
                {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password <span className="text-destructive">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className={inputClass}
                />
                {fieldErrors.confirmPassword && <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
              </div>

              {/* Server error */}
              {serverError && (
                <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2">
                  <p className="text-sm text-destructive">{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Creating account…" : "Create Admin Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
