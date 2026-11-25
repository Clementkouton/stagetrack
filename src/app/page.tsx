import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { OffersSection } from "@/components/landing/offers-section";
import { SocialProof } from "@/components/landing/social-proof";
import { FeaturesBento } from "@/components/landing/features-bento";
import { HowItWorksStudent, HowItWorksCompany } from "@/components/landing/how-it-works";
import { AudienceTabs } from "@/components/landing/audience-tabs";
import { Testimonials, Faq } from "@/components/landing/testimonials-faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <OffersSection />
        <SocialProof />
        <FeaturesBento />
        <HowItWorksStudent />
        <HowItWorksCompany />
        <AudienceTabs />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
