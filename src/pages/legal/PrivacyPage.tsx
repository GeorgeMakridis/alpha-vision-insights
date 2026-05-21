import LegalLayout from "@/components/layout/LegalLayout";
import { privacyIntro, privacySections } from "@/content/legal/privacy";

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={privacyIntro}
      sections={privacySections}
    />
  );
}
