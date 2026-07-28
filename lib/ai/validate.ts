import { SMS_MAX_CHARS, type SmsGenInput } from "./types";
import { firstName } from "./prompt";

const SPAM_WORDS =
  /\b(free|winner|congratulations|cash|prize|click|act now|limited time|buy now|discount|offer expires|guaranteed)\b/i;

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Heuristic spam gate: shouty caps, exclamation spam, or marketing words. */
function isSpammy(text: string): boolean {
  const exclamations = (text.match(/!/g) ?? []).length;
  if (exclamations > 1) return true;
  if (SPAM_WORDS.test(text)) return true;
  const shoutyWords = (text.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  if (shoutyWords >= 2) return true;
  return false;
}

/**
 * Enforce the hard requirements on candidate messages regardless of source:
 * ≤320 chars, contains the owner's name, not spammy — then dedupe. Candidates
 * that fail are dropped (the caller tops up from the template generator).
 */
export function filterVariations(
  candidates: string[],
  input: SmsGenInput,
): string[] {
  const owner = firstName(input.ownerName).toLowerCase();
  const fullOwner = input.ownerName.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];

  for (const candidate of candidates) {
    const text = normalize(candidate);
    if (!text || text.length > SMS_MAX_CHARS) continue;

    const lower = text.toLowerCase();
    if (owner && !lower.includes(owner) && !lower.includes(fullOwner)) continue;
    if (isSpammy(text)) continue;
    if (seen.has(lower)) continue;

    seen.add(lower);
    out.push(text);
  }

  return out;
}

/**
 * Extract a `variations` string array from a model response. Tolerates JSON
 * wrapped in prose or code fences, then falls back to line splitting.
 */
export function parseVariations(raw: string): string[] {
  const attempts: string[] = [];
  const trimmed = raw.trim();
  attempts.push(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) attempts.push(match[0]);

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as unknown;
      const arr = extractArray(parsed);
      if (arr) return arr;
    } catch {
      // try next
    }
  }

  // Last resort: non-empty lines, stripping list markers.
  return trimmed
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*\d.)\]]+)\s*/, "").trim())
    .filter(Boolean);
}

function extractArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (value && typeof value === "object" && "variations" in value) {
    const inner = (value as { variations: unknown }).variations;
    if (Array.isArray(inner)) {
      return inner.filter((v): v is string => typeof v === "string");
    }
  }
  return null;
}
