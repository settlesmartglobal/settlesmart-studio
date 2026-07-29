import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const products = [
  ["SettleSmart Career™", "AI-powered career discovery, resume, interview and growth guidance.", "ACTIVE"],
  ["SettleSmart HROps™", "Practical HR operations workflows for modern teams and consultancies.", "ACTIVE"],
  ["SettleSmart Studio™", "AI-Powered Marketing & Brand Operations Platform.", "ACTIVE"],
  ["SettleSmart Recruit™", "Coming soon recruitment workspace for sourcing and hiring operations.", "COMING_SOON"],
  ["SettleSmart Commerce™", "Coming soon commerce product for ordering and business operations.", "COMING_SOON"],
];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Seed is disabled in production");

  const company = await prisma.company.upsert({
    where: { slug: "settlesmart-works" },
    update: {
      name: "SettleSmart Works",
      businessType: "SERVICE_BUSINESS",
      industry: "AI-powered business, career and brand operations software",
      description: "SettleSmart Works builds practical AI-powered products that help people grow careers and help businesses operate, hire, market and sell with more clarity.",
      country: "India",
      city: "Bengaluru",
      website: "https://settlesmart.works",
      email: "hello@settlesmart.works",
      studioEnabled: true,
      commerceEnabled: false,
      recruitmentEnabled: false,
      targetAudience: "Founders, local businesses, HR consultancies, recruiters, professionals and growing teams.",
      productsSummary: products.map(([name]) => name).join(", "),
      brandPersonality: "Clear, capable, warm, practical and quietly premium.",
      preferredLanguage: "English",
      defaultPlatformsJson: ["LinkedIn", "Instagram", "Facebook", "WhatsApp", "Website"],
    },
    create: {
      name: "SettleSmart Works",
      slug: "settlesmart-works",
      businessType: "SERVICE_BUSINESS",
      industry: "AI-powered business, career and brand operations software",
      description: "SettleSmart Works builds practical AI-powered products that help people grow careers and help businesses operate, hire, market and sell with more clarity.",
      country: "India",
      city: "Bengaluru",
      website: "https://settlesmart.works",
      email: "hello@settlesmart.works",
      studioEnabled: true,
      commerceEnabled: false,
      recruitmentEnabled: false,
      targetAudience: "Founders, local businesses, HR consultancies, recruiters, professionals and growing teams.",
      productsSummary: products.map(([name]) => name).join(", "),
      brandPersonality: "Clear, capable, warm, practical and quietly premium.",
      preferredLanguage: "English",
      defaultPlatformsJson: ["LinkedIn", "Instagram", "Facebook", "WhatsApp", "Website"],
    },
  });

  await prisma.brandProfile.upsert({
    where: { companyId: company.id },
    update: {
      tagline: "Empowering People. Transforming Businesses.",
      primaryColor: "#2563eb",
      secondaryColor: "#14b8a6",
      accentColor: "#f97316",
      backgroundColor: "#ffffff",
      textColor: "#111827",
      headingFont: "Inter",
      bodyFont: "Inter",
      brandTone: "Professional, warm, direct and empowering.",
      visualStyle: "Modern SaaS, clean editorial layouts, premium but practical.",
      preferredImageStyle: "Bright workspace imagery, crisp product UI previews and confident founder-led visuals.",
      preferredVideoStyle: "Short, clear product-led explainers with calm motion and strong captions.",
      defaultCallToAction: "Start with SettleSmart Studio",
      ctaStyle: "Clear action buttons with concise value-led copy.",
      approvedKeywordsJson: ["AI-powered", "practical", "clarity", "growth", "operations", "brand"],
      restrictedWordsJson: ["guaranteed", "instant success", "miracle"],
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
    },
    create: {
      companyId: company.id,
      tagline: "Empowering People. Transforming Businesses.",
      primaryColor: "#2563eb",
      secondaryColor: "#14b8a6",
      accentColor: "#f97316",
      backgroundColor: "#ffffff",
      textColor: "#111827",
      headingFont: "Inter",
      bodyFont: "Inter",
      brandTone: "Professional, warm, direct and empowering.",
      visualStyle: "Modern SaaS, clean editorial layouts, premium but practical.",
      preferredImageStyle: "Bright workspace imagery, crisp product UI previews and confident founder-led visuals.",
      preferredVideoStyle: "Short, clear product-led explainers with calm motion and strong captions.",
      defaultCallToAction: "Start with SettleSmart Studio",
      ctaStyle: "Clear action buttons with concise value-led copy.",
      approvedKeywordsJson: ["AI-powered", "practical", "clarity", "growth", "operations", "brand"],
      restrictedWordsJson: ["guaranteed", "instant success", "miracle"],
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const category = await prisma.productCategory.upsert({
    where: { companyId_slug: { companyId: company.id, slug: "settlesmart-products" } },
    update: {},
    create: { companyId: company.id, name: "SettleSmart Products", slug: "settlesmart-products", active: true },
  });

  for (const [name, description, status] of products) {
    await prisma.product.upsert({
      where: { companyId_slug: { companyId: company.id, slug: slug(name) } },
      update: { shortDescription: description, available: status === "ACTIVE" },
      create: {
        companyId: company.id,
        categoryId: category.id,
        name,
        slug: slug(name),
        regularPrice: 0,
        shortDescription: description,
        description,
        available: status === "ACTIVE",
        featured: name === "SettleSmart Studio™",
      },
    });
  }

  for (const [id, name, type, productSlug, objective, inputText, platforms] of [
    ["seed-studio-launch-campaign", "SettleSmart Studio Launch", "COMPANY_PROFILE", "settlesmart-studio", "Introduce SettleSmart Studio as an AI-powered marketing and brand operations platform.", "Create a launch campaign for SettleSmart Studio focused on brand management, campaign creation, media approval and reusable marketing assets.", ["LinkedIn", "Instagram", "Facebook"]],
    ["seed-career-product-campaign", "SettleSmart Career Awareness", "PRODUCT", "settlesmart-career", "Promote SettleSmart Career for professionals exploring career growth.", "Position SettleSmart Career as a practical AI-powered companion for career clarity, resumes, interviews and growth decisions.", ["LinkedIn", "Instagram", "WhatsApp"]],
    ["seed-hr-ops-campaign", "SettleSmart HROps Positioning", "SERVICE", "settlesmart-hrops", "Explain how SettleSmart HROps supports HR operations for growing teams.", "Create practical campaign copy for HR consultancies and businesses that need clearer people operations workflows.", ["LinkedIn", "Facebook"]],
  ]) {
    const linkedProduct = await prisma.product.findFirst({ where: { companyId: company.id, slug: productSlug } });
    await prisma.studioCampaign.upsert({
      where: { id },
      update: { productId: linkedProduct?.id },
      create: {
        id,
        companyId: company.id,
        productId: linkedProduct?.id,
        name,
        campaignType: type,
        objective,
        sourceType: "MANUAL",
        inputText,
        selectedPlatformsJson: platforms,
      },
    });
  }

  await prisma.studioSettings.upsert({
    where: { companyId: company.id },
    update: {
      defaultLanguage: "English",
      defaultPlatformsJson: ["LinkedIn", "Instagram", "Facebook", "WhatsApp", "Website"],
      defaultExportFormat: "original",
      demoAiMode: true,
      mediaStorageInfo: process.env.UPLOAD_DIR || "public/uploads",
    },
    create: {
      companyId: company.id,
      defaultLanguage: "English",
      defaultPlatformsJson: ["LinkedIn", "Instagram", "Facebook", "WhatsApp", "Website"],
      defaultExportFormat: "original",
      demoAiMode: true,
      mediaStorageInfo: process.env.UPLOAD_DIR || "public/uploads",
    },
  });

  const templates = [
    ["Studio Product Launch", "Corporate", "LinkedIn Post", "LinkedIn", "Landscape", 1200, 628],
    ["Career Awareness Post", "Corporate", "Instagram Post", "Instagram", "Portrait", 1080, 1350],
    ["HROps Explainer Banner", "Corporate", "Website Banner", "Website", "Banner", 1600, 600],
    ["Recruit Coming Soon", "Recruitment", "Recruitment Poster", "LinkedIn", "Landscape", 1200, 628],
    ["Commerce Coming Soon", "Retail", "Offer Poster", "Instagram", "Square", 1080, 1080],
    ["Founder Update", "Corporate", "Facebook Post", "Facebook", "Landscape", 1200, 628],
    ["WhatsApp Product Share", "Corporate", "WhatsApp Poster", "WhatsApp", "Portrait", 1080, 1350],
    ["Story Announcement", "Corporate", "Instagram Story", "Instagram", "Story", 1080, 1920],
  ];
  for (const [name, templateCategory, templateType, platform, format, width, height] of templates) {
    const existing = await prisma.studioTemplate.findFirst({ where: { name } });
    if (!existing) {
      await prisma.studioTemplate.create({
        data: {
          companyId: company.id,
          name,
          category: templateCategory,
          templateType,
          platform,
          format,
          width,
          height,
          editableFieldsJson: ["headline", "supportingText", "cta", "logo"],
          tagsJson: ["SettleSmart Works", templateCategory, platform],
        },
      });
    }
  }

  for (const [title, assetType, description] of [
    ["Primary logo placeholder - upload required", "LOGO", "Placeholder record for the SettleSmart Works primary logo. Upload the approved logo before external use."],
    ["Dark logo placeholder - upload required", "LOGO", "Placeholder record for a dark-background logo variant. Upload required."],
    ["Studio product hero placeholder - upload required", "BANNER", "Placeholder for SettleSmart Studio campaign hero artwork. Upload or generate final media."],
    ["Product family overview placeholder - upload required", "POSTER", "Placeholder for SettleSmart Works product family media. Upload or generate final media."],
  ]) {
    const existing = await prisma.mediaAsset.findFirst({ where: { companyId: company.id, title } });
    if (!existing) {
      await prisma.mediaAsset.create({
        data: {
          companyId: company.id,
          title,
          description,
          assetType,
          category: "BRAND",
          sourceType: "IMPORTED",
          originalFilename: "upload-required",
          storedFilename: "upload-required",
          filePath: "/uploads/upload-required",
          mimeType: "application/octet-stream",
          fileSize: 0,
          approvalStatus: "DRAFT",
          tagsJson: ["requires-upload", "SettleSmart Works"],
          usageType: "GENERAL_MARKETING",
          metadataJson: { requiresUpload: true },
        },
      });
    }
  }

  await prisma.studioActivity.create({
    data: {
      companyId: company.id,
      action: "SEED_INITIAL_PROFILE",
      entityType: "Company",
      entityId: company.id,
      summary: "Initialized SettleSmart Works as the default Studio business profile.",
      metadataJson: { starterProfile: true },
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
