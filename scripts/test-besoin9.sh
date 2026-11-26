#!/bin/bash
# Tests end-to-end StageTrack — Besoin 9 (espaces encadrants)
BASE=http://localhost:3000
JAR() { echo "/tmp/cookies-$1.txt"; }

echo "=== 1. Connexion Maître de Mémoire (onboarding attendu) ==="
curl -s -c $(JAR sup) -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"memoire.gei@insti-lokossa.bj","password":"StageTrack@2026!","space":"etablissement"}' | head -c 400
echo; echo

echo "=== 2. Redirection onboarding (profileCompleted=false) ==="
curl -s -b $(JAR sup) -o /dev/null -w "GET /etablissement/dashboard → %{http_code} → %{redirect_url}\n" $BASE/etablissement/dashboard
curl -s -b $(JAR sup) -o /dev/null -w "GET /etablissement/parametres?onboarding=1 → %{http_code}\n" "$BASE/etablissement/parametres?onboarding=1"

echo; echo "=== 3. Chef de Département ==="
curl -s -c $(JAR chef) -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"chef.gei@insti-lokossa.bj","password":"StageTrack@2026!","space":"etablissement"}' | head -c 300
echo
curl -s -b $(JAR chef) -o /dev/null -w "GET /etablissement/dashboard → %{http_code}\n" $BASE/etablissement/dashboard
curl -s -b $(JAR chef) -o /dev/null -w "GET /etablissement/encadreurs → %{http_code} (attendu 200)\n" $BASE/etablissement/encadreurs
curl -s -b $(JAR chef) -o /dev/null -w "GET /etablissement/departements → %{http_code} → %{redirect_url} (interdit au chef)\n" $BASE/etablissement/departements
curl -s -b $(JAR chef) $BASE/etablissement/encadreurs | grep -o "Maîtres de Mémoire" | head -1
curl -s -b $(JAR chef) $BASE/etablissement/encadreurs | grep -o "Prof. Léonce Hounsou" | head -1

echo; echo "=== 4. Admin Université (règles d'isolation) ==="
curl -s -c $(JAR admin) -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"stages@insti-lokossa.bj","password":"StageTrack@2026!","space":"etablissement"}' | head -c 300
echo
curl -s -b $(JAR admin) -o /dev/null -w "GET /etablissement/encadreurs → %{http_code} → %{redirect_url} (réservé au chef)\n" $BASE/etablissement/encadreurs
curl -s -b $(JAR admin) -o /dev/null -w "GET /etablissement/departements → %{http_code} (autorisé admin)\n" $BASE/etablissement/departements

echo; echo "=== 5. Maître de Mémoire : isolation (encadrement) ==="
curl -s -b $(JAR sup) "$BASE/etablissement/encadrement" > /tmp/sup-enc.html
curl -s -b $(JAR sup) -o /dev/null -w "GET /etablissement/encadrement → %{http_code}\n" $BASE/etablissement/encadrement
grep -o "Mes Mémorants" /tmp/sup-enc.html | head -1
grep -o "Rodrigue Ahouandjinou" /tmp/sup-enc.html | head -1
grep -o "Thème à valider" /tmp/sup-enc.html | head -1
grep -o "Serge Dossou" /tmp/sup-enc.html | head -1

echo; echo "=== 6. Tuteur Entreprise ==="
curl -s -c $(JAR tut) -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"serge.dossou@kkiapay.me","password":"demo1234","space":"entreprise"}' | head -c 300
echo
curl -s -b $(JAR tut) -o /dev/null -w "GET /entreprise/dashboard → %{http_code}\n" $BASE/entreprise/dashboard
curl -s -b $(JAR tut) -o /dev/null -w "GET /entreprise/offres → %{http_code} → %{redirect_url} (interdit au tuteur)\n" $BASE/entreprise/offres
curl -s -b $(JAR tut) -o /dev/null -w "GET /entreprise/candidatures → %{http_code} → %{redirect_url} (interdit au tuteur)\n" $BASE/entreprise/candidatures
curl -s -b $(JAR tut) -o /dev/null -w "GET /entreprise/documents → %{http_code} → %{redirect_url} (interdit au tuteur)\n" $BASE/entreprise/documents
curl -s -b $(JAR tut) $BASE/entreprise/dashboard > /tmp/tut-dash.html
grep -o "Tableau de bord Tuteur" /tmp/tut-dash.html | head -1
grep -o "Tuteur / Maître de Stage" /tmp/tut-dash.html | head -1
curl -s -b $(JAR tut) $BASE/entreprise/stagiaires > /tmp/tut-stag.html
grep -o "Encadrement académique" /tmp/tut-stag.html | head -1
curl -s -b $(JAR tut) $BASE/entreprise/parametres > /tmp/tut-par.html
grep -o "Mon Profil" /tmp/tut-par.html | head -1

echo; echo "=== 7. Admin RH (inchangé — non régression) ==="
curl -s -c $(JAR rh) -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"marcelle.ahouansou@kkiapay.me","password":"demo1234","space":"entreprise"}' | head -c 300
echo
curl -s -b $(JAR rh) -o /dev/null -w "GET /entreprise/dashboard → %{http_code}\n" $BASE/entreprise/dashboard
curl -s -b $(JAR rh) -o /dev/null -w "GET /entreprise/offres → %{http_code} (autorisé)\n" $BASE/entreprise/offres
curl -s -b $(JAR rh) $BASE/entreprise/dashboard | grep -o "Offres actives" | head -1

echo; echo "=== 8. Étudiant (non-régression) ==="
curl -s -c $(JAR etu) -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"INSTI-2026-001","password":"StageTrack@2026!","space":"etudiant"}' | head -c 200
echo
curl -s -b $(JAR etu) -o /dev/null -w "GET /etudiant/dashboard → %{http_code}\n" $BASE/etudiant/dashboard

echo; echo "=== 9. API IA établissement (mode thesis) ==="
curl -s -b $(JAR sup) -X POST $BASE/api/etablissement/ai \
  -H "Content-Type: application/json" \
  -d '{"mode":"thesis","payload":{"studentName":"Rodrigue Ahouandjinou","level":"Master 1","specialty":"Réseaux","companyName":"KKiaPay","position":"Stagiaire DevOps & Sécurité Cloud","thesisTitle":"Sécurisation des infrastructures cloud des fintechs","thesisTopic":"Comment sécuriser les infrastructures cloud des fintechs ouest-africaines ?"}}' | head -c 300
echo
