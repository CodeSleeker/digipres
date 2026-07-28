import { z } from "zod";
import { SMS_LANGUAGES, SMS_TONES } from "@/lib/ai/types";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const generateSmsSchema = z.object({
  businessType: z.string().trim().min(1, "Business type is required.").max(80),
  ownerName: z.string().trim().min(1, "Owner name is required.").max(80),
  businessName: z.string().trim().min(1, "Business name is required.").max(120),
  customerName: z.string().trim().min(1, "Customer name is required.").max(80),
  service: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  tone: z.enum(SMS_TONES),
  language: z.enum(SMS_LANGUAGES),
  count: z.coerce.number().int().min(1).max(5).catch(3).default(3),
});

export type GenerateSmsInput = z.infer<typeof generateSmsSchema>;
