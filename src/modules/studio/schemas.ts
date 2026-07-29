import { z } from "zod";

export const platformSchema = z.enum(["INSTAGRAM", "INSTAGRAM_STORY", "FACEBOOK", "LINKEDIN", "WHATSAPP", "SQUARE", "BANNER", "REEL", "SHORT_VIDEO"]);
export const campaignIdSchema = z.object({ campaignId: z.string().uuid() });

export const extractionSchema = campaignIdSchema.extend({
  rawInput: z.string().max(4000).optional(),
  sourceType: z.enum(["MANUAL", "PRODUCT", "MEDIA", "JOB_DESCRIPTION", "BUSINESS_DESCRIPTION"]).default("MANUAL"),
  sourceReferenceId: z.string().uuid().optional().or(z.literal("")),
});

export const approvalSchema = campaignIdSchema.extend({
  structuredDetailsJson: z.record(z.string(), z.unknown()),
  approved: z.coerce.boolean().default(true),
});

export const generationSchema = campaignIdSchema.extend({
  platforms: z.array(platformSchema).min(1).default(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP"]),
});

export const posterSchema = campaignIdSchema.extend({
  platform: platformSchema.default("INSTAGRAM"),
  template: z.enum(["recruitment_professional", "food_product", "retail_offer", "hospitality", "corporate_service"]).optional(),
  headline: z.string().max(120).optional(),
  supportingText: z.string().max(260).optional(),
  mediaAssetId: z.string().uuid().optional().or(z.literal("")),
});

export const storyboardSchema = campaignIdSchema.extend({
  targetDuration: z.enum(["10-15", "20-30", "30-60"]).optional(),
});

export const enhancementSchema = z.object({
  companyId: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  campaignId: z.string().uuid().optional().or(z.literal("")),
  operation: z.enum(["ENHANCE_ONLY", "APPLY_BRAND", "CONVERT_TO_POSTER", "RESIZE_FOR_PLATFORMS", "VIDEO_ENHANCE", "VIDEO_ASSEMBLE"]),
  platform: platformSchema.optional(),
});

export const placementSchema = z.object({
  companyId: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  campaignId: z.string().uuid().optional().or(z.literal("")),
  productId: z.string().uuid().optional().or(z.literal("")),
  placement: z.enum([
    "ORDERING_HOMEPAGE_HERO",
    "ORDERING_PROMOTIONAL_BANNER",
    "ORDERING_CATEGORY_BANNER",
    "ORDERING_PRODUCT_IMAGE",
    "ORDERING_SPECIAL_OFFER",
    "ORDERING_POPUP",
    "ORDER_CONFIRMATION_PROMOTION",
    "COMPANY_HOMEPAGE",
    "COMPANY_SERVICE_SECTION",
    "COMPANY_OFFER_SECTION",
    "COMPANY_PROFILE",
    "RECRUITMENT_HOMEPAGE_HIRING_BANNER",
    "RECRUITMENT_OPEN_ROLES",
    "RECRUITMENT_JOB_PAGE",
  ]),
  linkedTargetId: z.string().max(120).optional().or(z.literal("")),
  cta: z.string().max(120).optional().or(z.literal("")),
  destinationUrl: z.string().url().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().default(0),
  active: z.coerce.boolean().default(false),
});

export const exportSchema = campaignIdSchema.extend({
  platforms: z.array(platformSchema).min(1),
});

export const approvedMediaQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  mediaType: z.enum(["IMAGE", "POSTER", "BANNER", "REEL", "VIDEO", "LOGO", "DOCUMENT"]).optional(),
  platform: z.string().max(80).optional(),
  usageType: z.enum(["COMMERCE_HOMEPAGE_BANNER", "COMMERCE_PRODUCT_IMAGE", "COMMERCE_CATEGORY_BANNER", "COMMERCE_OFFER_BANNER", "COMMERCE_ORDER_CONFIRMATION_PROMOTION", "COMMERCE_WHATSAPP_PROMOTION", "GENERAL_MARKETING"]).optional(),
});
