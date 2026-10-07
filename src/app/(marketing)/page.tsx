import type { Metadata } from "next";
import { CTA } from "@/components/marketing/CTA";
import { FAQ } from "@/components/marketing/FAQ";
import { Features } from "@/components/marketing/Features";
import { Hero } from "@/components/marketing/Hero";
import { ModesShowcase } from "@/components/marketing/ModesShowcase";
import { Pricing } from "@/components/marketing/Pricing";
import { Problem } from "@/components/marketing/Problem";
import { WithWithout } from "@/components/marketing/WithWithout";
import { config } from "@/config";

export const metadata: Metadata = {
  title: `${config.appName} · ${config.tagline}`,
  description: config.appDescription,
};

// Section order follows ShipeaRapido's landing; header and footer come from (marketing)/layout.tsx.
export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <WithWithout />
      <ModesShowcase />
      <Features />
      <Pricing />
      <FAQ />
      <CTA />
    </>
  );
}
