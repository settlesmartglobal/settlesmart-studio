import { CompanyRepository } from "./company.repository";

export class CompanyService {
  constructor(
    private repository = new CompanyRepository()
  ) {}

  list() {
    return this.repository.findAll();
  }

  create(data: {
    name: string;
    slug: string;
    email?: string;
  }) {
    return this.repository.create(data);
  }
}