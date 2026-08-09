export const INDUSTRIES = ["retail", "banking", "insurance", "energy", "logistics", "general"] as const
export type Industry = (typeof INDUSTRIES)[number]

export const INDUSTRY_LABELS: Record<Industry, string> = {
  retail: "Retail",
  banking: "Banking",
  insurance: "Insurance",
  energy: "Energy",
  logistics: "Logistics",
  general: "General",
}

export const INDUSTRY_TOKENS: Record<Industry, { bg: string; text: string }> = {
  retail: { bg: "var(--industry-retail-bg)", text: "var(--industry-retail-text)" },
  banking: { bg: "var(--industry-banking-bg)", text: "var(--industry-banking-text)" },
  insurance: { bg: "var(--industry-insurance-bg)", text: "var(--industry-insurance-text)" },
  energy: { bg: "var(--industry-energy-bg)", text: "var(--industry-energy-text)" },
  logistics: { bg: "var(--industry-logistics-bg)", text: "var(--industry-logistics-text)" },
  general: { bg: "var(--industry-general-bg)", text: "var(--industry-general-text)" },
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

export function substituteVariables(html: string, vars: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value || "")
  }
  return result
}
