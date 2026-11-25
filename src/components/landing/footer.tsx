import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconBrandYoutube,
  IconMail,
  IconMapPin,
  IconPhone,
} from "@tabler/icons-react";
import { NAV_LINKS } from "@/lib/stagetrack-data";

const LEGAL_LINKS = [
  "Mentions légales",
  "Politique de confidentialité",
  "Conditions générales d'utilisation",
  "Gestion des cookies",
];

const SOCIALS = [
  { icon: IconBrandLinkedin, label: "LinkedIn" },
  { icon: IconBrandFacebook, label: "Facebook" },
  { icon: IconBrandInstagram, label: "Instagram" },
  { icon: IconBrandX, label: "X (Twitter)" },
  { icon: IconBrandYoutube, label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Colonne 1 : logo + description + réseaux sociaux */}
          <div className="space-y-5">
            <a href="#" aria-label="StageTrack — Accueil">
              <img src="/logo-full.png" alt="StageTrack" className="h-11 w-auto" />
            </a>
            <p className="text-pretty text-sm leading-relaxed text-body">
              La plateforme 100 % gratuite qui connecte étudiants, entreprises
              recruteuses et écoles pour rechercher, suivre et gérer chaque stage,
              de la candidature à l&apos;attestation finale.
            </p>
            <div className="flex gap-2.5">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={`StageTrack sur ${social.label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-brand hover:text-white"
                >
                  <social.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Colonne 2 : liens rapides */}
          <nav aria-label="Liens rapides" className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              Liens rapides
            </h3>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-body transition-colors hover:text-brand"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="#publics" className="text-sm text-body transition-colors hover:text-brand">
                  Un espace pour chaque acteur
                </a>
              </li>
            </ul>
          </nav>

          {/* Colonne 3 : mentions légales */}
          <nav aria-label="Mentions légales" className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              Mentions légales
            </h3>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-body transition-colors hover:text-brand">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Colonne 4 : contact */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Contact</h3>
            <ul className="space-y-3.5 text-sm text-body">
              <li className="flex items-start gap-2.5">
                <IconMail size={16} className="mt-0.5 shrink-0 text-brand" />
                <a href="mailto:contact@stagetrack.bj" className="transition-colors hover:text-brand">
                  contact@stagetrack.bj
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <IconPhone size={16} className="mt-0.5 shrink-0 text-brand" />
                <a href="tel:+2290197000000" className="transition-colors hover:text-brand">
                  +229 01 97 00 00 00
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <IconMapPin size={16} className="mt-0.5 shrink-0 text-brand" />
                <span>Cotonou, République du Bénin</span>
              </li>
            </ul>
            <p className="inline-flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3.5 py-2 text-xs font-semibold text-gold-dark">
              100 % gratuit — pour toujours
            </p>
          </div>
        </div>

        {/* Barre inférieure */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 pt-6 sm:flex-row">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} StageTrack. Tous droits réservés.
          </p>
          <p className="text-xs text-slate-400">
            Conçu pour les étudiants, les entreprises et les écoles du Bénin et d&apos;ailleurs.
          </p>
        </div>
      </div>
    </footer>
  );
}
