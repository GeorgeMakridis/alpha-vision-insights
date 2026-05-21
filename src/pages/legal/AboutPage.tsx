import LegalLayout from "@/components/layout/LegalLayout";
import { aboutIntro, aboutSections } from "@/content/legal/about";

export default function AboutPage() {
  return (
    <LegalLayout title="About" intro={aboutIntro} sections={aboutSections} />
  );
}
