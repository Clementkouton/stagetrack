# StageTrack — Plateforme complète de gestion des stages (PostgreSQL / Neon)

Application **100 % française** de gestion des stages au Bénin : landing page publique, **Dashboard Entreprise**, **Dashboard Étudiant** et **Dashboard Établissement (Université → Départements → Chefs de Département → Étudiants)**, connectés à **PostgreSQL / Neon** via Prisma et propulsés par les **modèles de production Groq**.

> Stack : **Next.js 16 (App Router)** · **TypeScript 5 strict** · **Tailwind CSS 4** · **shadcn/ui** · **Prisma + PostgreSQL/Neon** · **Recharts** · **Groq SDK** · **@tabler/icons-react**

---

## 1. Prérequis

| Outil | Version minimale | Téléchargement |
|---|---|---|
| **Node.js** | 20.x (LTS) | https://nodejs.org |
| **npm** (inclus avec Node) | 10.x | — |
| **VS Code** | dernière | https://code.visualstudio.com |
| **Compte Neon** (gratuit) | — | https://neon.tech |
| **Clé Groq** (optionnelle) | — | https://console.groq.com/keys |

---

## 2. Configuration de la base (Neon)

1. Créez un projet sur **https://neon.tech** (ex. `stagetrackdb`).
2. Récupérez les deux chaînes de connexion :
   - **Pooled** (hôte avec `-pooler`) → `DATABASE_URL` ;
   - **Direct** (sans `-pooler`) → `DIRECT_URL`.
3. Copiez `.env.example` vers `.env` et renseignez :

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/stagetrackdb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/stagetrackdb?sslmode=require"
GROQ_API_KEY=
```

> Le fichier `.env` est ignoré par Git — ne le commitez jamais.

---

## 3. Installation et initialisation

```powershell
npm install          # installe les dépendances + génère le client Prisma (postinstall)
npx prisma db push   # crée toutes les tables sur votre base Neon
npm run db:seed      # seed Entreprise : KKiaPay, offres, 68 candidatures, 12 stagiaires…
```

**Aucun autre seed n'est nécessaire** : les espaces Étudiant et Établissement s'auto-alimentent
au premier chargement (seeds idempotents intégrés aux Server Actions) :
- l'espace **Étudiant** crée l'étudiant de démonstration `IFRI-2026-042` (Sènami Djogbenou) avec ses candidatures, son stage actif (semaine 6/12), sa convention à signer et son stage terminé (évaluation + attestation) ;
- l'espace **Établissement** crée l'université **INSTI Lokossa** avec son Admin (Direction des Stages), **4 départements** (GEI, GC, GMP, GL) et leurs **Chefs de Département**, **15 étudiants** (`INSTI-2026-001` → `015`), 6 stages actifs + 2 terminés avec conventions aux différents états du circuit à 4 étapes.

---

## 4. Lancer le projet

```powershell
npm run dev
```

| Route | Description |
|---|---|
| `/` | Landing page publique |
| `/auth` | Sélection du rôle + **connexion / inscription réelles** (JWT `jose` + scrypt) |
| `/api/auth/login` · `/api/auth/logout` · `/api/auth/me` · `/api/auth/register` | Endpoints d'authentification (cookie httpOnly `stagetrack_session`) |
| **Espace Entreprise** | |
| `/entreprise/dashboard` | KPIs (4 / 68 / 12 / 3) + graphique Recharts |
| `/entreprise/offres` | Offres de stage + création assistée IA |
| `/entreprise/candidatures` | Pipeline ATS Kanban + analyse IA des candidats |
| `/entreprise/stagiaires` | Fiches 360° des stagiaires |
| `/entreprise/suivi` | Missions, présences, journaux hebdo |
| `/entreprise/documents` | Conventions tripartites + attestations |
| `/entreprise/evaluations` | Grille /5 + appréciation IA |
| `/entreprise/parametres` | Équipe RH/tuteurs + vitrine |
| **Espace Étudiant** | |
| `/etudiant/dashboard` | KPIs, évolution des candidatures, alertes |
| `/etudiant/offres` | Offres + **score de compatibilité IA** + postulation 1 clic |
| `/etudiant/candidatures` | Kanban 6 colonnes + relances IA |
| `/etudiant/studio-ia` | Optimiseur CV, Générateur de lettre, Simulateur d'entretien |
| `/etudiant/mon-stage` | Missions, pointage présence, journal de bord (structuration IA) |
| `/etudiant/documents` | Signature convention + coffre-fort documentaire |
| `/etudiant/profil` | **Cascade Université → Département → Spécialité → Niveau** + carte du Chef de Département assigné |
| **Espace Établissement** | |
| `/etablissement/dashboard` | KPIs (Étudiants, Taux de placement, Conventions en attente, Stages actifs) + graphique par département (Admin) ou par niveau (Chef) + file d'actions |
| `/etablissement/departements` | *(Admin)* Cartes + tableau, **création Département + Chef avec identifiants générés**, réinitialisation de mot de passe, remplacement de chef |
| `/etablissement/etudiants` | Recherche + filtres (département, spécialité, niveau, statut) + fiche complète en tiroir |
| `/etablissement/conventions` | **Circuit à 4 étapes** : Étudiant → Entreprise → **Visa Chef de Département** → **Signature Direction** + analyse IA d'adéquation pédagogique |
| `/etablissement/suivi` | Progression (semaine X/12), taux de présence, journaux hebdo en modale |
| `/etablissement/evaluations` | Notes des maîtres de stage, **export PV Jury CSV**, téléchargement des attestations |
| `/etablissement/encadrement` | *(Maître de Mémoire)* Mémoires supervisés : intitulé, progression, journaux, évaluation entreprise |
| `/etablissement/parametres` | *(Admin)* Nom, sigle, ville — *(Chef / Maître de Mémoire)* « Mon profil » : changement de mot de passe + onboarding |

---

## 5. Authentification réelle (JWT + scrypt) & permissions

### Architecture

| Brique | Fichier | Rôle |
|---|---|---|
| Hachage des mots de passe | `src/lib/password.ts` | **crypto.scrypt natif Node.js** (`scrypt:<salt>:<hash>`, timingSafeEqual) |
| Jetons de session | `src/lib/jwt.ts` | JWT **HS256 signé avec `jose`** (Edge-compatible), cookie httpOnly `stagetrack_session` (7 jours) |
| Session serveur | `src/lib/session.ts` | `getSessionUser()` + périmètres `getStudentScope()` / `getCompanyScope()` / `getUniversityScope()` |
| Protection des routes | `src/proxy.ts` (ex-middleware Next 16) | Vérifie le JWT, **bloque les accès non authentifiés** (`/etudiant/*`, `/entreprise/*`, `/etablissement/*` → `/auth`), **empêche le cross-rôle** et force l'**onboarding** quand `profileCompleted === false` |
| Endpoints | `src/app/api/auth/*` | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me` |

### Flux « première connexion » (`profileCompleted`)

1. Un compte fraîchement inscrit (ou un Chef créé par la Direction) a `profileCompleted = false` ;
2. Le proxy **redirige obligatoirement** vers la page de mise à jour du profil avec `?onboarding=1` :
   étudiant → `/etudiant/profil`, entreprise → `/entreprise/parametres`, université → `/etablissement/parametres` ;
3. L'enregistrement passe le flag à `true` en base, **re-signe le cookie JWT** et redirige vers le dashboard.

### Filtrage par rôle dans les Server Actions

L'isolation est appliquée **côté serveur** dans chaque requête Prisma et chaque Server Action ; les entrées de menu réservées disparaissent de la navigation :

| Espace | Rôle | Périmètre |
|---|---|---|
| Entreprise | `ADMIN_RH` | Toute la société |
| Entreprise | `TUTEUR` | **Uniquement ses stagiaires encadrés** (`intern.tutorId`) |
| Université | `ADMIN_SCHOOL` (badge vert sapin) | Toute l'université — signature officielle des conventions |
| Université | `HEAD_OF_DEPARTMENT` (badge or) | **Son département** (`departmentId`) — visa pédagogique |
| Université | `THESIS_SUPERVISOR` (badge or) | **Ses mémoires supervisés** (`thesisSupervisorId`) |

Le **sélecteur de session** du header Établissement permet de prévisualiser un autre compte **du même établissement** (cookie de prévisualisation ; la session JWT reste la source de vérité).

### Comptes de démonstration (mot de passe : `StageTrack@2026!`)

| Espace | Identifiant | Rôle |
|---|---|---|
| Étudiant (matricule) | `INSTI-2026-001` … `INSTI-2026-015` | Étudiant INSTI |
| Étudiant (matricule) | `IFRI-2026-042` | Étudiant démo (mot de passe `demo1234`) |
| Entreprise | `marcelle.ahouansou@kkiapay.me` (ADMIN_RH), `serge.dossou@kkiapay.me` (TUTEUR) | KKiaPay (mot de passe `demo1234`) |
| Université | `stages@insti-lokossa.bj` | **Admin Université** (Direction des Stages) |
| Université | `chef.gei@insti-lokossa.bj` (Nadège Ahouansou), `chef.gc@…`, `chef.gmp@…`, `chef.gl@…` | **Chefs de Département** |
| Université | `memoire.gei@insti-lokossa.bj` (Prof. Léonce Hounsou) | **Maître de Mémoire** (encadrement) |

À la création d'un nouveau Chef via la modale « Créer un Département & son Chef », un **mot de passe temporaire aléatoire** est généré et affiché dans un encadré sécurisé avec bouton « Copier les identifiants » — sa première connexion force la confirmation du profil (onboarding).

---

## 6. Fonctionnalités IA (Groq)

| Espace | Fonction | Modèle |
|---|---|---|
| Entreprise | Copilote RH, génération d'offres, analyse candidature, tâches hebdo, appréciations | 120b / 20b |
| Étudiant | Coach Carrière (chat), optimisation CV, lettre de motivation, simulation d'entretien notée, relances, structuration du journal | 120b / 20b |
| Établissement | **Adéquation pédagogique** (score /100 + avis + recommandations), **rapport de cohorte**, **Copilote IA Académique** (prompts rapides) | 120b / 20b |

**Modèles de production** : `openai/gpt-oss-120b` (repli `llama-3.3-70b-versatile`) pour les tâches complexes, `openai/gpt-oss-20b` (repli `llama-3.1-8b-instant`) pour le temps réel.

**Sans clé `GROQ_API_KEY`**, l'application **ne casse pas** : chaque fonction bascule en « mode dégradé local » avec des contenus de repli français déterministes, clairement indiqués dans l'interface.

---

## 7. Scripts npm

| Commande | Action |
|---|---|
| `npm run dev` | Serveur de développement (http://localhost:3000) |
| `npm run build` | Build de production |
| `npm start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm run db:push` | Synchronise le schéma Prisma avec Neon |
| `npm run db:generate` | Régénère le client Prisma |
| `npm run db:seed` | Seed Entreprise (KKiaPay) |
| `npm run db:migrate` | Crée une migration (`prisma migrate dev`) |

---

## 8. Structure du projet

```
prisma/schema.prisma             # Schéma PostgreSQL/Neon (17 modèles + enums Role, UniversityMemberRole) — User.profileCompleted
src/lib/db.ts                    # Client Prisma (singleton, robuste aux .env du sandbox)
src/lib/groq.ts                  # Client Groq mutualisé (bascule primaire → repli)
src/lib/groq-fallback.ts         # Replis « mode dégradé » Entreprise
src/lib/groq-etudiant.ts         # Prompts + replis Étudiant
src/lib/groq-etablissement.ts    # Prompts + replis Établissement (fit, cohorte, copilote)
src/lib/etudiant-seed.ts         # Auto-seed Étudiant (IFRI-2026-042)
src/lib/etablissement-seed.ts    # Auto-seed Établissement (INSTI Lokossa)
src/lib/etudiant-data.ts         # Requêtes/alertes Étudiant
src/lib/etudiant-format.ts       # Helpers purs client-safe (compatScore, scoreTone)
src/lib/etablissement-data.ts    # Contexte de session (JWT + prévisualisation) + requêtes des 8 vues
src/lib/password.ts              # crypto.scrypt natif (hash + vérification)
src/lib/jwt.ts                   # JWT jose (HS256) du cookie stagetrack_session
src/lib/session.ts               # getSessionUser() + périmètres de rôle (Étudiant/Entreprise/Université)
src/lib/session-types.ts         # Types partagés de session
src/proxy.ts                     # Protection des routes (JWT, rôles, onboarding profileCompleted)
src/app/api/{entreprise,etudiant,etablissement}/ai/  # Endpoints IA Groq
src/app/entreprise/              # Layout + 8 pages + actions.ts
src/app/etudiant/                # Layout + 8 pages + actions.ts
src/app/etablissement/           # Layout + 8 pages + actions.ts (permissions Admin/Chef/Maître de Mémoire)
src/app/api/auth/                # login · logout · me · register (scrypt + JWT)
src/components/{entreprise,etudiant,etablissement}/  # Shells + composants client
scripts/seed-entreprise.ts       # Seed complet Entreprise (npm/tsx/bun)
```

**Modèles clés du schéma** : `User` (`profileCompleted`, `passwordHash` scrypt), `UniversityProfile`, `Department` (spécialités `String[]`), `UniversityMember` (`ADMIN_SCHOOL` / `HEAD_OF_DEPARTMENT` / `THESIS_SUPERVISOR`), `StudentProfile` (`universityId`, `departmentId`, `specialty`), `Company`, `TeamMember` (`userId`), `Offer`, `Candidature`, `Intern` (`departmentId`, `thesisSupervisorId`, `thesisTitle`), `InternshipTask`, `PresenceSheet`, `WeeklyJournal`, `Convention` (circuit : `signedStudent` → `signedCompany` → `pedagogicalApproved` → `signedUniversity`), `Evaluation`, `Attestation`, `StudentDocument`.

---

## 9. Dépannage

| Problème | Solution |
|---|---|
| `P1001: Can't reach database server` | Vérifiez `DIRECT_URL`/`DATABASE_URL`, et que votre Neon n'est pas suspendu |
| `P1012: Environment variable not found` | Le fichier `.env` est absent ou incomplet (refaire l'étape 2) |
| `Error: the URL must start with postgresql://` | Une ancienne variable `DATABASE_URL` est exportée dans votre terminal → fermez et rouvrez le terminal |
| `P2021: Table does not exist` | Lancez `npx prisma db push` |
| Dashboard Établissement vide | Ouvrez simplement `/etablissement/dashboard` : le seed auto se déclenche au premier chargement |
| L'IA répond « mode dégradé » | Ajoutez `GROQ_API_KEY` dans `.env` puis redémarrez `npm run dev` |
| Port 3000 occupé | `npx kill-port 3000` ou changez le port : `npm run dev -- -p 3001` |
