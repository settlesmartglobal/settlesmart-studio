import { prisma } from "@/lib/prisma";

export class CompanyRepository {
  create(data: {
    name: string;
    slug: string;
    email?: string;
  }) {
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
}