import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stagetrack.bj"),
  title: "StageTrack — La plateforme 100 % gratuite pour rechercher et gérer vos stages",
  description:
    "StageTrack connecte étudiants, entreprises recruteuses et écoles : trouvez un stage vérifié, publiez vos offres, suivez vos candidatures en temps réel et pilotez vos stagiaires en poste. 100 % gratuit, sans frais cachés.",
  keywords: [
    "StageTrack",
    "stage",
    "stages Bénin",
    "offres de stage",
    "candidature stage",
    "convention de stage",
    "étudiants",
    "entreprises",
    "écoles",
    "gratuit",
  ],
  authors: [{ name: "StageTrack" }],
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
  openGraph: {
    title: "StageTrack — La plateforme 100 % gratuite pour les stages",
    description:
      "De la recherche de stage jusqu'au suivi en entreprise, tout est centralisé. Gratuit pour les étudiants, les entreprises et les écoles.",
    url: "https://stagetrack.bj",
    siteName: "StageTrack",
    images: [{ url: "/logo-full.png", width: 1200, height: 630 }],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StageTrack — La plateforme 100 % gratuite pour les stages",
    description:
      "De la recherche de stage jusqu'au suivi en entreprise, tout est centralisé.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full bg-white font-sans text-ink antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
