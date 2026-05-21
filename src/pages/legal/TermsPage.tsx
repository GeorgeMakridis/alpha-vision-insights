import LegalLayout from "@/components/layout/LegalLayout";
import { termsIntro, termsSections } from "@/content/legal/terms";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Use" intro={termsIntro} sections={termsSections} />
  );
}
