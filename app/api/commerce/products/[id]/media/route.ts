import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { storeCommerceImage } from "@/modules/wave1/storage";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const companyId = String(form.get("companyId") ?? "");
  const file = form.get("file");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  const product = await prisma.product.findFirst({ where: { id, companyId }, include: { company: { select: { orderingSlug: true } } } });
  if (!product) return NextResponse.json({ error: "Product not found for selected company" }, { status: 404 });

  try {
    const stored = await storeCommerceImage(file, companyId, id);
    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.mediaAsset.create({
        data: {
          companyId,
          productId: id,
          title: product.name,
          assetType: "IMAGE",
          category: "PRODUCT",
          sourceType: "UPLOADED",
          usageType: "COMMERCE_PRODUCT_IMAGE",
          approvalStatus: "APPROVED",
          approvedForExternalUse: true,
          approvedAt: new Date(),
          ...stored,
        },
      });
      await tx.product.update({ where: { id }, data: { imagePath: stored.filePath, studioMediaAssetId: null } });
      return created;
    });
    revalidateCommerce(product.company.orderingSlug, product.slug, id);
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = new URL(req.url).searchParams.get("companyId") ?? "";
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  const product = await prisma.product.findFirst({ where: { id, companyId }, include: { company: { select: { orderingSlug: true } } } });
  if (!product) return NextResponse.json({ error: "Product not found for selected company" }, { status: 404 });
  const updated = await prisma.product.update({ where: { id }, data: { imagePath: null, studioMediaAssetId: null } });
  revalidateCommerce(product.company.orderingSlug, product.slug, id);
  return NextResponse.json(updated);
}

function revalidateCommerce(orderingSlug: string | null, productSlug: string, productId: string) {
  revalidatePath("/commerce");
  revalidatePath("/commerce/products");
  revalidatePath(`/commerce/products/${productId}/edit`);
  if (orderingSlug) {
    revalidatePath(`/order/${orderingSlug}`);
    revalidatePath(`/order/${orderingSlug}/product/${productSlug}`);
  }
}
