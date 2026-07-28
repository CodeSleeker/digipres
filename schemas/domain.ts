import { z } from "zod";
import {
  isValidHostname,
  normalizeHostname,
} from "@/repositories/domain-repository";

/**
 * Validation for connecting a custom domain. Normalizes first (people paste
 * "https://example.com/"), then enforces the same hostname shape as the
 * database CHECK in migration 0010.
 */
export const addDomainSchema = z.object({
  hostname: z
    .string()
    .trim()
    .min(1, "Domain is required.")
    .max(253)
    .transform(normalizeHostname)
    .refine(isValidHostname, "Enter a valid domain, e.g. roniesbarber.com."),
});

export type AddDomainInput = z.infer<typeof addDomainSchema>;
