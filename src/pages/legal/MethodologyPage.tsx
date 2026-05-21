import LegalLayout from "@/components/layout/LegalLayout";
import {
  methodologyIntro,
  methodologySections,
} from "@/content/legal/methodology";

export default function MethodologyPage() {
  return (
    <LegalLayout
      title="Methodology"
      intro={methodologyIntro}
      sections={methodologySections}
    />
  );
}
