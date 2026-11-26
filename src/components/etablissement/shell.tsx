"use client";

/**
 * Shell du Dashboard Établissement — sidebar de marque + en-tête à double
 * vue (badge rôle actif, sélecteur de session démo Admin/Chef, Copilote IA).
 */
import { useState, useTransition, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconBuildingBank,
  IconChevronDown,
  IconCircleCheck,
  IconClipboardCheck,
  IconFiles,
  IconLayoutDashboard,
  IconLogout,
  IconReportAnalytics,
  IconRobotFace,
  IconSchool,
  IconSettings,
  IconSparkles,
  IconRepeat,
  IconWorld,
  IconBooks,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopiloteSheet } from "./ai-assistant";
import { switchEtablissementSession } from "@/app/etablissement/actions";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  /** Libellé spécifique pour le Maître de Mémoire (menu réduit). */
  supervisorLabel?: string;
  icon: ComponentType<{ size?: number | string; className?: string; stroke?: number }>;
  adminOnly?: boolean;
  chefOnly?: boolean;
  supervisorOnly?: boolean;
}

const NAV_MAIN: NavItem[] = [
  { href: "/etablissement/dashboard", label: "Tableau de bord", icon: IconLayoutDashboard },
  { href: "/etablissement/departements", label: "Départements & Chefs", icon: IconBuildingBank, adminOnly: true },
  { href: "/etablissement/encadreurs", label: "Maîtres de Mémoire", icon: IconBooks, chefOnly: true },
  { href: "/etablissement/etudiants", label: "Étudiants rattachés", icon: IconSchool },
  { href: "/etablissement/conventions", label: "Conventions & Visas", icon: IconClipboardCheck },
  { href: "/etablissement/suivi", label: "Suivi des Stages", supervisorLabel: "Journaux de bord", icon: IconFiles },
  { href: "/etablissement/evaluations", label: "Évaluations & Jury", supervisorLabel: "Évaluations & Attestations", icon: IconReportAnalytics },
  { href: "/etablissement/encadrement", label: "Mes Mémorants", supervisorLabel: "Mes Mémorants", icon: IconBooks, supervisorOnly: true },
  { href: "/etablissement/parametres", label: "Paramètres & Profil", supervisorLabel: "Mon Profil", icon: IconSettings },
];

export interface ShellSession {
  memberId: string;
  role: "ADMIN_SCHOOL" | "HEAD_OF_DEPARTMENT" | "ACADEMIC_SUPERVISOR";
  memberName: string;
  memberTitle: string | null;
  universityName: string;
  universityAcronym: string;
  departmentName: string | null;
  departmentCode: string | null;
}

export interface SessionOption {
  id: string;
  label: string;
  role: "ADMIN_SCHOOL" | "HEAD_OF_DEPARTMENT" | "ACADEMIC_SUPERVISOR";
  departmentCode: string | null;
}

export function EtablissementShell({
  session,
  sessionOptions,
  children,
}: {
  session: ShellSession;
  sessionOptions: SessionOption[];
  children: React.ReactNode;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  return (
    <SidebarProvider>
      {/* Sidebar mobile (portal Sheet) : fond de marque — règle scopée au shell */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            'div[data-slot="sidebar"][data-sidebar="sidebar"][data-mobile="true"]{background-color:#0B393C;color:#fff;border:none}',
        }}
      />
      <EtablissementShellInner session={session} sessionOptions={sessionOptions} setAiOpen={setAiOpen}>
        {children}
      </EtablissementShellInner>
      <CopiloteSheet open={aiOpen} onOpenChange={setAiOpen} />
    </SidebarProvider>
  );
}

function EtablissementShellInner({
  session,
  sessionOptions,
  setAiOpen,
  children,
}: {
  session: ShellSession;
  sessionOptions: SessionOption[];
  setAiOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isChef = session.role === "HEAD_OF_DEPARTMENT";
  const isSupervisor = session.role === "ACADEMIC_SUPERVISOR";

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const items = NAV_MAIN.filter((item) => {
    if (item.adminOnly) return session.role === "ADMIN_SCHOOL";
    if (item.chefOnly) return isChef;
    if (item.supervisorOnly) return isSupervisor;
    return !isSupervisor; // le Maître de Mémoire voit son menu réduit (4 pages)
  });
  const labelOf = (item: NavItem) => (isSupervisor && item.supervisorLabel ? item.supervisorLabel : item.label);
  /** Grade du Maître de Mémoire (partie du titre avant « — »), vide si c'est déjà « Maître de Mémoire » ou déjà dans le nom. */
  const supervisorGrade = (() => {
    const part = session.memberTitle?.split("—")[0]?.trim() ?? "";
    if (!part || part.toLowerCase() === "maître de mémoire") return "";
    if (session.memberName.toLowerCase().startsWith(part.toLowerCase())) return "";
    return part;
  })();

  const renderMenu = (viewItems: NavItem[]) => (
    <SidebarMenu>
      {viewItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={labelOf(item)}>
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
              <span>{labelOf(item)}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const switchSession = (optionId: string) => {
    startTransition(async () => {
      await switchEtablissementSession(optionId);
      // L'encadrement n'existe que pour un Maître de Mémoire : retour à son accueil sinon.
      const target = optionId === session.memberId ? pathname : "/etablissement/dashboard";
      router.push(target);
      router.refresh();
    });
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/auth");
      router.refresh();
    }
  };

  const activeOption = sessionOptions.find((o) => o.id === session.memberId);

  return (
    <>
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
                <span className="mt-1 truncate text-[11px] font-medium text-white/60">
                  Espace {session.universityAcronym}
                </span>
              </span>
            )}
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2 py-3">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Pilotage académique
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(items.slice(0, 4))}</SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Suivi & Jury
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(items.slice(4))}</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-white/10 p-3">
          <div className={cn("flex items-center gap-3 rounded-xl px-2 py-1.5", collapsed && "justify-center px-0")}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
              {isSupervisor ? (session.memberTitle ?? "MM").split(" ")[0].slice(0, 2).toUpperCase() : isChef ? session.departmentCode?.slice(0, 3) ?? "DPT" : "DS"}
            </span>
            {!collapsed ? (
              <span className="min-w-0 flex-col">
                <span className="block truncate text-sm font-semibold text-white">{session.memberName}</span>
                <span className="block truncate text-[11px] text-white/60">{session.memberTitle ?? "Membre"}</span>
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="group flex w-full items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-left transition-colors hover:bg-gold/20"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/25">
              <IconSparkles size={17} className="text-gold" />
            </span>
            {!collapsed ? (
              <span className="min-w-0 flex-1 flex-col">
                <span className="block truncate text-sm font-semibold text-gold">Copilote IA Académique</span>
                <span className="block truncate text-[11px] text-white/60">Groq · visas, cohortes</span>
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

          {/* Badge du rôle actif */}
          {isSupervisor ? (
            <Badge className="shrink-0 gap-1.5 rounded-lg bg-gold px-2.5 py-1 text-[11px] font-bold text-white hover:bg-gold-dark">
              <IconBooks size={13} />
              <span className="hidden max-w-[300px] truncate sm:inline">
                Maître de Mémoire — {supervisorGrade}
                {supervisorGrade ? " " : ""}
                {session.memberName}
              </span>
              <span className="sm:hidden">Mémoire</span>
            </Badge>
          ) : isChef ? (
            <Badge className="shrink-0 gap-1.5 rounded-lg bg-gold px-2.5 py-1 text-[11px] font-bold text-white hover:bg-gold-dark">
              <IconSchool size={13} />
              <span className="hidden sm:inline">Chef Dépt. {session.departmentCode}</span>
              <span className="sm:hidden">{session.departmentCode}</span>
            </Badge>
          ) : (
            <Badge className="shrink-0 gap-1.5 rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-dark">
              <IconBuildingBank size={13} />
              <span className="hidden sm:inline">Direction des Stages (Admin)</span>
              <span className="sm:hidden">Admin École</span>
            </Badge>
          )}

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {/* Déconnexion — session réelle */}
            <Button
              type="button"
              onClick={() => void logout()}
              variant="outline"
              className="h-9 shrink-0 gap-1.5 rounded-xl border-slate-200/80 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              <IconLogout size={15} />
              <span className="hidden md:inline">Déconnexion</span>
            </Button>

            {/* Sélecteur de session démo */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  className="h-9 shrink-0 gap-1.5 rounded-xl border-slate-200/80 bg-white px-2.5 text-[11px] font-semibold text-ink hover:bg-slate-50 sm:px-3 sm:text-xs"
                >
                  <IconRepeat size={14} className="text-gold" />
                  <span className="hidden max-w-[220px] truncate sm:inline">
                    {pending ? "Bascule…" : activeOption?.label ?? "Session démo"}
                  </span>
                  <span className="sm:hidden">Session</span>
                  <IconChevronDown size={13} className="shrink-0 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 border-slate-200/80 p-2">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Basculer de compte démo
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sessionOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => switchSession(option.id)}
                    className={cn(
                      "cursor-pointer gap-2 rounded-lg px-2 py-2 text-xs",
                      option.id === session.memberId && "bg-brand-50 font-semibold text-brand",
                    )}
                  >
                    {option.role === "ADMIN_SCHOOL" ? (
                      <IconBuildingBank size={15} className="shrink-0 text-brand" />
                    ) : option.role === "ACADEMIC_SUPERVISOR" ? (
                      <IconBooks size={15} className="shrink-0 text-gold-dark" />
                    ) : (
                      <IconSchool size={15} className="shrink-0 text-gold-dark" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.id === session.memberId ? <IconCircleCheck size={14} className="shrink-0 text-brand" /> : null}
                  </DropdownMenuItem>
                ))}
                <p className="px-2 pb-1 pt-2 text-[10px] leading-snug text-slate-400">
                  Testez immédiatement l&apos;isolation des données et les droits de signature de chaque rôle.
                </p>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              onClick={() => setAiOpen(true)}
              className="h-9 shrink-0 gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark sm:px-4"
            >
              <IconRobotFace size={16} className="text-gold" />
              <span className="hidden sm:inline">Copilote IA</span>
              <span className="sm:hidden">IA</span>
            </Button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <button
          type="button"
          onClick={() => setAiOpen(true)}
          aria-label="Ouvrir le Copilote IA Académique"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition-transform hover:scale-105 hover:bg-brand-dark"
        >
          <IconRobotFace size={24} className="text-gold" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-brand">
            IA
          </span>
        </button>
      </SidebarInset>
    </>
  );
}

/** Bandeau d'erreur de connexion (utilisé par le layout si la base est inaccessible). */
export function EtabDbError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
          <IconBuildingBank size={26} className="text-brand" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">Connexion à la base impossible</h1>
        <p className="mt-2 text-sm leading-relaxed text-body">
          L&apos;espace établissement nécessite la base <strong>PostgreSQL / Neon</strong>. Vérifiez que les variables
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">DATABASE_URL</code> et
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">DIRECT_URL</code>
          sont définies dans votre fichier <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env</code>,
          puis exécutez <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npx prisma db push</code>.
        </p>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-500">{message}</p>
      </div>
    </div>
  );
}
