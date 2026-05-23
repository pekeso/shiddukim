# Shiddukim

**Plateforme de Gestion des Fidèles et Dossiers Matrimoniaux**

Shiddukim est une plateforme de gestion d'église en français. Elle gère :

- L'enregistrement et l'activation des fidèles
- Les dossiers matrimoniaux (demandes, suivi pastoral, classification)
- La prise de rendez-vous pastoraux
- La génération de documents officiels (PDF)
- Le stockage sécurisé de fichiers (Cloudflare R2)

## Stack

| Couche | Technologie |
|---|---|
| Backend | NestJS + TypeScript + Prisma + PostgreSQL + Redis |
| Frontend | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| Stockage | Cloudflare R2 (bucket privé, URLs signées) |
| Vérification | Twilio Verify (email en MVP) |
| Architecture | Monolithe modulaire |

## Structure du monorepo

```
shiddukim/
├── apps/
│   ├── backend/     # NestJS API — port 4000
│   └── frontend/    # Next.js web — port 3000
├── packages/
│   └── shared/      # Types et enums partagés (optionnel)
├── docs/
├── docker-compose.yaml
├── .env.example
└── README.md
```

## Démarrage rapide

```bash
# 1. Copier les variables d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# 2. Démarrer les services Docker
docker compose up -d

# 3. Lancer les migrations
cd apps/backend && npx prisma migrate dev

# 4. Peupler la base de données
npx prisma db seed
```

## Convention de commits

Ce projet utilise [Conventional Commits](https://www.conventionalcommits.org/) :
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`

## Branches

| Branche | Usage |
|---|---|
| `main` | Code prêt pour la production |
| `develop` | Branche d'intégration |
| `feature/phase-XX-name` | Une branche par phase |
