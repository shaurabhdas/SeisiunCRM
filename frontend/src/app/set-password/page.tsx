'use client'

import * as React from 'react'
import { CircleGauge } from 'lucide-react'
import { setPassword } from './actions'

export default function SetPasswordPage() {
  const [error, setError] = React.useState('')
  const [isPending, startTransition] = React.useTransition()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      try {
        const result = await setPassword(formData)
        if (result && result.error) {
          setError(result.error)
        }
      } catch (err) {
        setError('An unexpected error occurred. Please try again.')
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo and Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CircleGauge className="size-6" />
            </div>
            <span className="font-semibold text-2xl tracking-tight text-foreground">Seisiun CRM</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Sales pipeline management for Seisiun Analytics
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-foreground">Set your password</h1>
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              Choose a password to complete your account setup. You will use this to sign in from now on.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none text-foreground">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm_password" className="text-sm font-medium leading-none text-foreground">
                Confirm Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                placeholder="••••••••"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mt-2 cursor-pointer"
            >
              {isPending ? 'Setting password...' : 'Set Password and Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
