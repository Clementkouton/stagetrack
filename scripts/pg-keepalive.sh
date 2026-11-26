#!/bin/bash
# Redémarre le PostgreSQL embarqué du preview sandbox si le port 5432 est fermé.
# (Sandbox uniquement — sur la machine de l'utilisateur, Neon est utilisé.)
if (exec 3<>/dev/tcp/127.0.0.1/5432) 2>/dev/null; then
  echo "PG déjà actif"
  exit 0
fi
exec 3>&- 2>/dev/null
cd /home/z/pg-embed || exit 1
nohup bun run start-pg.ts > pg.log 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  if (exec 4<>/dev/tcp/127.0.0.1/5432) 2>/dev/null; then
    echo "PG redémarré"
    exit 0
  fi
done
echo "PG introuvable — voir /home/z/pg-embed/pg.log"
exit 1
