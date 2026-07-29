import { prisma } from "@/core/database/prisma";
import { Prisma } from "@prisma/client";

export class CompanyRepository {
  create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({ data });
  }

  findAll() {
    return prisma.company.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findById(id: string) {
    return prisma.company.findUnique({
      where: { id },
    });
  }

  findBySlug(slug: string) {
    return prisma.company.findFirst({
      where: { OR: [{ slug }, { orderingSlug: slug }] },
    });
  }

  update(id: string, data: Prisma.CompanyUpdateInput) {
    return prisma.company.update({
      where: { id },
      data,
    });
  }

  count() {
    return prisma.company.count();
  }
}
