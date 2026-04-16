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
  - [x] UI : Détails du stock par dépôt dans la liste des produits
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

- [x] **Rate limiting** sur `/auth/login` et `/auth/register` (5 tentatives / 15 min via `express-rate-limit`)
- [x] **Helmet.js** — sécurisation des headers HTTP
- [x] **CORS strict** — whitelist des origines autorisées uniquement
- [x] **Validation des inputs** avec Zod sur toutes les routes backend (anti-injection / XSS)
- [x] **Rotation des refresh tokens** — invalidation après usage unique
- [x] **Liste noire JWT** dans Redis pour les tokens révoqués
  - [x] Service `jwtBlacklist.service.ts` : blacklist tokens révoqués avec TTL
  - [x] Vérification dans `auth.middleware.ts` avant validation JWT
- [x] **Logs d'audit** sur toutes les actions critiques (suppression, changement de rôle, accès Super-Admin)
  - [x] Service `audit.service.ts` : enregistrement horodaté par tenant
  - [x] Route `GET /api/v1/superadmin/audit-logs` avec filtres et pagination
  - [x] Intégration audit dans `auth.controller.ts` (login, logout, register, password change)
  - [x] Intégration audit dans `users.controller.ts` (create, role change, delete)
  - [x] Intégration audit dans `superadmin.controller.ts` (tenant suspension, subscription changes, password reset)
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
- [ ] **Lazy loading + code splitting** React par route (amélioration du temps de chargement initial)
- [ ] **Tests automatisés** — montée en couverture à >70% sur les services critiques
  - [ ] `stock.service.ts` — tests unitaires complets
  - [ ] Tests E2E sur le parcours POS (panier → vente → décrémentation stock)
- [ ] **ESLint + Prettier + Husky** (pre-commit hooks)
- [ ] **Documentation API Swagger / OpenAPI** (`swagger-jsdoc` + `swagger-ui-express`)

## Phase 9 — Fonctionnalités Métier 🟡 (Moyen terme)
- [ ] **Transferts directs inter-entrepôts**
  - [ ] Nouveau type de mouvement `TRANSFER` avec champs `source_warehouse_id` / `dest_warehouse_id`
  - [ ] Route `POST /api/v1/stock/transfers`
  - [ ] Page `TransfersPage.tsx` + modal de confirmation
- [ ] **Prévisions de réapprovisionnement**
  - [ ] Calcul de la vélocité de vente (consommation moyenne / semaine par produit)
  - [ ] Alerte proactive : date estimée de rupture de stock
- [ ] **Gestion des lots & dates de péremption** (secteurs alimentaires / pharmaceutiques)
- [ ] **Retours fournisseurs** — gestion des avoirs et retours marchandises
- [ ] **Module fidélité clients POS** — points, remises, historique d'achat par client

## Phase 10 — Déploiement Production 🟠 (Court terme)
- [ ] **CI/CD GitHub Actions**
  - [ ] Pipeline `lint + test` sur chaque PR
  - [ ] Pipeline `deploy` automatique sur merge dans `main`
- [ ] **Hébergement** Railway ou Render
  - [ ] Variables d'environnement sécurisées (pas de `.env` committé)
  - [ ] Health check endpoint `GET /api/health`
- [ ] **Backups PostgreSQL automatiques** quotidiens (pg_dump vers S3 ou Cloudflare R2)
- [ ] **Redis persistance activée** (mode AOF)
- [ ] **Monitoring & alertes**
  - [ ] UptimeRobot (disponibilité)
  - [ ] Sentry (erreurs frontend + backend)

## Phase 11 — Expansion & Intégrations 🟢 (Long terme)
- [ ] **API publique + Webhooks sortants** pour intégrations tierces (comptabilité, e-commerce)
- [ ] **Multi-devises** — support hors zone CFA (EUR, USD, GHS…)
- [ ] **Intégration comptabilité** (export vers Wave, Sage, ou fichier FEC)
- [ ] **Application mobile native** (React Native / Expo) en complément du PWA

---

## Tableau de Bord des Priorités

| Priorité | Phase | Actions clés |
|---|---|---|
| 🔴 Immédiat | Phase 7 | Rate limiting, Helmet, Zod, logs d'audit |
| 🟠 Court terme | Phase 8 & 10 | Index DB, cache Redis, CI/CD, backups |
| 🟡 Moyen terme | Phase 9 | Transferts, prévisions, lots/péremption |
| 🟢 Long terme | Phase 11 | API publique, multi-devises, mobile natif |
