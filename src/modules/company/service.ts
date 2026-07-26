import { CompanyRepository } from "./repository";

export class CompanyService {
  constructor(
    private repository = new CompanyRepository()
  ) {}

  list() {
    return this.repository.findAll();
  }

  create(name: string, slug: string) {
    return this.repository.create({
      name,
      slug,
    });
  }
}