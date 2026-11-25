"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  IconArrowRight,
  IconMenu,
  IconSchool,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { RoleSelectorModal } from "@/components/auth/RoleSelectorModal";
import { NAV_LINKS } from "@/lib/stagetrack-data";
import type { AuthMode } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("connexion");

  const openAuth = (mode: AuthMode) => {
    setMobileOpen(false);
    setAuthMode(mode);
    setAuthOpen(true);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -72, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-slate-200/80 bg-white/80 shadow-[0_8px_30px_-12px_rgba(11,57,60,0.15)] backdrop-blur-xl"
          : "border-b border-transparent bg-white/55 backdrop-blur-md"
      )}
    >
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8"
      >
        {/* Logo */}
        <a href="/" aria-label="StageTrack — Accueil" className="flex shrink-0 items-center">
          <img
            src="/logo-full.png"
            alt="StageTrack"
            className="h-9 w-auto lg:h-11"
          />
        </a>

        {/* Liens centraux (desktop) */}
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-brand/5 hover:text-brand"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <button
            type="button"
            onClick={() => openAuth("connexion")}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand/5"
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => openAuth("inscription")}
            className="group inline-flex items-center gap-2 rounded-xl bg-brand px-4.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all duration-200 hover:bg-brand-dark hover:shadow-brand/35"
          >
            Rejoindre gratuitement
            <IconArrowRight
              size={16}
              stroke={2.2}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>
        </div>

        {/* Burger (mobile) */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-brand shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
        >
          {mobileOpen ? <IconX size={20} /> : <IconMenu size={20} />}
        </button>
      </nav>

      {/* Menu mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-slate-200/80 bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <div className="space-y-1 px-4 pb-5 pt-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center rounded-xl px-4 py-3 text-[15px] font-medium text-slate-700 transition-colors hover:bg-brand/5 hover:text-brand"
                >
                  {link.label}
                </a>
              ))}
              <div className="grid gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => openAuth("connexion")}
                  className="inline-flex items-center justify-center rounded-xl border border-brand/20 px-4 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/5"
                >
                  Se connecter
                </button>
                <button
                  type="button"
                  onClick={() => openAuth("inscription")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark"
                >
                  <IconSchool size={17} />
                  Rejoindre gratuitement
                  <IconArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.header>

      {/* Modale d'authentification : sélection de profil → connexion / inscription */}
      <RoleSelectorModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultMode={authMode}
      />
    </>
  );
}
