import type { BrandProfile, Company, Product, ProductVariant } from "@prisma/client";

type SerializableDate = string;

export type ClientProduct = Omit<Product, "regularPrice" | "promotionalPrice" | "createdAt" | "updatedAt"> & {
  regularPrice: number;
  promotionalPrice: number | null;
  createdAt: SerializableDate;
  updatedAt: SerializableDate;
  variants?: Array<Omit<ProductVariant, "price" | "priceDelta"> & { price: number | null; priceDelta: number }>;
};

export function toClientProduct(product: Product & { variants?: ProductVariant[] }): ClientProduct {
  return {
    ...product,
    regularPrice: Number(product.regularPrice),
    promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
    variants: product.variants?.map((variant) => ({ ...variant, price: variant.price == null ? null : Number(variant.price), priceDelta: Number(variant.priceDelta) })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export type ClientCompanySummary = Pick<Company, "id" | "name" | "slug" | "orderingSlug" | "commerceEnabled" | "studioEnabled"> & {
  brandProfile?: { approvalStatus: BrandProfile["approvalStatus"] } | null;
};

export type ClientBusinessProfile = Omit<Company, "latitude" | "longitude" | "createdAt" | "updatedAt"> & {
  latitude: number | null;
  longitude: number | null;
  createdAt: SerializableDate;
  updatedAt: SerializableDate;
  brandProfile?: (Omit<BrandProfile, "approvedAt" | "createdAt" | "updatedAt"> & {
    approvedAt: SerializableDate | null;
    createdAt: SerializableDate;
    updatedAt: SerializableDate;
  }) | null;
};

export function toClientCompanySummary(company: Company & { brandProfile?: BrandProfile | null }): ClientCompanySummary {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    orderingSlug: company.orderingSlug,
    commerceEnabled: company.commerceEnabled,
    studioEnabled: company.studioEnabled,
    brandProfile: company.brandProfile
      ? {
          approvalStatus: company.brandProfile.approvalStatus,
        }
      : null,
  };
}

export function toClientBusinessProfile(company: Company & { brandProfile?: BrandProfile | null }): ClientBusinessProfile {
  return {
    ...company,
    latitude: company.latitude ? Number(company.latitude) : null,
    longitude: company.longitude ? Number(company.longitude) : null,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
    brandProfile: company.brandProfile
      ? {
          ...company.brandProfile,
          approvedAt: company.brandProfile.approvedAt?.toISOString() ?? null,
          createdAt: company.brandProfile.createdAt.toISOString(),
          updatedAt: company.brandProfile.updatedAt.toISOString(),
        }
      : null,
  };
}
