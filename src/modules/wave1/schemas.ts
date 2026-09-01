import { z } from "zod";

export const idSchema = z.string().uuid();
export const slugSchema = z.string().min(2).max(90).regex(/^[a-z0-9-]+$/);
export const moneySchema = z.coerce.number().min(0).max(999999);
export const boolSchema = z.coerce.boolean().default(false);
export const optionalText = (max = 500) => z.string().trim().max(max).optional().or(z.literal(""));

export const brandProfileSchema = z.object({
  companyId: idSchema,
  tagline: optionalText(180),
  logoPath: optionalText(500),
  secondaryLogoPath: optionalText(500),
  lightLogoPath: optionalText(500),
  darkLogoPath: optionalText(500),
  faviconPath: optionalText(500),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#14b8a6"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f97316"),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#111827"),
  headingFont: z.string().max(80).default("Inter"),
  bodyFont: z.string().max(80).default("Inter"),
  brandTone: optionalText(120),
  approvedKeywordsJson: z.array(z.string().max(80)).default([]).optional(),
  restrictedWordsJson: z.array(z.string().max(80)).default([]).optional(),
  visualStyle: optionalText(120),
  preferredImageStyle: optionalText(120),
  preferredVideoStyle: optionalText(120),
  defaultCallToAction: optionalText(120),
  ctaStyle: optionalText(120),
  instagramHandle: optionalText(120),
  facebookPage: optionalText(200),
  linkedinPage: optionalText(200),
  whatsappNumber: optionalText(40),
  approvalStatus: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"]).default("DRAFT"),
});

export const categorySchema = z.object({
  companyId: idSchema,
  name: z.string().min(2).max(120),
  slug: slugSchema,
  description: optionalText(500),
  imagePath: optionalText(500),
  displayOrder: z.coerce.number().int().default(0),
  active: z.coerce.boolean().default(true),
});

export const productSchema = z.object({
  companyId: idSchema,
  categoryId: idSchema.optional().or(z.literal("")),
  name: z.string().min(2).max(140),
  slug: slugSchema,
  shortDescription: optionalText(220),
  description: optionalText(1200),
  regularPrice: moneySchema,
  promotionalPrice: moneySchema.optional().or(z.literal("")),
  imagePath: optionalText(500),
  vegetarian: z.coerce.boolean().default(false),
  dietaryClassification: z.enum(["VEG", "NON_VEG"]).optional().or(z.literal("")),
  available: z.coerce.boolean().default(true),
  inventoryMode: z.enum(["TRACK_QUANTITY", "AVAILABILITY_ONLY", "ALWAYS_AVAILABLE"]).default("ALWAYS_AVAILABLE").optional(),
  inventoryQuantity: z.coerce.number().int().min(0).max(999999).optional().or(z.literal("")),
  lowStockThreshold: z.coerce.number().int().min(0).max(999999).optional().or(z.literal("")),
  featured: z.coerce.boolean().default(false),
  preparationMinutes: z.coerce.number().int().min(0).max(600).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().default(0),
});

export const deliveryZoneSchema = z.object({
  companyId: idSchema,
  name: z.string().min(2).max(120),
  radiusKm: z.coerce.number().min(0.1).max(500),
  deliveryCharge: moneySchema,
  minimumOrderAmount: moneySchema,
  active: z.coerce.boolean().default(true),
});

export const operatingHoursSchema = z.object({
  companyId: idSchema,
  days: z.array(
    z.object({
      dayOfWeek: z.coerce.number().int().min(0).max(6),
      openTime: z.string().regex(/^\d{2}:\d{2}$/),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/),
      closed: z.coerce.boolean().default(false),
    }),
  ),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "PREPARING", "READY", "RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "PAYMENT_COLLECTED", "COMPLETED", "CANCELLED"]),
  note: optionalText(500),
  reason: optionalText(500),
  riderId: idSchema.optional().or(z.literal("")),
  paymentStatus: z.enum(["PENDING", "COLLECTED", "FAILED", "REFUNDED", "NOT_REQUIRED"]).optional(),
  paymentMethod: z.enum(["CASH_ON_DELIVERY", "CARD_ON_DELIVERY", "CASH_ON_PICKUP", "CARD_ON_PICKUP", "ONLINE", "PICKUP_PAYMENT"]).optional(),
  amountCollected: moneySchema.optional().or(z.literal("")),
  paymentCollectedBy: optionalText(120),
  paymentNotes: optionalText(500),
});

export const checkoutSchema = z.object({
  orderingSlug: slugSchema,
  customer: z.object({
    name: z.string().min(2).max(120),
    mobile: z.string().min(6).max(40),
    email: z.string().email().optional().or(z.literal("")),
    marketingConsent: z.coerce.boolean().default(false),
    whatsappOperationalConsent: z.coerce.boolean().default(false),
  }),
  address: z.object({
    doorOrFlatNumber: z.string().min(1).max(80),
    buildingName: z.string().min(1).max(120),
    area: z.string().min(1).max(120),
    city: z.string().min(1).max(120),
    landmark: optionalText(160),
    latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
    longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
    deliveryInstructions: optionalText(500),
  }),
  fulfilmentType: z.enum(["DELIVERY", "PICKUP"]),
  paymentMethod: z.enum(["CASH_ON_DELIVERY", "CARD_ON_DELIVERY", "CASH_ON_PICKUP", "CARD_ON_PICKUP", "ONLINE", "PICKUP_PAYMENT"]),
  promotionCode: optionalText(40),
  idempotencyKey: z.string().min(8).max(120).optional(),
  specialInstructions: optionalText(500),
  items: z.array(z.object({
    productId: idSchema,
    quantity: z.coerce.number().int().min(1).max(99),
    variantId: idSchema.optional().or(z.literal("")),
    addOnIds: z.array(idSchema).default([]).optional(),
    instructions: optionalText(300),
  })).min(1),
  source: z.enum(["CUSTOMER_PWA", "MANUAL_WHATSAPP", "MANUAL_PHONE", "ADMIN"]).default("CUSTOMER_PWA"),
});

export const campaignSchema = z.object({
  companyId: idSchema,
  productId: idSchema.optional().or(z.literal("")),
  name: z.string().min(2).max(160),
  campaignType: z.enum(["RECRUITMENT", "PRODUCT", "MENU_ITEM", "SERVICE", "OFFER", "EVENT", "ANNOUNCEMENT", "COMPANY_PROFILE"]),
  objective: optionalText(500),
  inputText: optionalText(1500),
  selectedPlatformsJson: z.array(z.string()).default([]),
});

export const mediaStatusSchema = z.object({
  approvalStatus: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]),
  approvedBy: optionalText(120),
  approvalNotes: optionalText(500),
  usageType: z.enum(["COMMERCE_HOMEPAGE_BANNER", "COMMERCE_PRODUCT_IMAGE", "COMMERCE_CATEGORY_BANNER", "COMMERCE_OFFER_BANNER", "COMMERCE_ORDER_CONFIRMATION_PROMOTION", "COMMERCE_WHATSAPP_PROMOTION", "GENERAL_MARKETING"]).default("GENERAL_MARKETING").optional(),
});
