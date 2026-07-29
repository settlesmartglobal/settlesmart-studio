import { AppShell, Panel } from "../../components/shell";
import { CompanyForm } from "../../components/forms";

export default function NewCompanyPage() {
  return <AppShell title="Create Company"><Panel><CompanyForm /></Panel></AppShell>;
}
