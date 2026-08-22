import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { z } from "zod";

const optional = z.string().trim().optional().or(z.literal(""));
const money = z.coerce.number().min(0).max(999999);
const settingsSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(140),
  description: optional,
  phone: optional,
  whatsapp: optional,
  email: z.string().email().optional().or(z.literal("")),
  address: optional,
  city: optional,
  area: optional,
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
  currency: z.string().min(2).max(8).default("AED"),
  timezone: z.string().min(2).max(80).default("Asia/Dubai"),
  taxPercentage: money,
  minimumOrderAmount: money,
  deliveryCharge: money,
  freeDeliveryThreshold: money.optional().or(z.literal("")),
  preparationMinutes: z.coerce.number().int().min(0).max(600),
  deliveryRadiusKm: z.coerce.number().min(0).max(500),
  deliveryEnabled: z.coerce.boolean().default(false),
  pickupEnabled: z.coerce.boolean().default(false),
  cashPaymentEnabled: z.coerce.boolean().default(false),
  cardOnDeliveryEnabled: z.coerce.boolean().default(false),
  onlinePaymentEnabled: z.coerce.boolean().default(false),
  acceptingOrders: z.coerce.boolean().default(false),
  temporarilyClosed: z.coerce.boolean().default(false),
  temporaryClosureMessage: optional,
  logoPath: optional,
  coverImagePath: optional,
  terms: optional,
  cancellationPolicy: optional,
  days: z.array(z.object({ dayOfWeek: z.coerce.number().int().min(0).max(6), openTime: z.string().regex(/^\d{2}:\d{2}$/), closeTime: z.string().regex(/^\d{2}:\d{2}$/), closed: z.coerce.boolean().default(false) })).default([]),
});

const numberOrNull = (value: number | string | undefined) => value === "" || value === undefined ? null : value;

export async function PUT(req: Request) {
  const result = settingsSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const data = result.data;
  const branch = await prisma.branch.findFirst({ where: { companyId: data.companyId }, orderBy: { createdAt: "asc" } });
  const updated = await prisma.$transaction(async (tx) => {
    const company = await tx.company.update({
      where: { id: data.companyId },
      data: {
        name: data.name,
        description: data.description || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        latitude: numberOrNull(data.latitude),
        longitude: numberOrNull(data.longitude),
      },
    });
    await tx.commerceBusinessSettings.upsert({
      where: { companyId: data.companyId },
      create: {
        companyId: data.companyId,
        displayName: data.name,
        description: data.description || null,
        currency: data.currency,
        timezone: data.timezone,
        taxPercentage: data.taxPercentage,
        minimumOrderAmount: data.minimumOrderAmount,
        deliveryCharge: data.deliveryCharge,
        freeDeliveryThreshold: numberOrNull(data.freeDeliveryThreshold),
        preparationMinutes: data.preparationMinutes,
        deliveryRadiusKm: data.deliveryRadiusKm,
        deliveryEnabled: data.deliveryEnabled,
        pickupEnabled: data.pickupEnabled,
        cashPaymentEnabled: data.cashPaymentEnabled,
        cardOnDeliveryEnabled: data.cardOnDeliveryEnabled,
        onlinePaymentEnabled: data.onlinePaymentEnabled,
        acceptingOrders: data.acceptingOrders,
        temporaryClosureMessage: data.temporaryClosureMessage || null,
        logoPath: data.logoPath || null,
        coverImagePath: data.coverImagePath || null,
        terms: data.terms || null,
        cancellationPolicy: data.cancellationPolicy || null,
      },
      update: {
        displayName: data.name,
        description: data.description || null,
        currency: data.currency,
        timezone: data.timezone,
        taxPercentage: data.taxPercentage,
        minimumOrderAmount: data.minimumOrderAmount,
        deliveryCharge: data.deliveryCharge,
        freeDeliveryThreshold: numberOrNull(data.freeDeliveryThreshold),
        preparationMinutes: data.preparationMinutes,
        deliveryRadiusKm: data.deliveryRadiusKm,
        deliveryEnabled: data.deliveryEnabled,
        pickupEnabled: data.pickupEnabled,
        cashPaymentEnabled: data.cashPaymentEnabled,
        cardOnDeliveryEnabled: data.cardOnDeliveryEnabled,
        onlinePaymentEnabled: data.onlinePaymentEnabled,
        acceptingOrders: data.acceptingOrders,
        temporaryClosureMessage: data.temporaryClosureMessage || null,
        logoPath: data.logoPath || null,
        coverImagePath: data.coverImagePath || null,
        terms: data.terms || null,
        cancellationPolicy: data.cancellationPolicy || null,
      },
    });
    if (branch) {
      await tx.branch.update({
        where: { id: branch.id },
        data: {
          address: data.address || null,
          city: data.city || null,
          latitude: numberOrNull(data.latitude),
          longitude: numberOrNull(data.longitude),
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
          deliveryRadiusKm: data.deliveryRadiusKm,
          minimumOrderAmount: data.minimumOrderAmount,
          deliveryFee: data.deliveryCharge,
          freeDeliveryThreshold: numberOrNull(data.freeDeliveryThreshold),
          preparationMinutes: data.preparationMinutes,
          pickupEnabled: data.pickupEnabled,
          deliveryEnabled: data.deliveryEnabled,
          temporarilyClosed: data.temporarilyClosed,
          closureReason: data.temporaryClosureMessage || null,
        },
      });
      for (const day of data.days) {
        await tx.branchOperatingHours.upsert({ where: { branchId_dayOfWeek: { branchId: branch.id, dayOfWeek: day.dayOfWeek } }, create: { branchId: branch.id, ...day }, update: day });
      }
    }
    for (const day of data.days) {
      await tx.operatingHours.upsert({ where: { companyId_dayOfWeek: { companyId: data.companyId, dayOfWeek: day.dayOfWeek } }, create: { companyId: data.companyId, ...day }, update: day });
    }
    return company;
  });
  return NextResponse.json(updated);
}
