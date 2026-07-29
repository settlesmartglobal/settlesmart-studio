import { z } from "zod";

export const businessTypes = [
  "RESTAURANT",
  "GROCERY",
  "HOTEL",
  "RECRUITMENT_AGENCY",
  "MANPOWER_CONSULTANCY",
  "HR_CONSULTANCY",
  "CLINIC",
  "RETAIL",
  "EDUCATION",
  "SERVICE_BUSINESS",
  "OTHER",
] as const;

const optionalText = (max = 255) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const createCompanySchema = z.object({
  name: z.string().min(3, "Company name is required"),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Slug can contain only lowercase letters, numbers and hyphens"),
  businessType: z.enum(businessTypes).default("OTHER"),
  industry: optionalText(120),
  description: optionalText(1200),
  targetAudience: optionalText(500),
  productsSummary: optionalText(800),
  brandPersonality: optionalText(300),
  preferredLanguage: optionalText(80),
  country: optionalText(80),
  city: optionalText(80),
  address: optionalText(400),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  orderingSlug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Ordering slug can contain only lowercase letters, numbers and hyphens")
    .optional()
    .or(z.literal("")),
  commerceEnabled: z.coerce.boolean().default(false),
  studioEnabled: z.coerce.boolean().default(true),
  recruitmentEnabled: z.coerce.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const updateCompanySchema = createCompanySchema.partial().extend({
  id: z.string().uuid().optional(),
});

export type CreateCompanyDto = z.infer<typeof createCompanySchema>;
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;
