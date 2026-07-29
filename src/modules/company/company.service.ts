import { CreateCompanyDto } from "./company.schema";
import { CompanyRepository } from "./company.repository";

export class CompanyService {
  constructor(
    private repository = new CompanyRepository()
  ) {}

  list() {
    return this.repository.findAll();
  }

  create(data: CreateCompanyDto) {
    return this.repository.create(data);
  }
}