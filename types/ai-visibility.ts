/** Outcome of a single checklist item. `info` = manual review, unscored. */
export type CheckStatus = "pass" | "warn" | "fail" | "info";

export type CheckCategory =
  | "structured-data"
  | "metadata"
  | "crawlability"
  | "content"
  | "media"
  | "technical";

/**
 * Headings for the checklist, written for the person reading it.
 *
 * The keys stay technical because they are code; the labels are what a business
 * owner sees in their dashboard, and "Crawlability" tells them nothing about
 * what the section is for.
 */
export const CATEGORY_LABEL: Record<CheckCategory, string> = {
  "structured-data": "What search engines and AI can read",
  metadata: "How you look in search and shared links",
  crawlability: "Being found at all",
  content: "Your content",
  media: "Your photos",
  technical: "Under the hood",
};

export const CATEGORY_ORDER: CheckCategory[] = [
  "structured-data",
  "metadata",
  "crawlability",
  "content",
  "media",
  "technical",
];

export interface VisibilityCheck {
  id: string;
  label: string;
  category: CheckCategory;
  status: CheckStatus;
  /** Scoring weight; 0 for `info` (manual) items so they don't affect the score. */
  weight: number;
  /** What the analyzer detected in the current site/data. */
  finding: string;
  /** The recommended action (advice only — never a ranking guarantee). */
  recommendation: string;
}

export interface VisibilityReport {
  hasBusiness: boolean;
  /** AI Readiness Score, 0–100 (weighted; excludes manual `info` items). */
  score: number;
  grade: string;
  gradeLabel: string;
  passCount: number;
  warnCount: number;
  failCount: number;
  infoCount: number;
  checks: VisibilityCheck[];
}
