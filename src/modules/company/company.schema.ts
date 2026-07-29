import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(3, "Company name is required"),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Slug can contain only lowercase letters, numbers and hyphens"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export type CreateCompanyDto = z.infer<typeof createCompanySchema>;