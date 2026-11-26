import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
    <html lang="fr" className="h-full scroll-smooth antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Police de marque chargée en CDN : si le réseau est indisponible,
            la pile système définie dans --font-jakarta prend le relais. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"/>
      </head>
      <body className="min-h-full bg-white font-sans text-ink antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
