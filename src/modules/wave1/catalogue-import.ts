import { Prisma, type InventoryMode, type PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { slugify } from "./utils";

export const catalogueColumns = ["SKU", "Product Name", "Category", "Short Description", "Description", "Base Price", "Promotional Price", "Inventory Mode", "Opening Stock", "Low Stock Threshold", "Variant Name", "Variant Description", "Variant Price", "Active", "Vegetarian", "Spicy", "Bestseller", "Preparation Minutes", "Taxable", "Display Order"];

type Row = Record<string, unknown>;
type PreviewIssue = { row: number; message: string };
type ParsedRow = { row: number; sku: string; name: string; category: string; basePrice: number; active: boolean; data: Row };

const text = (row: Row, key: string) => String(row[key] ?? "").trim();
const numberValue = (row: Row, key: string) => {
  const value = text(row, key);
  if (!value) return undefined;
  const clean = Number(value.replace(/^[A-Z]{3}\s+/i, ""));
  return Number.isFinite(clean) && clean >= 0 ? clean : NaN;
};
const boolValue = (row: Row, key: string, fallback = false) => {
  const value = text(row, key).toLowerCase();
  if (!value) return fallback;
  return ["yes", "true", "1", "active", "available"].includes(value);
};

export function catalogueTemplateBuffer() {
  const rows = [
    Object.fromEntries(catalogueColumns.map((column) => [column, ""])),
    { SKU: "BIR001", "Product Name": "Chicken Biryani", Category: "Biryani", "Base Price": 32, "Inventory Mode": "TRACK_QUANTITY", "Opening Stock": 25, "Low Stock Threshold": 5, "Variant Name": "Standard", "Variant Description": "Serves 1", "Variant Price": 32, Active: "TRUE" },
    { SKU: "BIR001", "Product Name": "Chicken Biryani", Category: "Biryani", "Base Price": 32, "Inventory Mode": "TRACK_QUANTITY", "Variant Name": "Family Pack", "Variant Description": "Serves 5", "Variant Price": 65, Active: "TRUE" },
    { SKU: "WAT001", "Product Name": "Mineral Water", Category: "Beverages", "Base Price": 3, "Inventory Mode": "ALWAYS_AVAILABLE", Active: "TRUE" },
  ];
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: catalogueColumns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

export function parseCatalogueWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellFormula: false, cellHTML: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
  const errors: PreviewIssue[] = [];
  const warnings: PreviewIssue[] = [];
  const parsed: ParsedRow[] = [];
  const seen = new Map<string, Set<string>>();
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sku = text(row, "SKU");
    const name = text(row, "Product Name");
    const category = text(row, "Category");
    const price = numberValue(row, "Base Price");
    const variant = text(row, "Variant Name");
    if (!sku) errors.push({ row: rowNumber, message: "Missing SKU" });
    if (!name) errors.push({ row: rowNumber, message: "Missing Product Name" });
    if (!category) warnings.push({ row: rowNumber, message: "Missing category; product will be unassigned" });
    if (price === undefined || Number.isNaN(price)) errors.push({ row: rowNumber, message: "Invalid price" });
    if (variant) {
      const variants = seen.get(sku) ?? new Set<string>();
      const key = variant.toLowerCase();
      if (variants.has(key)) errors.push({ row: rowNumber, message: "Duplicate active variant name" });
      variants.add(key);
      seen.set(sku, variants);
    }
    if (sku && name && price !== undefined && !Number.isNaN(price)) parsed.push({ row: rowNumber, sku, name, category, basePrice: price, active: boolValue(row, "Active", true), data: row });
  });
  return { rowsProcessed: rows.length, valid: parsed.length, warnings, errors, parsed };
}

export async function importCatalogue(prisma: PrismaClient, companyId: string, buffer: Buffer, mode: "CREATE_NEW" | "CREATE_OR_UPDATE") {
  const preview = parseCatalogueWorkbook(buffer);
  if (preview.errors.length) return { ok: false as const, preview };
  const created: string[] = [];
  const updated: string[] = [];
  await prisma.$transaction(async (tx) => {
    const grouped = new Map<string, ParsedRow[]>();
    for (const row of preview.parsed) grouped.set(row.sku, [...(grouped.get(row.sku) ?? []), row]);
    for (const [sku, rows] of grouped) {
      const first = rows[0];
      const categoryName = first.category;
      const category = categoryName ? await tx.productCategory.upsert({ where: { companyId_slug: { companyId, slug: slugify(categoryName) } }, update: { name: categoryName, active: true }, create: { companyId, name: categoryName, slug: slugify(categoryName), active: true } }) : null;
      const existing = await tx.product.findFirst({ where: { companyId, sku } });
      if (existing && mode === "CREATE_NEW") throw new Error(`SKU ${sku} already exists.`);
      const productData = {
        name: first.name,
        slug: existing?.slug ?? slugify(first.name),
        sku,
        categoryId: category?.id,
        shortDescription: text(first.data, "Short Description") || undefined,
        description: text(first.data, "Description") || undefined,
        regularPrice: new Prisma.Decimal(first.basePrice),
        promotionalPrice: numberValue(first.data, "Promotional Price") === undefined ? undefined : new Prisma.Decimal(numberValue(first.data, "Promotional Price") as number),
        inventoryMode: (text(first.data, "Inventory Mode") || "ALWAYS_AVAILABLE") as InventoryMode,
        inventoryQuantity: numberValue(first.data, "Opening Stock"),
        lowStockThreshold: numberValue(first.data, "Low Stock Threshold"),
        vegetarian: boolValue(first.data, "Vegetarian"),
        spicy: boolValue(first.data, "Spicy"),
        bestseller: boolValue(first.data, "Bestseller"),
        taxable: boolValue(first.data, "Taxable", true),
        preparationMinutes: numberValue(first.data, "Preparation Minutes"),
        displayOrder: numberValue(first.data, "Display Order") ?? 0,
        available: first.active,
        inStock: first.active,
      };
      const product = existing ? await tx.product.update({ where: { id: existing.id }, data: productData }) : await tx.product.create({ data: { ...productData, companyId } });
      if (existing) updated.push(sku);
      else created.push(sku);
      const variantRows = rows.filter((row) => text(row.data, "Variant Name"));
      for (const [index, row] of variantRows.entries()) {
        const price = numberValue(row.data, "Variant Price") ?? row.basePrice;
        await tx.productVariant.upsert({
          where: { productId_name: { productId: product.id, name: text(row.data, "Variant Name") } },
          update: { description: text(row.data, "Variant Description") || undefined, price: new Prisma.Decimal(price), priceDelta: new Prisma.Decimal(price - row.basePrice), active: row.active, displayOrder: index },
          create: { productId: product.id, name: text(row.data, "Variant Name"), description: text(row.data, "Variant Description") || undefined, price: new Prisma.Decimal(price), priceDelta: new Prisma.Decimal(price - row.basePrice), active: row.active, displayOrder: index },
        });
      }
    }
  });
  return { ok: true as const, preview, created: created.length, updated: updated.length };
}
