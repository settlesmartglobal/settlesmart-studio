import { prisma } from "@/core/database/prisma";

export class CompanyRepository {
  async findAll() {
    return prisma.company.findMany();
  }

  async findById(id: string) {
    return prisma.company.findUnique({
      where: { id },
    });
  }

  async create(data: {
    name: string;
    slug: string;
  }) {
    return prisma.company.create({
      data,
    });
  }
}