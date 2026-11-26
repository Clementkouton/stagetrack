"use client";

/**
 * Shell du Dashboard Étudiant — sidebar de marque rétractable (logos
 * plein / icône), identité étudiant, recherche globale, notifications
 * et Coach Carrière IA (Groq) accessible depuis tout le dashboard.
 */
import { useMemo, useState, type ComponentType, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconBell,
  IconBriefcase,
  IconCalendarCheck,
  IconClipboardList,
  IconFiles,
  IconLayoutDashboard,
  IconSearch,
  IconSparkles,
  IconLogout,
  IconSchool,
  IconUserCircle,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CoachCarriereSheet } from "./coach-ia";
import { colorFor, initialsOf } from "@/lib/entreprise-format";
import type { StudentAlert } from "@/lib/etudiant-data";
import { cn } from "@/lib/utils";

export interface ShellStudent {
  fullName: string;
  matricule: string;
  schoolName: string;
  fieldOfStudy: string;
  level: string;
  email: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string; stroke?: number }>;
}

const NAV_RECHERCHE: NavItem[] = [
  { href: "/etudiant/dashboard", label: "Tableau de bord", icon: IconLayoutDashboard },
  { href: "/etudiant/offres", label: "Offres de stage", icon: IconBriefcase },
  { href: "/etudiant/candidatures", label: "Mes candidatures", icon: IconClipboardList },
];

const NAV_CARRIERE: NavItem[] = [
  { href: "/etudiant/studio-ia", label: "Studio Carrière IA", icon: IconSparkles },
];

const NAV_STAGE: NavItem[] = [
  { href: "/etudiant/mon-stage", label: "Mon stage actif", icon: IconCalendarCheck },
  { href: "/etudiant/documents", label: "Documents & Conventions", icon: IconFiles },
];

const NAV_COMPTE: NavItem[] = [
  { href: "/etudiant/profil", label: "Mon profil académique", icon: IconSchool },
];

function AlertsMenu({ alerts }: { alerts: StudentAlert[] }) {
  const urgentCount = alerts.filter((a) => a.severity === "urgent").length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications (${alerts.length})`}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-slate-100"
        >
          <IconBell size={19} />
          {alerts.length > 0 ? (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
                urgentCount > 0 ? "bg-red-500" : "bg-gold",
              )}
            >
              {alerts.length}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-slate-200/80 p-2">
        <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
          Notifications ({alerts.length})
        </p>
        {alerts.length === 0 ? (
          <p className="px-2 py-3 text-sm text-body">Aucune alerte : tout est à jour, bravo !</p>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-brand-50"
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    alert.severity === "urgent" ? "bg-red-500" : "bg-gold",
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{alert.label}</span>
                  <span className="block text-xs leading-snug text-body">{alert.description}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/etudiant/offres?q=${encodeURIComponent(query.trim())}` : "/etudiant/offres");
  };
  return (
    <form onSubmit={onSubmit} className="relative hidden min-w-0 flex-1 max-w-md md:block" role="search">
      <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une offre, une entreprise, une ville…"
        aria-label="Recherche globale d'offres"
        className="h-9 w-full rounded-xl border border-slate-200/80 bg-slate-50 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:bg-white"
      />
    </form>
  );
}

export function EtudiantShell({
  student,
  alerts,
  children,
}: {
  student: ShellStudent;
  alerts: StudentAlert[];
  children: React.ReactNode;
}) {
  const [coachOpen, setCoachOpen] = useState(false);
  return (
    <SidebarProvider>
      {/* Sidebar mobile (portal Sheet) : fond de marque — règle scopée au shell */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            'div[data-slot="sidebar"][data-sidebar="sidebar"][data-mobile="true"]{background-color:#0B393C;color:#fff;border:none}',
        }}
      />
      <EtudiantShellInner student={student} alerts={alerts} setCoachOpen={setCoachOpen}>
        {children}
      </EtudiantShellInner>
      <CoachCarriereSheet open={coachOpen} onOpenChange={setCoachOpen} />
    </SidebarProvider>
  );
}

function EtudiantShellInner({
  student,
  alerts,
  setCoachOpen,
  children,
}: {
  student: ShellStudent;
  alerts: StudentAlert[];
  setCoachOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

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
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const initials = useMemo(() => initialsOf(student.fullName), [student.fullName]);

  return (
    <>
      {/* Sidebar mobile (portal Sheet) : fond de marque — règle scopée au shell */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            'div[data-slot="sidebar"][data-sidebar="sidebar"][data-mobile="true"]{background-color:#0B393C;color:#fff;border:none}',
        }}
      />
      <Sidebar
        collapsible="icon"
        className="border-none [&_[data-slot=sidebar-inner]]:border-none [&_[data-slot=sidebar-inner]]:bg-brand [&_[data-slot=sidebar-inner]]:text-white"
      >
        <SidebarHeader className="border-b border-white/10 px-3 py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="StageTrack — retour à l'accueil">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
              <img src="/logo-icon.png" alt="Logo StageTrack" className="h-7 w-7" />
            </span>
            {collapsed ? (
              <span className="sr-only">StageTrack</span>
            ) : (
              <span className="flex min-w-0 flex-col">
                <span className="inline-flex w-fit rounded-md bg-white px-2 py-1">
                  <img src="/logo-full.png" alt="StageTrack" className="h-4 w-auto" />
                </span>
                <span className="mt-1 text-[11px] font-medium text-white/60">Espace étudiant</span>
              </span>
            )}
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2 py-3">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Recherche
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(NAV_RECHERCHE)}</SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Carrière
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(NAV_CARRIERE)}</SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Mon stage
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(NAV_STAGE)}</SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Compte
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(NAV_COMPTE)}</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-white/10 p-3">
          <div className={cn("flex items-center gap-3 rounded-xl px-2 py-1.5", collapsed && "justify-center px-0")}>
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                colorFor(student.fullName),
              )}
            >
              {initials}
            </span>
            {!collapsed ? (
              <span className="min-w-0 flex-col">
                <span className="block truncate text-sm font-semibold text-white">{student.fullName}</span>
                <span className="block truncate text-[11px] text-white/60">{student.matricule}</span>
                <span className="block truncate text-[10px] text-white/45">{student.schoolName}</span>
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setCoachOpen(true)}
            className="group flex w-full items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-left transition-colors hover:bg-gold/20"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/25">
              <IconSparkles size={17} className="text-gold" />
            </span>
            {!collapsed ? (
              <span className="min-w-0 flex-1 flex-col">
                <span className="block truncate text-sm font-semibold text-gold">Coach Carrière IA</span>
                <span className="block truncate text-[11px] text-white/60">Groq · CV, lettre, entretien</span>
              </span>
            ) : null}
          </button>
          <Link
            href="/"
            className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IconWorld size={15} />
            {!collapsed ? "Voir le site public" : null}
          </Link>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-[#F8FAFC]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
          <SidebarTrigger className="!h-9 !w-9 !text-ink lg:hidden" aria-label="Ouvrir le menu" />
          <span className="hidden lg:inline-flex lg:h-9 lg:w-9" aria-hidden />
          <img src="/logo-full.png" alt="StageTrack" className="h-4 w-auto shrink-0 md:hidden" />
          <GlobalSearch />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:flex-none">
            <Badge variant="outline" className="hidden shrink-0 border-brand/20 bg-brand-50 text-[11px] text-brand lg:inline-flex">
              {student.level} — {student.fieldOfStudy}
            </Badge>
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
            <AlertsMenu alerts={alerts} />
            <Button
              type="button"
              onClick={() => setCoachOpen(true)}
              className="h-9 shrink-0 gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark sm:px-4"
            >
              <IconSparkles size={16} className="text-gold" />
              <span className="hidden sm:inline">Coach Carrière IA</span>
              <span className="sm:hidden">IA</span>
            </Button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <button
          type="button"
          onClick={() => setCoachOpen(true)}
          aria-label="Ouvrir le Coach Carrière IA"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition-transform hover:scale-105 hover:bg-brand-dark"
        >
          <IconSparkles size={24} className="text-gold" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-brand">
            IA
          </span>
        </button>
      </SidebarInset>
    </>
  );
}

/** Bandeau d'erreur de connexion mobile-friendly (utilisé par les modules si besoin). */
export function DbErrorInline({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <IconUserCircle size={28} className="mx-auto text-red-500" />
      <p className="mt-2 text-sm font-semibold text-red-700">Impossible de charger les données</p>
      <p className="mt-1 text-xs text-red-600">{message}</p>
    </div>
  );
}
