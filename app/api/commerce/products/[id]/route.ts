import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { slugify } from "@/modules/wave1/utils";
import { productSchema } from "@/modules/wave1/schemas";
import { z } from "zod";

const productActionSchema = z.object({
  action: z.enum(["DUPLICATE", "SET_STOCK", "SET_ACTIVE", "UPDATE"]),
  inStock: z.coerce.boolean().optional(),
  available: z.coerce.boolean().optional(),
  product: productSchema.partial().optional(),
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
        sku: product.sku ? `${product.sku}-copy` : null,
        taxable: product.taxable,
        studioMediaAssetId: product.studioMediaAssetId,
        available: false,
        featured: false,
        preparationMinutes: product.preparationMinutes,
        displayOrder: product.displayOrder + 1,
        variants: { create: product.variants.map((variant) => ({ name: variant.name, priceDelta: variant.priceDelta, active: variant.active, displayOrder: variant.displayOrder })) },
        addOnGroups: { create: product.addOnGroups.map((entry) => ({ groupId: entry.groupId })) },
      },
    });
    return NextResponse.json(copy, { status: 201 });
  }

  if (result.data.action === "UPDATE") {
    if (!result.data.product) return NextResponse.json({ error: "Product details are required" }, { status: 400 });
    const data = result.data.product;
    const updated = await prisma.product.update({
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
        vegetarian: data.vegetarian,
        available: data.available,
        featured: data.featured,
        preparationMinutes: data.preparationMinutes || null,
        displayOrder: data.displayOrder,
      },
    });
    return NextResponse.json(updated);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: result.data.action === "SET_STOCK" ? { inStock: Boolean(result.data.inStock) } : { available: Boolean(result.data.available) },
  });
  return NextResponse.json(updated);
}
