import { prisma } from "@/core/database/prisma";
import { appUrl, money } from "@/modules/wave1/utils";

const visualProfiles: Record<string, string[]> = {
  RESTAURANT: ["food close-ups", "chef preparation", "plating", "ingredients", "delivery packaging"],
  GROCERY: ["fresh produce", "shelves", "shopping baskets", "bundles", "packing"],
  RETAIL: ["product displays", "shelves", "shopping baskets", "bundles", "delivery"],
  HOTEL: ["reception", "rooms", "hospitality", "restaurant", "guest experience"],
  RECRUITMENT_AGENCY: ["professional workplaces", "candidate interviews", "onboarding", "training"],
  MANPOWER_CONSULTANCY: ["workforce", "candidate interviews", "industry environments", "training"],
  HR_CONSULTANCY: ["professional workplaces", "onboarding", "training", "employer branding"],
  CLINIC: ["healthcare environment", "reception", "appointment experience", "clinical team"],
  EDUCATION: ["classrooms", "teachers", "learners", "campus", "learning activities"],
  SERVICE_BUSINESS: ["service delivery", "team", "customer interaction", "results"],
  OTHER: ["brand environment", "team", "customer experience", "service details"],
};

export async function getBusinessContext(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      brandProfile: true,
      products: { where: { available: true }, take: 12, orderBy: { name: "asc" } },
      campaigns: { take: 5, orderBy: { createdAt: "desc" } },
    },
  });
  if (!company) throw new Error("Company not found");
  return {
    companyId,
    name: company.name,
    businessType: company.businessType,
    industry: company.industry ?? company.businessType,
    description: company.description ?? "",
    location: [company.city, company.country].filter(Boolean).join(", "),
    orderingUrl: company.orderingSlug ? `${appUrl()}/order/${company.orderingSlug}` : "",
    brand: {
      approved: company.brandProfile?.approvalStatus === "APPROVED",
      tagline: company.brandProfile?.tagline ?? "",
      logoPath: company.brandProfile?.logoPath ?? "",
      primaryColor: company.brandProfile?.primaryColor ?? "#2563eb",
      secondaryColor: company.brandProfile?.secondaryColor ?? "#14b8a6",
      accentColor: company.brandProfile?.accentColor ?? "#f97316",
      backgroundColor: company.brandProfile?.backgroundColor ?? "#ffffff",
      headingFont: company.brandProfile?.headingFont ?? "Arial",
      bodyFont: company.brandProfile?.bodyFont ?? "Arial",
      tone: company.brandProfile?.brandTone ?? "clear, trustworthy and practical",
      visualStyle: company.brandProfile?.visualStyle ?? "premium local business",
      preferredImageStyle: company.brandProfile?.preferredImageStyle ?? "",
      preferredVideoStyle: company.brandProfile?.preferredVideoStyle ?? "",
      defaultCta: company.brandProfile?.defaultCallToAction ?? "Contact us today",
      socials: {
        instagram: company.brandProfile?.instagramHandle ?? "",
        facebook: company.brandProfile?.facebookPage ?? "",
        linkedin: company.brandProfile?.linkedinPage ?? "",
        whatsapp: company.brandProfile?.whatsappNumber ?? company.whatsapp ?? "",
      },
    },
    products: company.products.map((p) => ({ id: p.id, name: p.name, price: money(p.promotionalPrice ?? p.regularPrice), description: p.shortDescription ?? p.description ?? "" })),
    visualProfile: visualProfiles[company.businessType] ?? visualProfiles.OTHER,
    campaignHistory: company.campaigns.map((c) => ({ name: c.name, type: c.campaignType, status: c.status })),
  };
}

export async function extractCampaignDetails(campaignId: string, rawInput = "") {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: campaignId }, include: { product: { include: { category: true } } } });
  if (!campaign) throw new Error("Campaign not found");
  const context = await getBusinessContext(campaign.companyId);
  const product = campaign.product;
  const base = {
    title: campaign.name,
    summary: campaign.objective ?? rawInput.slice(0, 220),
    details: rawInput || campaign.inputText || "",
    cta: context.brand.defaultCta,
    destinationUrl: context.orderingUrl,
    location: context.location,
  };
  const details = product
    ? { ...base, productItem: product.name, category: product.category?.name ?? "", regularPrice: money(product.regularPrice), promotionalPrice: product.promotionalPrice ? money(product.promotionalPrice) : null, availability: product.available ? "Available" : "Unavailable", orderingUrl: context.orderingUrl }
    : campaign.campaignType === "RECRUITMENT"
      ? { ...base, employerName: context.name, jobTitle: campaign.name, industry: context.industry, salaryText: "", experience: "", skills: [], applicationMethod: context.brand.socials.whatsapp || context.orderingUrl, disclaimer: "Human review required before publishing." }
      : base;
  const missing = Object.entries(details).filter(([, value]) => value === "" || value == null).map(([key]) => key);
  return { campaign, context, details, missing };
}

export function generatePlatformCopy(platform: string, context: Awaited<ReturnType<typeof getBusinessContext>>, details: Record<string, unknown>) {
  const title = String(details.productItem ?? details.jobTitle ?? details.title ?? "New update");
  const cta = String(details.cta ?? context.brand.defaultCta);
  const price = details.promotionalPrice || details.regularPrice ? ` Price: ${details.promotionalPrice ?? details.regularPrice}.` : "";
  const warning = context.businessType.includes("RECRUITMENT") ? ["Recruitment content requires human review. Missing salary or benefits are intentionally not invented."] : ["Claims, discounts and ingredients are based only on provided data."];
  const map: Record<string, string> = {
    LINKEDIN: `${context.name} is sharing ${title} for ${context.industry}. ${String(details.summary ?? "")}${price} ${cta}.`,
    INSTAGRAM: `${title} is ready for attention. ${String(details.summary ?? "")}${price} ${cta}.`,
    FACEBOOK: `${context.name} has an update for the local community: ${title}. ${String(details.details ?? details.summary ?? "")}${price} ${cta}.`,
    WHATSAPP: `${title}\n${String(details.summary ?? "")}${price}\n${cta}`,
    INSTAGRAM_STORY: `${title} | ${cta}`,
    REEL: `${title}. Show it fast, visually and clearly. ${cta}.`,
    SHORT_VIDEO: `${title}. Start with the problem, show the offer, close with ${cta}.`,
    SQUARE: `${title} - ${cta}`,
    BANNER: `${title} - ${cta}`,
  };
  return {
    headline: title,
    subheadline: String(details.summary ?? context.brand.tagline ?? ""),
    bodyCaption: map[platform] ?? map.INSTAGRAM,
    cta,
    hashtags: platform === "LINKEDIN" ? ["#Business", "#Hiring", "#SettleSmartStudio"] : ["#LocalBusiness", "#SettleSmartStudio", `#${context.name.replace(/\s+/g, "")}`],
    altText: `${context.name} branded ${title} creative for ${platform.toLowerCase()}.`,
    reviewWarnings: warning,
  };
}

export function creativeBrief(context: Awaited<ReturnType<typeof getBusinessContext>>, details: Record<string, unknown>) {
  return {
    visualDirection: context.visualProfile,
    templateFamily: context.businessType === "RESTAURANT" ? "food_product" : context.businessType.includes("RECRUITMENT") ? "recruitment_professional" : "corporate_service",
    brandConstraints: context.brand,
    antiFabrication: ["Use only provided facts", "Flag missing critical details", "Do not invent offers, salaries, guarantees or claims"],
    focalMessage: String(details.productItem ?? details.jobTitle ?? details.title ?? context.name),
  };
}

export function storyboardScenes(context: Awaited<ReturnType<typeof getBusinessContext>>, details: Record<string, unknown>, targetDuration = "10-15") {
  const recruitment = context.businessType.includes("RECRUITMENT") || details.jobTitle;
  const food = context.businessType === "RESTAURANT" || details.productItem;
  const visualReference = details.visualReference as { title?: string; filePath?: string; sourceType?: string } | null | undefined;
  const scenes = recruitment
    ? ["Hiring hook", "Role and location", "Key requirements", "Benefits without fabrication", "Apply CTA"]
    : food
      ? ["Hero food close-up", "Preparation or plating", "Price or offer", "Delivery or order CTA"]
      : ["Brand hook", "Service or offer details", "Customer benefit", "CTA end card"];
  return scenes.map((purpose, index) => ({
    sequenceNumber: index + 1,
    durationSeconds: targetDuration === "30-60" ? 10 : 4,
    scenePurpose: purpose,
    headlineCaption: index === 0 ? String(details.productItem ?? details.jobTitle ?? details.title ?? context.name) : purpose,
    visualRecommendation: index === 0 && visualReference ? `Use uploaded campaign visual "${visualReference.title ?? "reference"}" (${visualReference.sourceType ?? "media"}) as the composition reference: ${visualReference.filePath ?? ""}` : context.visualProfile[index % context.visualProfile.length],
    transition: "Clean fade",
    voiceoverText: purpose,
    musicMood: recruitment ? "confident professional" : food ? "warm upbeat" : "modern optimistic",
    cta: index === scenes.length - 1 ? String(details.cta ?? context.brand.defaultCta) : "",
    finalEndCard: index === scenes.length - 1,
  }));
}
