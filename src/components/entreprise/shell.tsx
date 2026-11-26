"use client";

/**
 * Shell du Dashboard Entreprise — sidebar de marque + en-tête + Copilote IA flottant.
 */
import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconArrowUpRight,
  IconBriefcase,
  IconShieldCheck,
  IconUserStar,
  IconCalendarCheck,
  IconClipboardList,
  IconFiles,
  IconLayoutDashboard,
  IconReportAnalytics,
  IconRobotFace,
  IconSettings,
  IconSparkles,
  IconLogout,
  IconUsersGroup,
  IconWorld,
} from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiAssistantSheet } from "./ai-assistant";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  /** Libellé spécifique pour le Tuteur / Maître de Stage. */
  tutorLabel?: string;
  icon: ComponentType<{ size?: number | string; className?: string; stroke?: number }>;
  /** Masqué au Tuteur / Maître de Stage (réservé à l'Admin RH). */
  adminOnly?: boolean;
  /** Masqué à l'Admin RH (espace tuteur). */
  tutorOnly?: boolean;
}

const NAV_MAIN: NavItem[] = [
  { href: "/entreprise/dashboard", label: "Tableau de bord", icon: IconLayoutDashboard },
  { href: "/entreprise/offres", label: "Offres de stage", icon: IconBriefcase, adminOnly: true },
  { href: "/entreprise/candidatures", label: "Candidatures", icon: IconClipboardList, adminOnly: true },
  { href: "/entreprise/stagiaires", label: "Mes stagiaires", tutorLabel: "Mes stagiaires", icon: IconUsersGroup },
  { href: "/entreprise/suivi", label: "Missions & Présences", icon: IconCalendarCheck },
];

const NAV_SECONDARY: NavItem[] = [
  { href: "/entreprise/documents", label: "Documents & Conventions", icon: IconFiles, adminOnly: true },
  { href: "/entreprise/evaluations", label: "Évaluations", icon: IconReportAnalytics },
  { href: "/entreprise/parametres", label: "Paramètres & Équipe", tutorLabel: "Mon Profil", icon: IconSettings },
];

export interface EntrepriseShellProps {
  isAdmin: boolean;
  memberName: string;
  memberPosition: string;
  companyName: string;
}

export function EntrepriseShell({ isAdmin, memberName, memberPosition, companyName, children }: EntrepriseShellProps & { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [aiOpen, setAiOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const visible = (items: NavItem[]) => items.filter((item) => (isAdmin ? !item.tutorOnly : !item.adminOnly));

  const renderMenu = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
            <Link
              href={item.href}
              className={cn(
                "group/menu-item",
                isActive(item.href)
                  ? "!bg-white/12 !text-gold font-semibold"
                  : "text-white/85 hover:!bg-white/10 hover:!text-white",
              )}
            >
              <item.icon size={18} className="shrink-0" />
              <span>{!isAdmin && item.tutorLabel ? item.tutorLabel : item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <SidebarProvider>
      {/* Sidebar mobile (portal Sheet) : fond de marque — règle scoppée au shell */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            'div[data-slot="sidebar"][data-sidebar="sidebar"][data-mobile="true"]{background-color:#0B393C;color:#fff;border:none}',
        }}
      />
      <Sidebar
        collapsible="offcanvas"
        className="border-none [&_[data-slot=sidebar-inner]]:border-none [&_[data-slot=sidebar-inner]]:bg-brand [&_[data-slot=sidebar-inner]]:text-white"
      >
        <SidebarHeader className="border-b border-white/10 px-4 py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="StageTrack — retour à l'accueil">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <img src="/logo-icon.png" alt="Logo StageTrack" className="h-7 w-7" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="inline-flex w-fit rounded-md bg-white px-2 py-1">
                <img src="/logo-full.png" alt="StageTrack" className="h-4 w-auto" />
              </span>
              <span className="mt-1 text-[11px] font-medium text-white/60">Espace {companyName}</span>
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2 py-3">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {isAdmin ? "Pilotage" : "Espace tuteur"}
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(visible(NAV_MAIN))}</SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {isAdmin ? "Ressources humaines" : "Suivi & évaluation"}
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(visible(NAV_SECONDARY))}</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="group flex w-full items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-left transition-colors hover:bg-gold/20"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/25">
              <IconRobotFace size={17} className="text-gold" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-gold">Copilote IA RH</span>
              <span className="truncate text-[11px] text-white/60">Assistant Groq · toujours disponible</span>
            </span>
            <IconSparkles size={15} className="shrink-0 text-gold transition-transform group-hover:scale-110" />
          </button>
          <div className={cn("flex items-center gap-3 rounded-xl px-2 py-1.5")}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[11px] font-bold text-gold">
              {memberName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <span className="min-w-0 flex-col">
              <span className="block truncate text-sm font-semibold text-white">{memberName}</span>
              <span className="block truncate text-[11px] text-white/60">{memberPosition} · {companyName}</span>
            </span>
          </div>
          <Link
            href="/"
            className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IconWorld size={15} />
            Voir le site public
          </Link>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-[#F8FAFC]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
          <SidebarTrigger className="!h-9 !w-9 !text-ink lg:hidden" aria-label="Ouvrir le menu" />
          <span className="hidden lg:inline-flex lg:h-9 lg:w-9" aria-hidden />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <img src="/logo-full.png" alt="StageTrack" className="h-4 w-auto shrink-0 lg:hidden" />
            {isAdmin ? (
              <Badge variant="outline" className="hidden shrink-0 border-brand/20 bg-brand-50 text-[11px] font-bold text-brand sm:inline-flex">
                <IconShieldCheck size={12} className="mr-1" />
                Administrateur RH — {companyName}
              </Badge>
            ) : (
              <Badge className="shrink-0 gap-1.5 rounded-lg bg-gold px-2.5 py-1 text-[11px] font-bold text-white hover:bg-gold-dark">
                <IconUserStar size={13} />
                <span className="hidden sm:inline">Tuteur / Maître de Stage</span>
                <span className="sm:hidden">Tuteur</span>
              </Badge>
            )}
          </div>
          {/* Déconnexion — session réelle */}
          <Button
            type="button"
            onClick={() => {
              void (async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } finally {
                  router.push("/auth");
                  router.refresh();
                }
              })();
            }}
            variant="outline"
            className="h-9 shrink-0 gap-1.5 rounded-xl border-slate-200/80 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <IconLogout size={15} />
            <span className="hidden md:inline">Déconnexion</span>
          </Button>
          <Button
            type="button"
            onClick={() => setAiOpen(true)}
            className="h-9 shrink-0 gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark sm:px-4"
          >
            <IconRobotFace size={16} className="text-gold" />
            <span className="hidden sm:inline">Assistant IA RH</span>
            <span className="sm:hidden">IA</span>
          </Button>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <button
          type="button"
          onClick={() => setAiOpen(true)}
          aria-label="Ouvrir le Copilote IA RH"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition-transform hover:scale-105 hover:bg-brand-dark sm:h-14 sm:w-14"
        >
          <IconRobotFace size={24} className="text-gold" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-brand">
            IA
          </span>
        </button>
      </SidebarInset>

      <AiAssistantSheet open={aiOpen} onOpenChange={setAiOpen} />
    </SidebarProvider>
  );
}
