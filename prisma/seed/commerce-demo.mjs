import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (value) => Number(value.toFixed(2));

const categories = ["Signature Biryani", "Indian Main Course", "Arabic Specials", "Indo-Chinese", "Starters", "Breads", "Beverages", "Desserts"];
const products = [
  ["Signature Biryani", "Chicken Biryani", 32, false, true, true],
  ["Signature Biryani", "Mutton Biryani", 42, false, true, true],
  ["Signature Biryani", "Vegetable Biryani", 26, true, false, false],
  ["Signature Biryani", "Chicken 65 Biryani", 36, false, true, false],
  ["Indian Main Course", "Butter Chicken", 34, false, true, true],
  ["Indian Main Course", "Chicken Tikka Masala", 33, false, false, false],
  ["Indian Main Course", "Paneer Butter Masala", 30, true, false, false],
  ["Indian Main Course", "Dal Tadka", 22, true, false, false],
  ["Indian Main Course", "Mixed Vegetable Curry", 24, true, false, false],
  ["Arabic Specials", "Chicken Mandi", 38, false, true, true],
  ["Arabic Specials", "Mutton Mandi", 48, false, true, false],
  ["Arabic Specials", "Grilled Chicken", 36, false, false, false],
  ["Arabic Specials", "Hummus with Bread", 18, true, false, false],
  ["Indo-Chinese", "Chicken Fried Rice", 27, false, false, true],
  ["Indo-Chinese", "Vegetable Fried Rice", 23, true, false, false],
  ["Indo-Chinese", "Chicken Noodles", 27, false, false, false],
  ["Indo-Chinese", "Gobi Manchurian", 24, true, true, false],
  ["Indo-Chinese", "Chilli Chicken", 29, false, true, false],
  ["Starters", "Chicken 65", 25, false, true, true],
  ["Starters", "Chicken Tikka", 28, false, false, false],
  ["Starters", "Vegetable Samosa", 12, true, false, false],
  ["Starters", "French Fries", 14, true, false, false],
  ["Breads", "Naan", 5, true, false, false],
  ["Breads", "Butter Naan", 7, true, false, true],
  ["Breads", "Tandoori Roti", 5, true, false, false],
  ["Breads", "Paratha", 6, true, false, false],
  ["Beverages", "Fresh Lime Soda", 10, true, false, false],
  ["Beverages", "Mango Lassi", 12, true, false, true],
  ["Beverages", "Soft Drink", 8, true, false, false],
  ["Beverages", "Mineral Water", 4, true, false, false],
  ["Beverages", "Karak Tea", 3, true, false, false],
  ["Desserts", "Gulab Jamun", 10, true, false, true],
  ["Desserts", "Kunafa", 18, true, false, false],
  ["Desserts", "Rice Kheer", 12, true, false, false],
];
const productImages = {
  "Chicken Biryani": "/uploads/commerce-chicken-biryani.svg",
  "Fresh Lime Soda": "/uploads/commerce-fresh-lime-soda.svg",
  "Butter Chicken": "/uploads/commerce-butter-chicken.svg",
  "Chicken Mandi": "/uploads/commerce-chicken-mandi.svg",
  "Gulab Jamun": "/uploads/commerce-gulab-jamun.svg",
};
const productImagePath = (name) => productImages[name] ?? "/uploads/commerce-placeholder.svg";

async function optionGroup(companyId, name, options, config = {}) {
  const group = await prisma.addOnGroup.upsert({
    where: { companyId_name: { companyId, name } },
    update: { ...config },
    create: { companyId, name, ...config },
  });
  for (const [optionName, price] of options) {
    await prisma.addOn.upsert({
      where: { groupId_name: { groupId: group.id, name: optionName } },
      update: { price },
      create: { groupId: group.id, name: optionName, price },
    });
  }
  return group;
}

async function createOrder(company, branch, customers, riders, catalog, status, index) {
  const customer = customers[index % customers.length];
  const product = catalog[index % catalog.length];
  const subtotal = Number(product.regularPrice) * 2;
  const taxAmount = money(subtotal * 0.05);
  const deliveryCharge = index % 3 === 0 ? 0 : 5;
  const totalAmount = subtotal + taxAmount + deliveryCharge;
  const orderNumber = `SS-ORD-20260729-${String(index + 1).padStart(4, "0")}`;
  const rider = ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "PAYMENT_COLLECTED", "COMPLETED"].includes(status) ? riders[index % riders.length] : null;
  const existing = await prisma.order.findUnique({ where: { orderNumber } });
  if (existing) return existing;
  return prisma.order.create({
    data: {
      companyId: company.id,
      branchId: branch.id,
      customerId: customer.id,
      riderId: rider?.id,
      orderNumber,
      trackingToken: randomUUID(),
      status,
      paymentMethod: index % 2 ? "CARD_ON_DELIVERY" : "CASH_ON_DELIVERY",
      paymentStatus: ["PAYMENT_COLLECTED", "COMPLETED"].includes(status) ? "COLLECTED" : "PENDING",
      fulfilmentType: rider ? "DELIVERY" : index % 4 === 0 ? "PICKUP" : "DELIVERY",
      subtotal,
      taxAmount,
      deliveryCharge,
      discountAmount: 0,
      totalAmount,
      customerNameSnapshot: customer.name,
      customerMobileSnapshot: customer.mobile,
      deliveryAddressSnapshotJson: { doorOrFlatNumber: "1204", buildingName: "Executive Tower", area: index % 2 ? "Business Bay" : "Al Qusais", city: "Dubai", landmark: "Near metro station", deliveryInstructions: "Call on arrival" },
      specialInstructions: "No special instructions",
      source: "CUSTOMER_PWA",
      placedAt: new Date(Date.now() - index * 24 * 60 * 1000),
      items: {
        create: {
          productId: product.id,
          productNameSnapshot: product.name,
          unitPrice: product.regularPrice,
          quantity: 2,
          lineTotal: subtotal,
          selectedOptionsJson: { variant: { name: "Regular", priceDelta: 0 }, addOns: [{ name: "Raita", price: 2 }] },
        },
      },
      statusHistory: {
        create: [{ newStatus: "PENDING", note: "Seeded order placed" }, ...(status === "PENDING" ? [] : [{ previousStatus: "PENDING", newStatus: status, note: "Seeded workflow state" }])],
      },
    },
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Commerce demo seed is disabled in production");

  const company = await prisma.company.upsert({
    where: { slug: "dubai-delights" },
    update: { commerceEnabled: true, orderingSlug: "dubai-delights" },
    create: {
      name: "Dubai Delights Restaurant",
      slug: "dubai-delights",
      businessType: "RESTAURANT",
      industry: "Food & Beverage",
      country: "United Arab Emirates",
      city: "Dubai",
      address: "Al Qusais, Dubai, United Arab Emirates",
      phone: "+971500000001",
      whatsapp: "+971500000001",
      email: "orders@dubaidelights.test",
      orderingSlug: "dubai-delights",
      commerceEnabled: true,
      studioEnabled: true,
      description: "Dubai Delights Restaurant serves freshly prepared Indian, Arabic and Indo-Chinese meals for families, office professionals and local residents, with convenient pickup and local delivery.",
    },
  });

  await prisma.brandProfile.upsert({
    where: { companyId: company.id },
    update: { tagline: "Fresh Flavours. Delivered Fast.", approvalStatus: "APPROVED", approvedAt: new Date() },
    create: { companyId: company.id, tagline: "Fresh Flavours. Delivered Fast.", primaryColor: "#0f766e", secondaryColor: "#f97316", accentColor: "#facc15", brandTone: "Warm, appetizing and family-friendly.", approvalStatus: "APPROVED", approvedAt: new Date() },
  });

  await prisma.commerceBusinessSettings.upsert({
    where: { companyId: company.id },
    update: { acceptingOrders: true, demoBusiness: true },
    create: {
      companyId: company.id,
      displayName: "Dubai Delights Restaurant",
      description: company.description,
      cuisinesJson: ["Indian", "Arabic", "Indo-Chinese"],
      currency: "AED",
      timezone: "Asia/Dubai",
      taxPercentage: 5,
      minimumOrderAmount: 25,
      deliveryCharge: 5,
      freeDeliveryThreshold: 75,
      preparationMinutes: 30,
      deliveryRadiusKm: 5,
      terms: "Development demo ordering terms for local testing only.",
      cancellationPolicy: "Orders may be cancelled by restaurant staff before preparation starts.",
      demoBusiness: true,
    },
  });

  const branch = await prisma.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: "DD-AQ-01" } },
    update: {},
    create: { companyId: company.id, name: "Dubai Delights - Al Qusais", code: "DD-AQ-01", address: "Al Qusais, Dubai, United Arab Emirates", city: "Dubai", phone: "+971500000001", whatsapp: "+971500000001", email: "orders@dubaidelights.test", deliveryRadiusKm: 5, minimumOrderAmount: 25, deliveryFee: 5, freeDeliveryThreshold: 75, preparationMinutes: 30 },
  });
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    await prisma.branchOperatingHours.upsert({ where: { branchId_dayOfWeek: { branchId: branch.id, dayOfWeek } }, update: { openTime: "11:00", closeTime: "23:30", closed: false }, create: { branchId: branch.id, dayOfWeek, openTime: "11:00", closeTime: "23:30", closed: false } });
  }

  const categoryMap = new Map();
  for (const [displayOrder, name] of categories.entries()) {
    const category = await prisma.productCategory.upsert({ where: { companyId_slug: { companyId: company.id, slug: slug(name) } }, update: { displayOrder, active: true }, create: { companyId: company.id, name, slug: slug(name), description: `${name} favorites from Dubai Delights.`, displayOrder, active: true } });
    categoryMap.set(name, category);
  }

  const spice = await optionGroup(company.id, "Choose Spice Level", [["Mild", 0], ["Medium", 0], ["Spicy", 0]], { required: true, minSelections: 1, maxSelections: 1 });
  const extras = await optionGroup(company.id, "Add Extras", [["Extra Chicken", 8], ["Extra Gravy", 4], ["Boiled Egg", 3], ["Raita", 2]], { multipleSelection: true, maxSelections: 4 });
  const drinks = await optionGroup(company.id, "Choose Drink", [["Water", 4], ["Soft Drink", 8], ["Fresh Lime Soda", 10]], { maxSelections: 1 });

  const catalog = [];
  for (const [displayOrder, item] of products.entries()) {
    const [categoryName, name, price, vegetarian, spicyItem, bestseller] = item;
    const product = await prisma.product.upsert({
      where: { companyId_slug: { companyId: company.id, slug: slug(name) } },
      update: { regularPrice: price, available: true, inStock: true, imagePath: productImagePath(name) },
      create: { companyId: company.id, categoryId: categoryMap.get(categoryName).id, name, slug: slug(name), shortDescription: `Freshly prepared ${name} from Dubai Delights.`, description: `${name} served with Dubai Delights care and UAE-friendly portions.`, regularPrice: price, imagePath: productImagePath(name), vegetarian, spicy: spicyItem, bestseller, featured: bestseller, preparationMinutes: 30, displayOrder },
    });
    catalog.push(product);
    if (categoryName === "Signature Biryani") {
      await prisma.productVariant.upsert({ where: { productId_name: { productId: product.id, name: "Regular" } }, update: { active: false }, create: { productId: product.id, name: "Regular", description: "Legacy default", price, priceDelta: 0, active: false, displayOrder: 99 } });
      await prisma.productVariant.upsert({ where: { productId_name: { productId: product.id, name: "Standard" } }, update: { description: "Serves 1", price, priceDelta: 0, active: true, displayOrder: 0 }, create: { productId: product.id, name: "Standard", description: "Serves 1", price, priceDelta: 0, active: true, displayOrder: 0 } });
      await prisma.productVariant.upsert({ where: { productId_name: { productId: product.id, name: "Medium" } }, update: { description: "Serves 2", price: price + 8, priceDelta: 8, active: true, displayOrder: 1 }, create: { productId: product.id, name: "Medium", description: "Serves 2", price: price + 8, priceDelta: 8, active: true, displayOrder: 1 } });
      await prisma.productVariant.upsert({ where: { productId_name: { productId: product.id, name: "Family Pack" } }, update: { description: "Serves 5", price: name === "Chicken Biryani" ? 65 : price + 28, priceDelta: name === "Chicken Biryani" ? 33 : 28, active: true, displayOrder: 2 }, create: { productId: product.id, name: "Family Pack", description: "Serves 5", price: name === "Chicken Biryani" ? 65 : price + 28, priceDelta: name === "Chicken Biryani" ? 33 : 28, active: true, displayOrder: 2 } });
    }
    for (const group of [spice, extras, drinks]) {
      await prisma.productAddOnGroup.upsert({ where: { productId_groupId: { productId: product.id, groupId: group.id } }, update: {}, create: { productId: product.id, groupId: group.id } });
    }
  }

  const customers = [];
  for (const customer of [
    ["Arun Kumar", "+971500000101", "arun@example.test"],
    ["Fathima Rahman", "+971500000102", "fathima@example.test"],
    ["Mohammed Salim", "+971500000103", "mohammed@example.test"],
  ]) {
    customers.push(await prisma.customer.upsert({ where: { companyId_mobile: { companyId: company.id, mobile: customer[1] } }, update: { name: customer[0], email: customer[2] }, create: { companyId: company.id, name: customer[0], mobile: customer[1], email: customer[2] } }));
  }

  const riders = [];
  for (const rider of [
    ["Ravi Kumar", "+971500000201", "Motorbike", "TEST-DXB-201", "AVAILABLE"],
    ["Ahmed Ali", "+971500000202", "Motorbike", "TEST-DXB-202", "OFFLINE"],
  ]) {
    riders.push(await prisma.rider.upsert({ where: { secureAccessCode: slug(`${rider[0]}-${rider[1]}`) }, update: { availabilityStatus: rider[4] }, create: { companyId: company.id, name: rider[0], mobile: rider[1], vehicleType: rider[2], vehicleNumber: rider[3], availabilityStatus: rider[4], secureAccessCode: slug(`${rider[0]}-${rider[1]}`) } }));
  }

  await prisma.promotion.upsert({
    where: { companyId_code: { companyId: company.id, code: "WELCOME10" } },
    update: { active: true },
    create: { companyId: company.id, code: "WELCOME10", name: "Welcome 10", description: "10% off for demo orders.", type: "PERCENTAGE", percentDiscount: 10, minimumOrder: 30, maximumDiscount: 10, active: true },
  });

  const statuses = ["PENDING", "PENDING", "ACCEPTED", "ACCEPTED", "PREPARING", "PREPARING", "READY", "READY", "RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "PAYMENT_COLLECTED", "COMPLETED", "REJECTED", "CANCELLED"];
  for (const [index, status] of statuses.entries()) await createOrder(company, branch, customers, riders, catalog, status, index);

  await prisma.notificationEvent.create({ data: { companyId: company.id, eventType: "ORDER_CREATED", message: "Commerce demo seed refreshed Dubai Delights Restaurant." } });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
