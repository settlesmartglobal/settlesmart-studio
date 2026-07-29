import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Seed is disabled in production");

  const company = await prisma.company.upsert({
    where: { slug: "al-ameen-cafe" },
    update: {},
    create: {
      name: "Al Ameen Cafe",
      slug: "al-ameen-cafe",
      orderingSlug: "al-ameen-cafe",
      businessType: "RESTAURANT",
      industry: "Restaurant",
      country: "UAE",
      city: "Dubai",
      address: "Dubai, UAE",
      commerceEnabled: true,
      phone: "+971500000000",
      whatsapp: "+971500000000",
    },
  });

  await prisma.brandProfile.upsert({
    where: { companyId: company.id },
    create: { companyId: company.id, tagline: "Fresh cafe favourites in Dubai", primaryColor: "#0f766e", secondaryColor: "#f59e0b", accentColor: "#dc2626" },
    update: {},
  });

  const categories = [];
  for (const [index, name] of ["Rice & Biryani", "Main Course", "Beverages"].entries()) {
    categories.push(await prisma.productCategory.upsert({
      where: { companyId_slug: { companyId: company.id, slug: slug(name) } },
      update: {},
      create: { companyId: company.id, name, slug: slug(name), displayOrder: index },
    }));
  }

  for (const [name, categorySlug, price] of [
    ["Chicken Biryani", "rice-biryani", 18],
    ["Vegetable Fried Rice", "rice-biryani", 14],
    ["Chicken Fried Rice", "main-course", 16],
    ["Fresh Lime Juice", "beverages", 7],
  ]) {
    const category = categories.find((item) => item.slug === categorySlug);
    await prisma.product.upsert({
      where: { companyId_slug: { companyId: company.id, slug: slug(name) } },
      update: {},
      create: {
        companyId: company.id,
        categoryId: category?.id,
        name,
        slug: slug(name),
        regularPrice: price,
        shortDescription: "Prepared fresh for SettleSmart Studio Beta demo ordering.",
        available: true,
        featured: name === "Chicken Biryani",
      },
    });
  }

  const existingZone = await prisma.deliveryZone.findFirst({ where: { companyId: company.id, name: "Dubai 5 km delivery" } });
  if (!existingZone) {
    await prisma.deliveryZone.create({ data: { companyId: company.id, name: "Dubai 5 km delivery", radiusKm: 5, deliveryCharge: 5, minimumOrderAmount: 20 } });
  }

  await prisma.studioCampaign.upsert({
    where: { id: "seed-chicken-biryani-promotion" },
    update: {},
    create: {
      id: "seed-chicken-biryani-promotion",
      companyId: company.id,
      productId: (await prisma.product.findFirst({ where: { companyId: company.id, slug: "chicken-biryani" } }))?.id,
      name: "Chicken Biryani Promotion",
      campaignType: "MENU_ITEM",
      objective: "Promote Chicken Biryani for online ordering",
      sourceType: "PRODUCT",
      inputText: "Highlight fresh preparation, delivery availability and clear ordering CTA.",
      selectedPlatformsJson: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
    },
  });

  await prisma.studioCampaign.upsert({
    where: { id: "seed-weekend-food-offer" },
    update: {},
    create: {
      id: "seed-weekend-food-offer",
      companyId: company.id,
      name: "Weekend Food Offer",
      campaignType: "OFFER",
      objective: "Create a weekend cafe offer without inventing discounts",
      sourceType: "MANUAL",
      inputText: "Weekend offer campaign. Ask customers to contact or order online for current specials.",
      selectedPlatformsJson: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
    },
  });

  const manpower = await prisma.company.upsert({
    where: { slug: "settlesmart-demo-manpower" },
    update: {},
    create: {
      name: "SettleSmart Demo Manpower",
      slug: "settlesmart-demo-manpower",
      businessType: "MANPOWER_CONSULTANCY",
      industry: "Manpower Consultancy",
      country: "UAE",
      city: "Dubai",
      studioEnabled: true,
      recruitmentEnabled: true,
      whatsapp: "+971500000001",
    },
  });
  await prisma.studioCampaign.upsert({
    where: { id: "seed-demo-recruitment-campaign" },
    update: {},
    create: {
      id: "seed-demo-recruitment-campaign",
      companyId: manpower.id,
      name: "Hospitality Staff Recruitment",
      campaignType: "RECRUITMENT",
      objective: "Recruit hospitality workers with human-review safeguards",
      sourceType: "JOB_DESCRIPTION",
      inputText: "Hiring hospitality staff in Dubai. Salary and benefits to be confirmed by the employer.",
      selectedPlatformsJson: ["LINKEDIN", "FACEBOOK", "WHATSAPP"],
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
