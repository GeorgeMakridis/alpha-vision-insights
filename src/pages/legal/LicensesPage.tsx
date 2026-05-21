import LegalLayout from "@/components/layout/LegalLayout";
import { licensesIntro, licensesSections } from "@/content/legal/licenses";

export default function LicensesPage() {
  return (
    <LegalLayout
      title="Licenses"
      intro={licensesIntro}
      sections={licensesSections}
    />
  );
}
