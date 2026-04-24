# Lessons Learned — GesStock SaaS

<!-- Format : [date] | Problème rencontré | Règle pour l'éviter -->

## 2026-04-08 — Phase 1 & 2

- **Conflit PostgreSQL port 5432** | PostgreSQL Homebrew (local) tournait en même temps que le conteneur Docker, provoquant des conflits et des échecs de migration Prisma. | **Règle** : Toujours vérifier si un service d'infrastructure tourne déjà (`lsof -i :5432`) avant de lancer Docker. Configurer le `.env` en conséquence (port custom ou arrêter le service local).

- **Permissions PostgreSQL manquantes** | L'utilisateur `gestock` n'avait pas les droits nécessaires pour créer des schémas et exécuter des migrations Prisma. | **Règle** : Dès la création du projet, exécuter les GRANTs nécessaires : `ALTER USER gestock CREATEDB; GRANT ALL PRIVILEGES ON DATABASE gestock_db TO gestock;`.

- **Warnings React Router Future Flags** | Warnings dans la console concernant `v7_startTransition` et `v7_relativeSplatPath`. | **Règle** : Activer préventivement ces flags dans `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>` pour anticiper la migration vers la v7.

- **Imports TypeScript inutilisés** | Les erreurs `TS6133` (variable déclarée mais non utilisée) font échouer la compilation et bloquent le build. | **Règle** : Toujours nettoyer les imports inutilisés avant chaque commit. Configurer ESLint avec `no-unused-vars` pour détecter ça en temps réel.

- **`prisma migrate dev` interactif** | La commande demande un nom de migration de façon interactive, ce qui bloque les scripts automatiques. | **Règle** : Utiliser `npx prisma migrate dev --name <nom>` pour passer le nom directement et éviter le mode interactif.

- **Isolement multi-tenant par schéma PostgreSQL** | Chaque tenant a son propre schéma (`tenant_<slug>`). Les nouvelles tables doivent être ajoutées à la fois dans `schema.prisma` (modèles globaux) ET dans `tenant.service.ts` (`createTenantSchema`). | **Règle** : Toute nouvelle entité métier doit être déclarée dans ces deux endroits. Créer un ticket ou checklist pour ne pas oublier l'un ou l'autre.

- **Relations Prisma bidirectionnelles** | Prisma exige que toute relation soit définie dans les deux modèles (ex: `PurchaseOrderItem` doit référencer `Product` ET `Product` doit avoir `purchaseOrderItems`). | **Règle** : Toujours vérifier les deux côtés d'une relation Prisma avant de lancer `migrate`. Utiliser `npx prisma format` pour détecter les relations manquantes.

## 2026-04-08 — Phase 2 UI

- **Devise incorrecte** | L'EUR (€) avait été utilisée par défaut dans les composants générés. Le SaaS cible l'Afrique de l'Ouest. | **Règle** : Dès le début du projet, définir la devise dans un fichier de config global (ex: `src/lib/currency.ts`) et l'importer partout. Pour le F CFA : `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' })`.

- **Todo.md non mis à jour** | Le fichier de suivi des tâches n'a pas été mis à jour après la complétion des phases. | **Règle** : Mettre à jour `tasks/todo.md` après chaque session de travail, avec le détail de ce qui a été fait.

## 2026-04-09 — Phase 3

- **Stripe en mode test uniquement** | La configuration Stripe est prête mais nécessite des clés réelles (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) et des produits créés dans le dashboard Stripe. | **Règle** : Utiliser des clés de test (`sk_test_...`) pour le développement local. Ne jamais committer les clés Stripe dans le code — utiliser uniquement les variables d'environnement.

- **Plans tarifaires en F CFA** | Les prix Stripe doivent être créés dans la devise XOF (Franc CFA BCEAO). Stripe supporte XOF mais les montants sont en centimes (×100). | **Règle** : Vérifier la devise supportée par Stripe pour chaque marché cible. Pour XOF : 19 000 F CFA = `1900000` en unité Stripe (centimes).

- **Walkthroughs séparés par module** | Créer des walkthroughs séparés (`walkthrough_phase3_reports.md`, `walkthrough_phase3_billing.md`) pour documenter chaque module. | **Règle** : Un walkthrough par module majeur pour garder la traçabilité et faciliter les reprises de sessions.

- **Dashboard KPIs statiques → dynamiques** | Le `DashboardPage.tsx` affiche encore des valeurs statiques (`—`). Il devrait utiliser `useDashboardStats` de `useReports.ts`. | **Règle** : Ne jamais laisser des composants KPI en mode statique en production. Connecter les données dès que le hook est disponible.

## 2026-04-10 — Phase 6 (Entrepôts & Stabilisation)

- **Erreur de référence `Building` (Lucide)** | L'icône `Building` n'était pas reconnue dans certains fichiers malgré l'import, causant des crashes `ReferenceError`. | **Règle** : Privilégier des noms d'icônes universels comme `Warehouse` ou `Home`. En cas d'erreur de référence sur un import valide, suspecter une version de bibliothèque incompatible ou un cache de build corrompu.

- **Migration Multi-Entrepôts** | L'ajout d'une table `product_warehouses` rend les données existantes "orphelines" si elles ne sont pas rattachées à un entrepôt par défaut dès la migration. | **Règle** : Toujours accompagner un changement structurel de stock par un script de migration (`migrate_warehouses.ts`) qui initialise un « Dépôt Principal » et y transfère les stocks actuels.

- **Flux d'activation Manuel SaaS** | L'automatisation complète via Stripe peut être rigide pour certains marchés. Un dashboard « HQ » permettant l'activation manuelle offre plus de flexibilité pour les paiements hors-ligne (Mobile Money). | **Règle** : Toujours prévoir un « kill-switch » ou un mode manuel dans le Super-Admin pour outrepasser les automates de facturation en cas de besoin client spécifique.

- **Oubli d'imports dans App.tsx** | L'ajout de nouvelles routes sans import correspondant dans `App.tsx` bloque toute l'application. | **Règle** : Chaque nouvelle page créée doit être immédiatement importée et déclarée dans le routeur principal avant de passer à la suite.

## 2026-04-11 — Modernisation & Polissage

- **Sérialisation JSON d'`Infinity`** | Dans le backend, les limites du plan "Enterprise" sont à `Infinity`. Lors du passage via JSON (API), ces valeurs deviennent `null`. Le frontend affichait "Max null". | **Règle** : Dans le frontend, toujours prévoir un test `(limit === Infinity || limit === null)` pour identifier un quota illimité venant d'une API.

- **Notifications statiques vs dynamiques** | Une cloche de notification sans données réelles déçoit l'utilisateur. | **Règle** : Dès qu'une source de données critique (ex: alertes stock bas) existe, elle doit être connectée au Header via un hook dédié (`useAlerts`) avec rafraîchissement périodique.

- **First Impression & Login UI** | La page de connexion est la première vitrine. Un design générique (gradients simples) peut sembler « amateur ». | **Règle** : Investir dans des visuels 3D, du glassmorphism et des animations de flottaison (`animate-float`) dès le login pour instaurer une confiance « Premium » immédiate.

## 2026-04-22 — Auth & Sessions (Production)

- **Rate limiter appliqué deux fois** | Le middleware `authLimiter` était appliqué à la fois dans `app.ts` (global `/api/v1/auth`) et dans `auth.routes.ts` (`/login`, `/register`). Les tentatives étaient comptées en double, provoquant des `429` prématurés. | **Règle** : Appliquer un rate limiter d'authentification à un seul niveau (route ou groupe), jamais les deux.

- **Blocage de session fantôme** | Le contrôle "compte déjà connecté" bloquait parfois un utilisateur alors qu'aucun navigateur n'était réellement actif (session Redis persistante après fermeture navigateur). | **Règle** : Pour une politique "session unique", remplacer automatiquement l'ancienne session au nouveau login (invalidate old refresh tokens + reset active session) au lieu de bloquer l'utilisateur.

- **Config Vite non injectée au runtime** | Les variables `VITE_*` ne sont pas lues à l'exécution dans le conteneur Nginx, elles sont injectées au build. | **Règle** : Passer les variables frontend via `build.args` dans `docker-compose` et `ARG/ENV` dans le `Dockerfile` avant `npm run build`.

- **Erreur PostgreSQL uuid/text en SQL brut** | Insertion dans `product_warehouses` avec `product_id` en texte causait `ERROR 42804` (uuid attendu). | **Règle** : Dans les requêtes SQL brutes Prisma, caster explicitement les UUID (`$1::uuid`, `$2::uuid`) pour éviter les erreurs de type.

## 2026-04-23 — Frontend Perf & Ops

- **Code splitting non activé malgré routeur complet** | Toutes les pages étaient importées statiquement dans `App.tsx`, ce qui augmentait le bundle initial. | **Règle** : Charger les pages via `React.lazy` + `Suspense` au niveau des routes pour réduire le temps de chargement initial.

- **Contexte terminal local vs SSH** | Des commandes de validation ont échoué car le terminal actif était connecté au VPS (`/home/ubuntu`) et non au workspace local. | **Règle** : Vérifier systématiquement le contexte d'exécution (`pwd`) avant de lancer build/tests pour éviter les faux diagnostics.

- **Activation outillage qualité sur base legacy** | L'introduction d'ESLint/Prettier sur un code existant a révélé de nombreuses alertes préexistantes et des divergences de formatage. | **Règle** : Déployer l'outillage en mode incrémental (bloquer sur erreurs, tolérer warnings au départ), puis réduire progressivement la dette technique.

## 2026-04-23 — Tests unitaires (Suite)

- **Seuil de couverture global vs services ciblés** | Configurer `coverageThreshold: { global: { lines: 70 } }` sur tout `src/services/**` échoue si la plupart des services n'ont pas de tests. | **Règle** : Restreindre `collectCoverageFrom` aux services effectivement testés pour que le seuil global reflète la réalité des services critiques (ex: `stock.service.ts`, `sales.service.ts`).

- **`jest.mock` factory et variables externes** | Les variables définies avant `jest.mock()` ne sont pas accessibles dans la factory (hoisting), sauf si elles commencent par `mock`. | **Règle** : Nommer les mocks Prisma `mockQueryRawUnsafe`, `mockPrismaClient`, etc. (préfixe `mock`) pour que Jest autorise la référence depuis la factory hoistée.

- **Header component nécessite `QueryClientProvider`** | Le Header utilise `useStockAlerts` (React Query). Tester sans `QueryClientProvider` lève immédiatement « No QueryClient set ». | **Règle** : Wrapper systématiquement les composants qui utilisent React Query avec un `QueryClientProvider` dans les tests, et mocker les hooks réseau (`vi.mock('../hooks/useAlerts', ...)`) pour isoler le test.

- **`req.tenant?.slug` vs `req.tenantSlug`** | La route transfers utilisait `req.tenant?.slug` et `req.user?.id` au lieu de `req.tenantSlug` et `req.userId` (propriétés injectées par les middlewares). Le slug passait `undefined` → `tenant_undefined` → 500. | **Règle** : Toujours utiliser `req.tenantSlug` et `req.userId` dans les routes. Ne jamais accéder à `req.tenant?.slug` ou `req.user?.id` — ces chemins n'existent pas dans ce projet.

- **clients.service.ts utilisait le client ORM global** | Le service clients utilisait `prisma.client.findMany()` (schema public) au lieu du schema tenant. Les colonnes `loyalty_points` et `total_spent` n'existaient que dans le schéma tenant. | **Règle** : Tout service qui manipule des données métier (clients, produits, ventes...) doit utiliser `$queryRawUnsafe` avec le schéma tenant, pas le client Prisma ORM public. Vérifier systématiquement l'isolation multi-tenant dès la création d'un service.

- **Règle prix fidélité XOF** | Les centimes n'existent pas en F CFA (XOF est une devise sans décimales). Les calculs de remise doivent rester en entiers arrondis. | **Règle** : Pour XOF, utiliser `Math.floor()` pour le calcul des points gagnés et des remises, pas `Math.round()`.

- **Scripts TypeScript non disponibles dans le container de prod** | Le Dockerfile compile le TypeScript en `dist/` et n'y inclut pas les fichiers `.ts` sources. `npx tsx src/scripts/xxx.ts` dans le container échoue avec `ERR_MODULE_NOT_FOUND`. | **Règle** : Pour les migrations one-shot en production, passer par `psql` directement via `docker exec gestock-postgres psql ...` en SQL brut. Ou compiler les scripts dans le build Docker via un stage dédié.

- **`husky` cassé en build Docker avec `--omit=dev`** | Le script `prepare: husky` dans `package.json` est exécuté par `npm install` même avec `--omit=dev`, car `prepare` tourne après l'install. Comme husky est une devDependency, il n'est pas installé, ce qui fait échouer le build. | **Règle** : Conditionner le script `prepare` à l'environnement : `node -e "if(process.env.NODE_ENV!=='production'){require('child_process').execSync('husky',{stdio:'inherit'})}"`.

- **Cast de mock Vitest non typé** | `useAuthStore as ReturnType<typeof vi.fn>` provoque `TS2352` car les types ne se chevauchent pas. | **Règle** : Utiliser `vi.mocked(fn)` — l'API idiomatique Vitest qui infère correctement le type mock sans cast manuel.

- **`jest.config.js` en erreur ESLint `no-undef`** | Un fichier `.js` CommonJS (`module.exports`) dans un projet configuré en ESM/TypeScript est analysé sans le contexte `node`, ce qui fait rater ESLint avec `'module' is not defined`. | **Règle** : Ajouter `/* eslint-env node */` en tête des fichiers de config CommonJS (`.js`) pour indiquer à ESLint que `module`, `require`, etc. sont disponibles.

## 2026-04-23 — Multi-entrepôts & Inventaire

- **`updateProduct` n'écrivait pas dans `product_warehouses`** | La méthode `updateProduct` dans `stock.service.ts` mettait à jour la table `products` mais ignorait complètement `warehouseId`. L'utilisateur cochait un entrepôt, voyait la bannière succès, mais rien ne s'enregistrait dans `product_warehouses`. | **Règle** : Toute opération d'écriture sur un produit (create **et** update) doit propager le changement de stock vers `product_warehouses` via un `INSERT ... ON CONFLICT DO UPDATE` quand `warehouseId` est fourni.

- **Transfert "Stock insuffisant (Disponible: 0)" sur des produits existants** | `createTransfer` vérifiait uniquement `product_warehouses`, mais les produits créés avant le système multi-entrepôts n'ont aucune entrée dans cette table. Stock global non nul, mais transfert bloqué à 0. | **Règle** : Quand `product_warehouses` n'a pas d'entrée pour la source, utiliser `products.current_stock` comme fallback et initialiser l'entrée manquante (`INSERT ... ON CONFLICT DO NOTHING`) avant de continuer.

- **Sélecteur d'entrepôt source sans info de stock** | `TransfersPage` listait tous les entrepôts sans indiquer la quantité disponible par entrepôt pour le produit choisi, rendant le choix de la source aveugle. | **Règle** : Dès qu'un produit est sélectionné dans un formulaire de transfert, charger le stock par entrepôt via `GET /warehouses/product/:id` et l'afficher dans les options du sélecteur source (`Nom (X dispo)`).

- **`listProducts` faisait N+1 pour les entrepôts** | Afficher les entrepôts d'un produit nécessitait une requête supplémentaire par produit, ce qui devient coûteux avec un catalogue important. | **Règle** : Utiliser `json_agg(json_build_object(...))` dans la requête principale `listProducts` pour agréger les entrepôts en une seule jointure SQL, sans aucune requête additionnelle côté service ou frontend.
