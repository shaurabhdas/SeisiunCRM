"use client"

import { CheckCircle2, Clock } from "lucide-react"

type PendingApprovalBannerProps = {
  pendingTransition: any
  requestedByName: string | null
  isManager: boolean
  onApprove: () => void
  approving: boolean
}

function describeTarget(pendingTransition: any): string {
  if (pendingTransition?.toStage) {
    const stage = String(pendingTransition.toStage)
    return stage.charAt(0).toUpperCase() + stage.slice(1)
  }
  if (pendingTransition?.reason) return 'Disqualified'
  return 'the next stage'
}

export function PendingApprovalBanner({ pendingTransition, requestedByName, isManager, onApprove, approving }: PendingApprovalBannerProps) {
  const targetLabel = describeTarget(pendingTransition)

  return (
    <div className="flex-1 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-2.5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
        <Clock className="size-3.5 shrink-0" />
        Awaiting approval to move to {targetLabel}
      </div>
      {requestedByName && (
        <p className="text-3xs text-amber-700 dark:text-amber-400">Requested by {requestedByName}</p>
      )}
      {isManager ? (
        <button
          type="button"
          onClick={onApprove}
          disabled={approving}
          className="w-full rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="size-3.5" />
          {approving ? 'Approving…' : 'Approve'}
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="w-full rounded-md bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 px-4 py-1.5 text-xs font-semibold cursor-not-allowed"
        >
          Submitted for approval
        </button>
      )}
    </div>
  )
}
