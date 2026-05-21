import LegalLayout from "@/components/layout/LegalLayout";
import {
  disclaimerIntro,
  disclaimerSections,
} from "@/content/legal/disclaimer";

export default function DisclaimerPage() {
  return (
    <LegalLayout
      title="Disclaimer"
      intro={disclaimerIntro}
      sections={disclaimerSections}
    />
  );
}
