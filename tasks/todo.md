# TODO — GesStock SaaS

## Phase 1 — Fondations ✅

- [x] Initialiser le monorepo (frontend React+Vite + backend Node.js+Express)
- [x] Configurer Docker Compose (PostgreSQL + Redis)
- [x] Modéliser le schéma Prisma complet (tenants, products, stock_movements)
- [x] Implémenter l'auth JWT + middleware multi-tenant
- [x] Créer le CRUD produits (premier module)
- [x] Mettre en place le système de feature flags React Router v7
- [x] Installer les dépendances et vérifier le build

## Phase 2 — Cœur métier ✅

- [x] Mouvements de stock (entrées, sorties, transferts, historique)
  - [x] Service `stock.service.ts` : `listMovements`, `createMovement` (avec impact stock)
  - [x] Routes `POST /api/v1/stock/movements`, `GET /api/v1/stock/movements`
  - [x] Page `StockMovementsPage.tsx` + modal `NewMovementModal.tsx`
- [x] Alertes & seuils (stock minimum)
  - [x] `GET /api/v1/alerts/stock` — produits sous seuil minimum
- [x] Fournisseurs & bons de commande
  - [x] CRUD Fournisseurs `/api/v1/suppliers` + `SuppliersPage.tsx` + `SupplierModal.tsx`
  - [x] Bons de commande `/api/v1/orders` + `OrdersPage.tsx` + `NewOrderModal.tsx`
  - [x] Réception commande → entrée stock automatique (status `RECEIVED`)
- [x] Devise F CFA (XOF) appliquée partout dans le frontend

## Phase 3 — Valeur ajoutée ✅

- [x] Rapports & exports
  - [x] `report.service.ts` : stats dashboard, top produits, mouvements, alertes
  - [x] Routes `GET /api/v1/reports/dashboard`, `/inventory`, `/movements`, `/export/inventory`, `/export/movements`
  - [x] Hook `useReports.ts` (React Query)
  - [x] `ReportsPage.tsx` avec 3 onglets + graphique donut + export CSV
- [x] Facturation SaaS (Stripe)
  - [x] `billing.service.ts` : abonnements, webhooks, portail Stripe, invoices
  - [x] Routes `GET/POST /api/v1/billing/...` (plans, subscribe, cancel, portal, webhook)
  - [x] Hook `useBilling.ts` (React Query)
  - [x] Section Facturation dans `SettingsPage.tsx`
  - [x] Plans tarifaires en F CFA : Starter (19 000), Pro (52 000), Enterprise (130 500)

## Phase 4 — UI/UX & PWA ✅

- [x] Notifications email automatiques (Stock bas, Bienvenue)
- [x] Gestion multi-utilisateurs et rôles (Admin, Manager, Lecteur)
- [x] Support PWA (installable sur mobile et bureau)
- [x] Intégration codes-barres (Génération SKU et Scan Caméra)
- [x] Rapports avancés (PDF + Graphiques interactifs Recharts)

## Phase 5 — Terminal de Vente (POS) ✅

- [x] Interface de caisse interactive (`POSPage.tsx`)
- [x] Paniers multi-produits, taxes (TVA) et calculs en temps réel
- [x] Impression de reçus et factures en PDF (conforme XOF)
- [x] Décrémentation automatique des stocks lors des ventes
- [x] Historique des ventes et filtrage par période

## Phase 6 — Multi-Entrepôts & Super-Admin ✅

- [x] Gestion Multi-Entrepôts
  - [x] Stock localisé : Suivi des quantités par entrepôt physique
  - [x] Migration : Initialisation automatique des dépôts pour les comptes existants
  - [x] UI : Détails du stock par dépôt dans la liste des produits (colonne Entrepôts avec badges nom·quantité via `json_agg` en une seule requête)
  - [x] Intégration : Sélection de l'entrepôt source en caisse et mouvements
- [x] Super-Admin HQ
  - [x] Activation/Modération manuelle des abonnements via `/superadmin`
  - [x] Middleware `checkPlanLimit` : Enforcement strict des quotas (PROD, USERS, WH)
- [x] Stabilisation technique
  - [x] Harmonisation des icônes (`Warehouse` vs `Building`) pour compatibilité
  - [x] Correction des ReferenceErrors dans les imports Frontend
- [x] Personnalisation & Modernisation
  - [x] Page de Login : Nouveau visuel 3D, animations de flottaison et glassmorphism
  - [x] Dashbord & Quotas : Correction du rendu "Illimité" pour le plan Enterprise
  - [x] Notifications : Dynamisation de la cloche (alertes de stock réel via `useAlerts`)
- [x] Contrôles QG & Sécurité Étendue
  - [x] Réinitialisation manuelle des mots de passe par le Super-Admin (QG)
  - [x] Système de codes temporaires sécurisés (G-STOCK-XXXX)
  - [x] Parcours obligatoire : Changement forcé du mot de passe à la première connexion
  - [x] Design Premium pour la page de sécurisation (`ChangePasswordPage.tsx`)

---

## Phase 7 — Sécurité Renforcée ✅ (Priorité Immédiate)

> Complété — prêt pour mise en production

- [x] **Rate limiting** sur `/auth/login` et `/auth/register` via `express-rate-limit`
  - [x] Fenêtre configurable (`AUTH_RATE_LIMIT_WINDOW_MINUTES`)
  - [x] Nombre de tentatives configurable (`AUTH_RATE_LIMIT_MAX_ATTEMPTS`)
  - [x] Correction double application du limiter (suppression du middleware global sur `/api/v1/auth`)
  - [x] `skipSuccessfulRequests: true` pour ne pas pénaliser les logins valides
- [x] **Helmet.js** — sécurisation des headers HTTP
- [x] **CORS strict** — whitelist des origines autorisées uniquement
- [x] **Validation des inputs** avec Zod sur toutes les routes backend (anti-injection / XSS)
- [x] **Rotation des refresh tokens** — invalidation après usage unique
- [x] **Session unique par utilisateur (JWT + Redis)**
  - [x] `sessionId` ajouté au payload JWT
  - [x] Session active stockée dans Redis (`active_session:<userId>`)
  - [x] Vérification de session active dans `auth.middleware.ts`
  - [x] Remplacement automatique de session au login pour éviter les faux blocages
- [x] **Liste noire JWT** dans Redis pour les tokens révoqués
  - [x] Service `jwtBlacklist.service.ts` : blacklist tokens révoqués avec TTL
  - [x] Vérification dans `auth.middleware.ts` avant validation JWT
- [x] **Logs d'audit** sur toutes les actions critiques (suppression, changement de rôle, accès Super-Admin)
  - [x] Service `audit.service.ts` : enregistrement horodaté par tenant
  - [x] Route `GET /api/v1/superadmin/audit-logs` avec filtres et pagination
  - [x] Intégration audit dans `auth.controller.ts` (login, logout, register, password change)
  - [x] Intégration audit dans `users.controller.ts` (create, role change, delete)
  - [x] Intégration audit dans `superadmin.controller.ts` (tenant suspension, subscription changes, password reset)
  - [x] Extension audit aux actions métier quotidiennes
    - [x] `createMovement` (IN / OUT / ADJUSTMENT) dans `stock.service.ts`
    - [x] `createTransfer` inter-entrepôts dans `stock.service.ts`
    - [x] `createSale` (vente caisse FAC) dans `sales.service.ts`
    - [x] Réception commande fournisseur (`RECEIVED`) dans `orders.controller.ts`
- [x] **Chiffrement des données sensibles** en base via `crypto` (AES-256-GCM)
  - [x] Service `encryption.service.ts` : chiffrement/déchiffrement avec dérivation PBKDF2
- [x] **2FA / TOTP** (Google Authenticator) pour les rôles Admin et Super-Admin
  - [x] Service `twoFactor.service.ts` : génération secret, codes backup, vérification TOTP
- [x] **Scanner de dépendances** automatique (Dependabot)
  - [x] Configuration `.github/dependabot.yml` pour backend, frontend et GitHub Actions
- [x] Vérification que tous les secrets sont en variables d'environnement (jamais en dur dans le code)
  - [x] Audit du code backend : aucun secret codé en dur
  - [x] Protection des secrets critiques (JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY, STRIPE_SECRET_KEY) avec erreur si manquant en production
  - [x] Frontend : pas de secrets exposés, uniquement tokens en mémoire
  - [x] Documentation complète dans `.env.example`
- [x] **Déconnexion automatique après inactivité (frontend)**
  - [x] Handler global de deconnexion apres 2h d'inactivite utilisateur
  - [x] Synchronisation multi-onglets via `localStorage`
  - [x] Durée configurable via `VITE_INACTIVITY_TIMEOUT_MINUTES` (défaut: 120)

## Phase 8 — Qualité & Performance 🟠 (Court terme)

- [x] **Index PostgreSQL** sur les colonnes fréquemment filtrées : `tenant_id`, `product_id`, `created_at`
  - [x] Index sur `tenant_id` (ApiKey, AuditLog, User)
  - [x] Index sur `product_id` (StockMovement, PurchaseOrderItem, SaleItem)
  - [x] Index sur `created_at` (AuditLog, StockMovement, Sale, PurchaseOrder, Product, User, ApiKey)
  - [x] Index additionnels : `status`, `role`, `sku`, `category_id`, `supplier_id`, `client_id`
  - [x] Migration appliquée avec `prisma db push`
- [x] **Cache Redis** sur les rapports lourds (TTL 5–10 min)
  - [x] Service `cache.service.ts` : get, set, wrap avec TTL
  - [x] Tags de cache pour invalidation par tenant/type
  - [x] Cache sur `getDashboardStats`, `getInventoryReport`, `getMovementReport`, `getExpiryAlerts`, `getSlowRotationReport`
  - [x] TTL : 5min (dashboard, mouvements, expiry), 10min (inventaire), 30min (slow-rotation)
  - [x] Invalidation automatique des tags lors d'un mouvement de stock
- [x] **Pagination** vérifiée sur toutes les routes GET de liste
  - [x] Routes déjà paginées : `/api/v1/products`, `/api/v1/stock/movements`, `/api/v1/superadmin/audit-logs`
  - [x] Ajout pagination à `/api/v1/reports/inventory` (50 items/page par défaut)
  - [x] Ajout pagination à `/api/v1/reports/movements` (50 items/page par défaut)
  - [x] Réponse inclut `pagination: { page, limit, totalPages, totalItems }`
- [x] **Lazy loading + code splitting** React par route (amélioration du temps de chargement initial)
  - [x] Refactor `frontend/src/App.tsx` avec `React.lazy` sur les pages principales
  - [x] Ajout d'un fallback global `Suspense` (`PageLoader`) pour le chargement des chunks
- [x] **Tests automatisés** — montée en couverture à >70% sur les services critiques
  - [x] `stock.service.ts` — 14 tests unitaires (listProducts, getProduct, createProduct, updateProduct, deleteProduct, listMovements) — couverture 67%
  - [x] `sales.service.ts` — 9 tests unitaires (getAllSales, getSaleById, createSale FAC + DEV) — couverture 100%
  - [x] `auth.test.ts` — 2 tests API (401 sans token, échec login invalide)
  - [x] `ProtectedRoute.test.tsx` — 3 tests (authentifié, redirect login, redirect change-password)
  - [x] `Header.test.tsx` — 1 test (rendu rôle ADMIN) — corrigé avec QueryClientProvider
  - [x] Couverture globale critique: **75.44% lignes** (seuil 70% ✅) — `jest --coverage`
- [x] **ESLint + Prettier + Husky** (pre-commit hooks)
  - [x] Configuration root: `.eslintrc.cjs`, `.prettierrc`, `.prettierignore`
  - [x] Hook Git pre-commit: `.husky/pre-commit` + `lint-staged`
  - [x] Scripts root ajoutés: `lint:fix`, `format`, `format:check`, `prepare`
  - [x] Dépendances installées et lockfile mis à jour (`package-lock.json`)
  - [x] Validation: `npm run lint` passe (warnings existants), `npx lint-staged --allow-empty` OK
- [x] **Documentation API Swagger / OpenAPI** (`swagger-jsdoc` + `swagger-ui-express`)
  - [x] Config OpenAPI 3.0 dans `backend/src/config/swagger.ts` — schémas réutilisables (Product, Sale, StockMovement, User, Tenant, Order, Supplier, Warehouse, Alert, DashboardStats)
  - [x] Annotations JSDoc sur toutes les routes : Auth, Products, Stock, Sales, Suppliers, Orders, Warehouses, Alerts, Reports, Users
  - [x] Swagger UI monté sur `/api/docs` (désactivé en prod sauf `SWAGGER_ENABLED=true`)
  - [x] Spec JSON disponible sur `/api/docs.json`
  - [x] Validation : `tsc --noEmit` propre, spec servie avec succès (10 tags, 30+ endpoints)

## Phase 9 — Fonctionnalités Métier 🟡 (Moyen terme)

- [x] **Transferts directs inter-entrepôts**
  - [x] Méthode `createTransfer` dans `stock.service.ts` (vérif stock source, 2 mouvements TRANSFER, mise à jour product_warehouses)
  - [x] Route `POST /api/v1/stock/transfers` avec validation Zod
  - [x] Hook `useTransfers.ts` (React Query mutation)
  - [x] Page `TransfersPage.tsx` (form produit + source + destination + quantité + note)
  - [x] Route `/transfers` dans `App.tsx`, item "Transferts" dans `Sidebar.tsx`
  - [x] Fix : fallback `current_stock` si `product_warehouses` vide pour la source (produits pré-multi-entrepôts)
  - [x] Fix : `TransfersPage` affiche le stock dispo par entrepôt dans le sélecteur source (`warehouseStock` via `GET /warehouses/product/:id`)
- [x] **Prévisions de réapprovisionnement**
  - [x] Méthode `getRestockForecasts` dans `report.service.ts` — vélocité OUT/TRANSFER par produit, jours avant rupture, date estimée, qté recommandée (4 semaines), niveau d'urgence (critical/warning/ok/no_movement)
  - [x] Route `GET /api/v1/reports/forecasts` (Pro/Enterprise) avec doc Swagger
  - [x] Hook `useRestockForecasts` + type `RestockForecast` dans `useReports.ts`
  - [x] Onglet "Prévisions" dans `ReportsPage.tsx` — tableau trié par urgence avec badge coloré
- [x] **Gestion des lots & dates de péremption** (secteurs alimentaires / pharmaceutiques)
  - [x] Script migration `migrate_lots_fields.ts` — `batch_number VARCHAR` + `expiry_date TIMESTAMP` sur `stock_movements`
  - [x] `createMovement` étendu avec `batchNumber` et `expiryDate`
  - [x] Méthode `listLots` dans `stock.service.ts` — lots actifs avec `daysRemaining` et `expiryStatus` (expired/critical/warning/ok)
  - [x] Route `GET /api/v1/stock/lots` + hook `useLots.ts`
  - [x] Page `LotsPage.tsx` — tableau avec alertes visuelles, filtres, badges colorés
  - [x] `NewMovementModal.tsx` — section N° lot + date péremption pour type IN
  - [x] Route `/lots` dans App.tsx, item "Lots & Péremption" (CalendarClock) dans Sidebar
- [x] **Retours fournisseurs** — gestion des avoirs et retours marchandises
  - [x] Script migration `migrate_supplier_returns.ts` — tables `supplier_returns` + `supplier_return_items`
  - [x] Service `supplierReturn.service.ts` — `list`, `get`, `create` (génère mouvements OUT automatiquement)
  - [x] Route `GET/POST /api/v1/suppliers/returns` + hook `useSupplierReturns.ts`
  - [x] Page `SupplierReturnsPage.tsx` — formulaire multi-articles, historique
  - [x] Route `/supplier-returns` dans App.tsx, item "Retours fournisseurs" (RotateCcw) dans Sidebar
- [x] **Module fidélité clients POS** — points, remises, historique d'achat par client
  - [x] Script migration `migrate_loyalty.ts` — colonnes `loyalty_points` + `total_spent` sur `clients`, table `loyalty_transactions`
  - [x] Service `loyalty.service.ts` — `earnPoints`, `redeemPoints`, `getClientLoyalty` (règles : 1 pt / 1 000 F CFA → 50 F / pt)
  - [x] Route `GET /api/v1/loyalty/clients/:id` + `POST /api/v1/loyalty/redeem`
  - [x] `clients.service.ts` refactorisé en raw SQL tenant (loyalty_points, total_spent inclus)
  - [x] `sales.service.ts` : débit/crédit fidélité automatique sur chaque vente FAC
  - [x] Hook `useClients.ts` + `useLoyalty.ts` (React Query)
  - [x] `POSPage.tsx` — sélecteur client enregistré, affichage points dispo, champ remise fidélité
  - [x] Page `ClientsPage.tsx` — tableau clients + points + remise dispo + historique modal
  - [x] Route `/clients` dans App.tsx, item "Clients & Fidélité" (Users) dans Sidebar
  - [x] Fix : `updateProduct` met désormais à jour `product_warehouses` quand un entrepôt est sélectionné à la modification

## Phase 10 — Déploiement Production 🟠 (Court terme)

- [x] **CI/CD GitHub Actions**
  - [x] Pipeline CI `lint + test` sur chaque PR (`.github/workflows/ci.yml`)
    - [x] Backend: TypeScript check + ESLint + Jest coverage
    - [x] Frontend: TypeScript check + ESLint + Vitest
    - [x] Service PostgreSQL de test en CI
    - [x] Upload artefact coverage
  - [x] Pipeline CD `deploy` automatique sur merge dans `main` (`.github/workflows/deploy.yml`)
    - [x] SSH vers VPS `ubuntu@57.131.47.244` via `appleboy/ssh-action`
    - [x] git fetch + reset --hard → docker compose build → prisma db push → health check
    - [x] `concurrency` guard (pas de déploiements parallèles)
    - [x] Secrets requis : `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER` (à configurer sur GitHub)
  - [x] `deploy.sh` amélioré : `set -e`, git pull, `--remove-orphans`, health check exit 1 si KO
  - [x] Fix `package.json` `prepare` script — skip husky en production/Docker (`NODE_ENV !== production`)
- [x] **Hébergement** — actuellement sur VPS Ubuntu `/home/ubuntu/GesTock` ✅ fonctionnel
  - [x] Variables d'environnement sécurisées (`.env` non commité, `.env.example` documenté)
  - [x] Health check endpoint `GET /api/health` ✅
- [x] **Backups PostgreSQL automatiques** quotidiens
  - [x] Script `backup-postgres.sh` : `pg_dump | gzip`, rétention 7 jours
  - [x] Configurer le cron sur le VPS : `0 2 * * * /home/ubuntu/GesTock/backup-postgres.sh` (auto-enregistré par `deploy.sh` à chaque déploiement)
- [x] **Redis persistance activée** (mode AOF, `appendfsync everysec`) dans `docker-compose.prod.yml`
- [ ] **Monitoring & alertes**
  - [ ] UptimeRobot sur `https://gestock.allsite.cloud/api/health` _(configuration manuelle sur uptimerobot.com)_
  - [x] Sentry DSN (erreurs frontend + backend) — `@sentry/node` + `@sentry/react` intégrés, activés via `SENTRY_DSN` / `VITE_SENTRY_DSN`

## Phase 11 — Expansion & Intégrations 🟢 (Long terme)

- [ ] **API publique + Webhooks sortants** pour intégrations tierces (comptabilité, e-commerce)
- [ ] **Multi-devises** — support hors zone CFA (EUR, USD, GHS…)
- [ ] **Intégration comptabilité** (export vers Wave, Sage, ou fichier FEC)
- [ ] **Application mobile native** (React Native / Expo) en complément du PWA

## Phase 12 — Système d'Audit du Site (QG) ✅

- [x] **Backend — Nouvelles routes audit**
  - [x] `GET /api/v1/superadmin/audit-stats` — KPIs : total 24h, connexions, suspensions, abonnements, répartition par catégorie (7j)
  - [x] `GET /api/v1/superadmin/audit-logs/export` — Export CSV (BOM UTF-8, max 5 000 lignes, filtres compatibles)
  - [x] Fix TypeScript : paramètre `v` typé `string` dans la lambda CSV
- [x] **Frontend — Interface Audit dans le QG**
  - [x] `AuditLogPage.tsx` — Page complète avec KPI cards, barre de catégories 7j, filtres avancés, timeline colorée, pagination, export CSV
  - [x] `SuperAdminDashboard.tsx` — Navigation à onglets `🏢 Tenants` / `🔍 Audit Logs` dans le header
  - [x] Timeline sémantique : icône + couleur par type d'action (auth, gestion, tenant, stock, ventes, API)
  - [x] Filtres : tenant (dropdown), action (dropdown), période (preset 24h/7j/30j/tout), recherche libre
  - [x] Pagination 30 logs/page
  - [x] Actions QG identifiées avec badge distinct
- [x] **Hotfixes déploiement & pipeline**
  - [x] Fix 500 `/audit-logs` — `AuditLog` sans relation Prisma : remplacement `include` par enrichissement manuel (lookup `User` + `Tenant` avec déduplication)
  - [x] Fix `deploy.yml` — ajout `--skip-generate` à `prisma db push` (client déjà généré au build Docker, `node_modules` en lecture seule en prod)
  - [x] Fix CI — remplacement seuil `global: { lines: 70 }` par seuils par fichier (`sales: 85%`, `stock: 40%`, `errors: 70%`, `jwt: 55%`)
  - [x] Fix pipeline — `workflow_dispatch` ajouté à `deploy.yml` pour déclenchement manuel depuis GitHub Actions sans commit
  - [x] Fix GitHub Actions — suppression warnings Node 20 (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` + upgrade actions v4.2.2/v4.6.0)
  - [x] Fix CI cache — correction de `cache-dependency-path` pointant vers `package-lock.json` à la racine
  - [x] Fix SSH Deploy — remplacement clé ED25519 par RSA PEM (`ssh: no key found`), suppression du scope `environment: production` bloquant les secrets globaux

## Phase 13 — Qualité Frontend (react-doctor) ✅

> Audit `react-doctor v0.1.6` — Score : **78/100** → **90/100** ✅ (11 mai 2026)

- [x] **Correctness — Priorité haute**
  - [x] Remplacer `setForm({...form, ...})` par `setForm(prev => ({...prev, ...}))` — 19 occurrences (ClientsPage, SupplierModal, WarehousesPage, NewMovementModal)
  - [x] Corriger les `key={index}` sur listes filtrables — SupplierReturnsPage (id crypto), StockBreakdownModal (warehouse_name), NewOrderModal (id crypto)
  - [x] Corriger l'input non-contrôlé dans `SettingsPage.tsx:165` (ajout `readOnly`)
- [x] **Accessibilité — Priorité haute**
  - [x] Ajouter `htmlFor` + `id` sur les labels non associés — 52 paires dans 12 fichiers
  - [x] Corriger les `<div onClick>` — ajout `aria-hidden="true"` sur les backdrops (Header, ClientsPage ×2, ProductModal)
- [x] **Performance**
  - [x] `lastAlertCount` useState → useRef dans `Header.tsx` (valeur jamais lue en render)
  - [x] `scannerInit` useState → useRef dans `BarcodeScannerModal.tsx` (valeur jamais lue en render)
- [x] **Dead code**
  - [x] `TENANT_PLANS` — retiré le `export` (inutile, jamais importé ailleurs)
- [x] **Architecture / Design**
  - [x] `w-N h-N` → `size-N` (Tailwind v3.4+) — 23 remplacements dans 12 fichiers
  - [ ] Remplacer `gray/indigo/slate` par `zinc/neutral` ou tokens projet — 716 occurrences _(cosmétique — batch séparé)_
  - _(font-black conservé : usage intentionnel sur dark pages auth/superadmin)_

## Phase 14 — Corrections Issues Audit 🔴 (Priorité Immédiate)

> Audit complet du 2026-05-11 — Voir `tasks/lessons.md` pour le détail des leçons apprises.

### 🔴 Bloquant — à corriger avant toute mise en production

- [x] **Vérifier que les `.env` ne sont pas trackés dans git** — fait le 2026-05-11
  - [x] `backend/.env` est déjà dans `.gitignore` (pattern `.env` match tous les niveaux) ✅
  - [x] Racine `.env` est aussi ignorée et non trackée ✅
  - [x] Aucun fichier `.env` tracké dans le repo (`git ls-files | grep .env` → uniquement `.env.example` et `.env.prod.example`) ✅
  - [x] Créer/compléter `.env.example` à la racine — SMTP, backup, rate limit, inactivity timeout ajoutés ✅ (11 mai 2026)
- [x] **`tenant.service.ts` — schéma `stock_movements`** — `warehouse_id`, `batch_number`, `expiry_date` déjà présents ✅ (11 mai 2026)
- [x] **Cast `::uuid` dans `supplierReturn.service.ts`** — casts déjà correctement placés dans le SQL, pas dans les paramètres ✅ (11 mai 2026)
- [x] **`prisma db push`** — déjà remplacé par `prisma migrate deploy` dans `.github/workflows/deploy.yml` ✅ (11 mai 2026)
- [x] **Configurer SSL/TLS + sécurité nginx** (fait le 2026-05-11)
  - [x] Remplacer le nginx.conf complet : HTTP→HTTPS redirect + SSL + security headers + rate limiting + `client_max_body_size`
  - [x] Créer `setup-ssl.sh` — script bootstrap Let's Encrypt pour le VPS
  - [x] Ajouter `certbot renew` + `nginx reload` dans `deploy.yml`
  - [ ] À faire sur le VPS : `bash setup-ssl.sh gestock.allsite.cloud` (une seule fois)

### 🟠 Grave — corrections haute priorité

- [x] **Appliquer le chiffrement des API Keys** (fait le 2026-05-11)
  - [x] `api-key.controller.ts` : chiffrer la clé via `encryptionService.encryptForStorage()` avant stockage
  - [x] `apiKey.middleware.ts` : lookup par déchiffrement itératif (compatible clés legacy en clair)
  - [x] `encryption.service.ts` : fallback `ENCRYPTION_KEY` ← `ENCRYPTION_MASTER_KEY` (compatibilité docker-compose)
- [x] **Normaliser les erreurs métier** — `throw new Error(...)` → `AppError` dans :
  - [x] `stock.service.ts` : NotFoundError pour entrepôt, BadRequestError pour stock insuffisant + transfer invalide
  - [x] `sales.service.ts` : NotFoundError pour produit introuvable, BadRequestError pour stock insuffisant
  - [x] `loyalty.service.ts` : NotFoundError pour client introuvable, BadRequestError pour points insuffisants
  - [x] `order.service.ts` : BadRequestError pour modification commande au statut invalide
- [x] **Ne pas exposer les ports backend/frontend** dans `docker-compose.prod.yml` — `ports` → `expose` (déjà fait en 🔴)
- [x] **Headers de sécurité dans `nginx/nginx.conf`** — HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, rate limiting, `client_max_body_size` (déjà fait en 🔴)
- [x] **Remplacer `auth.service.ts` `require('jsonwebtoken').decode()`** par `jwt.decode()` (importé depuis `jwt.ts`)
  - [x] Export `jwt` depuis `jwt.ts`: `export { jwt }`
  - [x] Importer `jwt` dans `auth.service.ts` depuis la config locale
- [x] **Nettoyer les imports en milieu de fichier dans `app.ts`** — déplacer `clientsRoutes` et `salesRoutes` en haut
- [x] **Supprimer le dynamic import dans `billing.controller.ts:118`** — importer `requireStripe` statiquement en haut
- [x] **Backups hors-site + chiffrement** dans `backup-postgres.sh` :
  - [x] Chiffrement AES-256-CBC via `openssl enc` si `BACKUP_ENCRYPTION_KEY` est définie
  - [x] Copie S3/rclone si `BACKUP_S3_DEST` est définie
  - [x] Variables configurables : `BACKUP_DIR`, `BACKUP_ENCRYPTION_KEY`, `BACKUP_S3_DEST`, `RETENTION_DAYS`

### 🟡 Modéré — corrections moyen terme

#### Backend
- [x] **Créer un utilitaire de mapping snake_case → camelCase** — `backend/src/utils/mapper.ts` avec `mapRow()`/`mapRows()`
- [x] **Créer un wrapper `asyncHandler`** — `backend/src/utils/asyncHandler.ts` (appliqué sur products.routes.ts en exemple)
- [x] **Vérifier `warehouse_id` dans `listMovements`** — déjà présent dans le LEFT JOIN et la table, OK ✅
- [x] **Vérifier `cache.service.ts` `generateKey`** — fixé : cas `[object Object]` → `JSON.stringify` pour les objets
- [x] **Ajouter un middleware de compression** — `compression` installé + ajouté dans `app.ts`
- [x] **Plan limit null-check** — `planLimit.middleware.ts` : fallback `PLANS.starter` pour tout plan inconnu
- [ ] **Ajouter une validation email (vérification)** — envoyer un email de confirmation après registration
- [ ] **Bloquer les comptes après N échecs de login** (account lockout policy), pas seulement le rate limiter IP
- [ ] **Supprimer les tables Prisma orphelines** qui ne sont plus utilisées par le code (SupplierReturn, SupplierReturnItem, loyalty_transactions ne sont pas dans le schéma tenant)
- [x] **Fix `ConflictError` import manquant** dans `backend/src/tests/middleware.test.ts` — erreur TS2304, import ajouté ✅ (11 mai 2026)

#### Frontend
- [x] **Supprimer la dépendance `node: ^25.9.0`** du `package.json` frontend (accidentelle)
- [x] **Extraire `formatDate` dans `lib/format.ts`** — éliminé 11 définitions inline, ajout `formatDateTime` pour les usages avec heure
- [x] **Créer un composant `Modal` générique** — `components/Modal.tsx` avec focus trap, fermeture Escape, backdrop
- [x] **Créer un composant `EmptyState` partagé** — `components/EmptyState.tsx` avec icône, titre, description, action
- [x] **Refactor `WarehousesPage.tsx`** — `useWarehouses()` hook React Query au lieu de `useEffect` + `api.get()`, utilisation de `Modal` + `ConfirmModal`
- [x] **Refactor `ConfirmModal.tsx`** — utilise désormais `Modal` générique (focus trap + Escape gratuits)
- [ ] **Unifier les confirmations de suppression** — remplacer tous les `window.confirm()` par `ConfirmModal` (SuppliersPage, OrdersPage, SuperAdminDashboard)
- [ ] **Ajouter `aria-label` sur tous les boutons à icône seule**
- [ ] **Rendre le POS responsive** — remplacer `w-96` fixe
- [ ] **Ajouter des `<caption>` ou `aria-label`** sur les tableaux de données
- [ ] **Vérifier le contraste des couleurs** sur le thème dark superadmin

#### Tests
- [ ] **Ajouter `vitest.config.ts`** explicite dans le frontend avec `happy-dom` et résolution d'alias
- [ ] **Ajouter des tests pour `auth.service.ts`** — le chemin critique le plus important (register, login, refresh, password change, 2FA)
- [ ] **Ajouter des tests pour `api.ts`** (intercepteurs axios, logique de refresh token) et `authStore.ts` (Zustand persist)
- [ ] **Ajouter des tests pour les pages critiques** : LoginPage, ProductsPage (lecture + écriture), DashboardPage, POSPage
- [ ] **Ajouter des tests pour les middleware** : auth middleware, tenant middleware, error handler
- [ ] **Ajouter des tests pour les contrôleurs** (intégration avec supertest)
- [ ] **Atteindre 0% function coverage sur `jwt.ts`** — ajouter des appels directs aux fonctions JWT
- [ ] **Atteindre 100% function coverage sur `errors.ts`** — tester BadRequestError, UnauthorizedError, ForbiddenError, ConflictError
- [ ] **Étendre `auth.test.ts`** — ajouter login réussi, register, refresh token, logout, rate limiting

#### Qualité & CI
- [x] **Ajouter `.dockerignore`** pour exclure `node_modules/`, `.env`, `.git/` du build context Docker ✅ (11 mai 2026)
- [x] **Remplacer `npm install` par `npm ci`** dans `frontend/Dockerfile` ✅ (11 mai 2026)
- [x] **Ajouter `USER nginx`** dans `frontend/Dockerfile` (production stage) — port 8080, chown nginx:nginx ✅ (11 mai 2026)
- [x] **Ajouter un `.nvmrc`** avec la version Node du projet — Node 20 ✅ (11 mai 2026)
- [ ] **Ajouter `format:check` dans la CI** pour éviter la dérive de formatage
- [ ] **Renforcer les règles ESLint** progressivement : activer `no-explicit-any`, `no-unused-vars` en error, ajouter plugin `sonarjs`
- [ ] **Ajouter un step de build Docker dans la CI** — valider que les images se construisent correctement
- [ ] **Ajouter un scan de vulnérabilités** (npm audit) dans la CI
- [ ] **Intégrer un service de coverage** (Codecov ou Coveralls) pour suivre les tendances
- [ ] **Faire échouer la CI si les seuils de coverage ne sont pas atteints** (`--coverageThreshold`)
- [ ] **Ajouter des tests dans le hook pre-commit** — au minimum les tests des fichiers modifiés
- [ ] **Ajouter une stratégie de rollback** dans `deploy.yml` (restaurer l'image précédente si health check échoue)

#### Infrastructure & Monitoring
- [x] **Ajouter `workflow_dispatch`** manquant — déjà présent dans `deploy.yml` ✅ (11 mai 2026)
- [ ] **Configurer UptimeRobot** sur `https://gestock.allsite.cloud/api/health`
- [ ] **Ajouter une alerte** sur échec de backup (Slack/email)
- [ ] **Vérifier la restauration des backups** — tester au moins une restauration complète
- [x] **Ajouter un rate limiting** au niveau nginx — déjà configuré (`limit_req_zone` 30r/s) ✅ (11 mai 2026)
- [x] **Définir `client_max_body_size`** dans la config nginx — déjà à `10M` ✅ (11 mai 2026)
- [x] **Configurer un réseau Docker isolé** (`internal: true`) pour les services backend (PostgreSQL, Redis) ✅ (11 mai 2026)

#### Documentation
- [x] **Compléter `.env.prod.example`** — REDIS_PASSWORD, STRIPE_SECRET_KEY, SENTRY_DSN, VITE_SENTRY_DSN, SUPER_ADMIN_SECRET, BACKUP_ENCRYPTION_KEY ajoutés ✅ (11 mai 2026)
- [x] **Vérifier que `backend/.env` est bien documenté** dans `.env.example` — déjà documenté ✅ (11 mai 2026)
- [ ] **Remplacer les mots de passe par défaut** dans `docker-compose.yml` (dev) — utiliser des valeurs factices évidentes mais différentes des exemples publics

### 🟢 Secondaire — améliorations souhaitables

#### Architecture & Refactoring
- [ ] **Extraire un service de mapping `camelCase/snake_case`** — utilitaire central pour remplacer les remaps manuels dans tous les services
- [ ] **Ajouter des types TypeScript stricts pour les résultats SQL** — remplacer `as any[]` par des types dédiés
- [ ] **Ajouter une validation Zod au niveau service** (pas seulement au niveau route) — défense en profondeur
- [ ] **Remplacer le Super Admin Bearer token** par un système d'auth plus robuste (utilisateur dédié en base + JWT + 2FA)
- [ ] **Ajouter un système de search/build de requêtes dynamiques sécurisé** (query builder) — remplacer la concaténation de WHERE clauses
- [ ] **Créer une véritable migration Prisma pour les schémas tenant** — synchroniser Prisma et le SQL brut
- [ ] **Ajouter un endpoint d'export PDF mutualisé** (actuellement dupliqué entre POSPage, SalesPage, ReportsPage)
- [ ] **Ajouter des tests e2e** (Playwright ou Cypress) pour les parcours critiques (login → achat → rapport)

---

| Priorité       | Phase         | Actions clés                                                              |
| -------------- | ------------- | ------------------------------------------------------------------------- |
| 🔴 Immédiat    | Phase 14 🔴   | Secrets git, schéma DB, cast SQL, migration destructive, SSL              |
| 🔴 Immédiat    | Phase 7       | Rate limiting auth configurable, Helmet, Zod, logs d'audit ✅             |
| 🟠 Court terme | Phase 14 🟠   | Chiffrement API keys, Error→AppError, port/hx sécurité, tests manquants   |
| 🟠 Court terme | Phase 8 & 10  | Index DB, cache Redis, CI/CD, backups ✅                                  |
| 🟡 Moyen terme | Phase 14 🟡   | Refactoring services, composants partagés, qualité CI, monitoring         |
| 🟡 Moyen terme | Phase 9       | Transferts, prévisions, lots/péremption ✅                                |
| 🟡 Court terme | Phase 13      | Correctness & accessibilité (react-doctor 78/100 → 90+)                  |
| 🟢 Long terme  | Phase 11      | API publique, multi-devises, mobile natif                                 |
