import type { AddOn, Product } from "@prisma/client";

type Dietary = "VEG" | "NON_VEG" | null | undefined;

export function productDietary(product: Pick<Product, "vegetarian"> & { dietaryClassification?: Dietary }) {
  return product.dietaryClassification ?? (product.vegetarian ? "VEG" : "NON_VEG");
}

export function isAddOnCompatibleWithProduct(product: Pick<Product, "vegetarian"> & { dietaryClassification?: Dietary }, addOn: Pick<AddOn, "name"> & { dietaryClassification?: Dietary }) {
  return !(productDietary(product) === "VEG" && addOn.dietaryClassification === "NON_VEG");
}
