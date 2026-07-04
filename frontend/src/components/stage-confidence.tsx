"use client"

import * as React from "react"
import { BarChart3 } from "lucide-react"

export function StageConfidence() {
  const stages = [
    { name: "Qualified", confidence: 42 },
    { name: "Discovery", confidence: 51 },
    { name: "Proposal", confidence: 63 },
    { name: "Negotiation", confidence: 78 }
  ]

  const team = [
    { name: "Avery Jones", commit: "$168K", best: "$244K", coverage: "3.2x coverage" },
    { name: "Mina Patel", commit: "$126K", best: "$203K", coverage: "4.1x coverage" },
    { name: "Jordan Lee", commit: "$98K", best: "$174K", coverage: "2.1x coverage" }
  ]

  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Stage Confidence Section */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Stage confidence</h2>
            <p className="text-sm text-muted-foreground">Conversion quality by current pipeline stage.</p>
          </div>
          <BarChart3 className="size-5 text-muted-foreground/70" />
        </div>

        <div className="mt-5 grid gap-4">
          {stages.map((stage) => (
            <div key={stage.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{stage.name}</span>
                <span className="text-muted-foreground">{stage.confidence}% confidence</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-zinc-950 dark:bg-zinc-100 transition-all duration-500"
                  style={{ width: `${stage.confidence}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Forecast Section */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-foreground">Team forecast</h3>
        <div className="mt-3 rounded-md border bg-background overflow-hidden">
          {team.map((member) => (
            <div
              key={member.name}
              className="grid gap-2 border-b p-3 text-sm last:border-b-0 sm:grid-cols-4 items-center hover:bg-muted/30 transition-colors"
            >
              <span className="font-medium text-foreground">{member.name}</span>
              <span className="text-muted-foreground">Commit {member.commit}</span>
              <span className="text-muted-foreground">Best {member.best}</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium sm:text-right">
                {member.coverage}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
