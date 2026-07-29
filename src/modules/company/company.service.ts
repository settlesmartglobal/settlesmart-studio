import { Prisma } from "@prisma/client";
import { CreateCompanyDto, UpdateCompanyDto } from "./company.schema";
import { CompanyRepository } from "./company.repository";

const cleanString = (value: string | undefined) => (value === "" ? undefined : value);
const cleanNumber = (value: string | number | undefined) => (value === "" ? undefined : value);

function toCreateCompanyData(data: CreateCompanyDto): Prisma.CompanyCreateInput {
  return {
    ...data,
    email: cleanString(data.email),
    website: cleanString(data.website),
    latitude: cleanNumber(data.latitude),
    longitude: cleanNumber(data.longitude),
    orderingSlug: cleanString(data.orderingSlug),
  };
}

function toUpdateCompanyData(data: UpdateCompanyDto): Prisma.CompanyUpdateInput {
  const rest = { ...data };
  delete rest.id;
  return {
    ...rest,
    email: cleanString(data.email),
    website: cleanString(data.website),
    latitude: cleanNumber(data.latitude),
    longitude: cleanNumber(data.longitude),
    orderingSlug: cleanString(data.orderingSlug),
  };
}

export class CompanyService {
  constructor(
    private repository = new CompanyRepository()
  ) {}

  list() {
    return this.repository.findAll();
  }

  create(data: CreateCompanyDto) {
    return this.repository.create(toCreateCompanyData(data));
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  update(id: string, data: UpdateCompanyDto) {
    return this.repository.update(id, toUpdateCompanyData(data));
  }
}
