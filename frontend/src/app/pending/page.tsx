import { Hourglass } from 'lucide-react'
import { signOut } from '../login/actions'

export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-[440px] rounded-xl border border-border bg-card p-6 shadow-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex aspect-square size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Hourglass className="size-6 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Account pending activation
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You have successfully signed in. Your account is being reviewed by the administrator.
            You will receive access once your role has been assigned.
          </p>
        </div>

        <form action={signOut} className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
