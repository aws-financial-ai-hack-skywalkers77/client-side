export type RiskBand = "good" | "low" | "medium" | "high" | "unknown"

/** Infer UI band from numeric risk % (when server does not send risk_tier). */
export function getRiskLevelFromPercentage(
  percentage: number | null | undefined,
): { level: Exclude<RiskBand, "unknown">; label: string } {
  if (percentage === null || percentage === undefined || percentage === 0) {
    return { level: "good", label: "Good" }
  }
  if (percentage <= 30) {
    return { level: "low", label: "Low" }
  }
  if (percentage <= 70) {
    return { level: "medium", label: "Medium" }
  }
  return { level: "high", label: "High" }
}

function normalizeTierToken(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, "_")
}

/** Map non-standard API strings to UI band (legacy / verbose tiers). */
export function riskLevelFromTierString(
  tier: string | null | undefined,
): Exclude<RiskBand, "unknown"> | null {
  if (!tier?.trim()) return null
  const n = normalizeTierToken(tier)
  if (n.includes("critical") || n.includes("severe") || n === "high") return "high"
  if (n.includes("medium") || n.includes("moderate") || n === "med") return "medium"
  if (n.includes("low") && !n.includes("below")) return "low"
  if (n.includes("good") || n.includes("minimal") || n.includes("negligible") || n === "none") {
    return "good"
  }
  if (n.includes("high")) return "high"
  if (n.includes("medium")) return "medium"
  if (n.includes("low")) return "low"
  return null
}

export function formatTierLabel(tier: string): string {
  const t = tier.trim()
  if (!t) return ""
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

type RiskFields = {
  risk_tier?: string | null
  risk_percentage?: number | null
}

/**
 * Prefer analyze `risk_tier`: "high" | "medium" | "low" | "unknown";
 * else legacy strings; else percentage buckets.
 */
export function resolveRiskDisplay(fields: RiskFields): {
  level: RiskBand
  label: string
  fromTier: boolean
} {
  const raw = fields.risk_tier?.trim().toLowerCase()
  if (raw === "high") return { level: "high", label: "High", fromTier: true }
  if (raw === "medium") return { level: "medium", label: "Medium", fromTier: true }
  if (raw === "low") return { level: "low", label: "Low", fromTier: true }
  if (raw === "unknown") return { level: "unknown", label: "Unknown", fromTier: true }

  const fromTier = riskLevelFromTierString(fields.risk_tier)
  if (fields.risk_tier?.trim() && fromTier) {
    return { level: fromTier, label: formatTierLabel(fields.risk_tier), fromTier: true }
  }
  if (fields.risk_tier?.trim()) {
    return { level: "unknown", label: formatTierLabel(fields.risk_tier), fromTier: true }
  }
  const pct = getRiskLevelFromPercentage(fields.risk_percentage)
  return { level: pct.level, label: pct.label, fromTier: false }
}

/** Optional display as a plain number (analyze response). */
export function formatRiskAssessmentScoreRaw(score: number | null | undefined): string | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null
  return String(score)
}

export function formatRiskAssessmentScore(score: number | null | undefined): string | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null
  if (score >= 0 && score <= 1) {
    return `${(score * 100).toFixed(1)}%`
  }
  return score.toFixed(2)
}

export function riskBadgeClasses(level: RiskBand): string {
  switch (level) {
    case "good":
      return "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
    case "low":
      return "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
    case "medium":
      return "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
    case "high":
      return "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
    case "unknown":
      return "bg-slate-100 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  }
}
