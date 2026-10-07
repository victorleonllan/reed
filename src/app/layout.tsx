import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Literata } from "next/font/google";
import { config } from "@/config";
import "./globals.css";

// Same pairing as the Vite app: Literata for titles and reading, Atkinson Hyperlegible for the UI.
const literata = Literata({
  variable: "--font-serif",
  subsets: ["latin"],
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: config.appName,
  description: config.appDescription,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${literata.variable} ${atkinson.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
