import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/core/database/prisma";
import { slugify } from "@/modules/wave1/utils";
import { productSchema } from "@/modules/wave1/schemas";
import { variantPriceDelta } from "@/modules/wave1/variants";
import { z } from "zod";

const variantSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Variant name is required").max(80),
  description: z.string().trim().max(120).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(999999),
  active: z.coerce.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

const dietary = (classification: unknown, vegetarian: boolean): "VEG" | "NON_VEG" | null => {
  if (classification === "") return null;
  if (classification === "VEG" || classification === "NON_VEG") return classification;
  return vegetarian ? "VEG" : "NON_VEG";
};

const productActionSchema = z.object({
  action: z.enum(["DUPLICATE", "SET_STOCK", "SET_ACTIVE", "UPDATE", "ADD_STOCK", "ADJUST_STOCK"]),
  inStock: z.coerce.boolean().optional(),
  available: z.coerce.boolean().optional(),
  quantity: z.coerce.number().int().min(0).max(999999).optional(),
  product: productSchema.partial().optional(),
  variants: z.array(variantSchema).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = productActionSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const product = await prisma.product.findUnique({ where: { id }, include: { variants: true, addOnGroups: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  if (result.data.action === "DUPLICATE") {
    const copyName = `${product.name} Copy`;
    const copy = await prisma.product.create({
      data: {
        companyId: product.companyId,
        categoryId: product.categoryId,
        name: copyName,
        slug: `${slugify(copyName)}-${Date.now().toString(36)}`,
        shortDescription: product.shortDescription,
        description: product.description,
        regularPrice: product.regularPrice,
        promotionalPrice: product.promotionalPrice,
        imagePath: product.imagePath,
        vegetarian: product.vegetarian,
        spicy: product.spicy,
        bestseller: false,
        inStock: product.inStock,
        inventoryMode: product.inventoryMode,
        inventoryQuantity: product.inventoryQuantity,
        lowStockThreshold: product.lowStockThreshold,
        sku: product.sku ? `${product.sku}-copy` : null,
        taxable: product.taxable,
        studioMediaAssetId: product.studioMediaAssetId,
        dietaryClassification: product.dietaryClassification,
        available: false,
        featured: false,
        preparationMinutes: product.preparationMinutes,
        displayOrder: product.displayOrder + 1,
        variants: { create: product.variants.map((variant) => ({ name: variant.name, description: variant.description, price: variant.price, priceDelta: variant.priceDelta, active: variant.active, displayOrder: variant.displayOrder })) },
        addOnGroups: { create: product.addOnGroups.map((entry) => ({ groupId: entry.groupId })) },
      },
    });
    return NextResponse.json(copy, { status: 201 });
  }

  if (result.data.action === "UPDATE") {
    if (!result.data.product) return NextResponse.json({ error: "Product details are required" }, { status: 400 });
    const data = result.data.product;
    const variants = result.data.variants ?? [];
    const duplicateActiveName = variants.filter((variant) => variant.active).map((variant) => variant.name.trim().toLowerCase()).find((name, index, names) => names.indexOf(name) !== index);
    if (duplicateActiveName) return NextResponse.json({ error: "Active variant names must be unique for this product." }, { status: 400 });
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          categoryId: data.categoryId || null,
          shortDescription: data.shortDescription,
          description: data.description,
          regularPrice: data.regularPrice,
          promotionalPrice: data.promotionalPrice || null,
          imagePath: data.imagePath,
          vegetarian: dietary(data.dietaryClassification, Boolean(data.vegetarian)) === "VEG",
          dietaryClassification: dietary(data.dietaryClassification, Boolean(data.vegetarian)),
          available: data.available,
          inventoryMode: data.inventoryMode,
          inventoryQuantity: data.inventoryQuantity === "" ? null : data.inventoryQuantity,
          lowStockThreshold: data.lowStockThreshold === "" ? null : data.lowStockThreshold,
          featured: data.featured,
          preparationMinutes: data.preparationMinutes || null,
          displayOrder: data.displayOrder,
        },
      });
      for (const variant of variants) {
        const variantData = {
          productId: id,
          name: variant.name.trim(),
          description: variant.description || null,
          price: variant.price,
          priceDelta: variantPriceDelta(saved, variant.price),
          active: variant.active,
          displayOrder: variant.displayOrder,
        };
        if (variant.id) await tx.productVariant.update({ where: { id: variant.id }, data: variantData });
        else await tx.productVariant.create({ data: variantData });
      }
      return saved;
    });
    const company = await prisma.company.findUnique({ where: { id: updated.companyId }, select: { orderingSlug: true } });
    revalidatePath("/commerce");
    revalidatePath("/commerce/inventory");
    revalidatePath(`/commerce/products/${id}/edit`);
    if (company?.orderingSlug) {
      revalidatePath(`/order/${company.orderingSlug}`);
      revalidatePath(`/order/${company.orderingSlug}/product/${updated.slug}`);
    }
    return NextResponse.json(updated);
  }

  if (result.data.action === "ADD_STOCK") {
    if (product.inventoryMode !== "TRACK_QUANTITY") return NextResponse.json({ error: "Stock quantities are only used for tracked products" }, { status: 400 });
    const updated = await prisma.product.update({
      where: { id },
      data: { inventoryQuantity: { increment: result.data.quantity ?? 0 }, inStock: true },
    });
    return NextResponse.json(updated);
  }

  if (result.data.action === "ADJUST_STOCK") {
    if (product.inventoryMode !== "TRACK_QUANTITY") return NextResponse.json({ error: "Stock quantities are only used for tracked products" }, { status: 400 });
    const updated = await prisma.product.update({
      where: { id },
      data: { inventoryQuantity: result.data.quantity ?? 0, inStock: true },
    });
    return NextResponse.json(updated);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: result.data.action === "SET_STOCK" ? { inStock: Boolean(result.data.inStock) } : { available: Boolean(result.data.available) },
  });
  return NextResponse.json(updated);
}
