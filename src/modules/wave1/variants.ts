import { Prisma, type Product, type ProductVariant } from "@prisma/client";
import { money } from "./utils";

export type VariantLike = Pick<ProductVariant, "id" | "name" | "description" | "price" | "priceDelta" | "active" | "displayOrder">;
export type ProductPriceLike = Pick<Product, "regularPrice" | "promotionalPrice">;

export function productBasePrice(product: ProductPriceLike) {
  return money(product.promotionalPrice ?? product.regularPrice);
}

export function variantSellingPrice(product: ProductPriceLike, variant?: VariantLike | null) {
  if (!variant) return productBasePrice(product);
  return variant.price == null ? productBasePrice(product) + money(variant.priceDelta) : money(variant.price);
}

export function hasMeaningfulVariants(variants: VariantLike[]) {
  return variants.filter((variant) => variant.active).length > 1;
}

export function variantSnapshot(product: ProductPriceLike, variant?: VariantLike | null) {
  if (!variant) return null;
  return {
    id: variant.id,
    name: variant.name,
    description: variant.description ?? null,
    price: variantSellingPrice(product, variant),
    priceDelta: money(variant.priceDelta),
  };
}

export type VariantWrite = {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  active: boolean;
  displayOrder: number;
};

export function variantPriceDelta(product: ProductPriceLike, price: number) {
  return new Prisma.Decimal(price).minus(productBasePrice(product));
}
