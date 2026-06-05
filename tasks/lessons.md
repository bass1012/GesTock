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

## 2026-04-25 — Système d'Audit QG & Pipeline CD

- **`AuditLog` sans relation Prisma User/Tenant** | Le modèle `AuditLog` définit `userId` et `tenantId` comme de simples `String?` sans `@relation`. Utiliser `include: { user: ..., tenant: ... }` dans `findMany` provoque une erreur Prisma en runtime (500). | **Règle** : Avant d'utiliser `include` dans Prisma, vérifier que la relation est déclarée dans `schema.prisma`. Pour les foreign keys sans `@relation`, enrichir les données manuellement : `findMany` simple puis lookup `User.findMany({ where: { id: { in: ids } } })` avec déduplication.

- **Logique de déploiement dupliquée entre `deploy.sh` et `deploy.yml`** | La commande `prisma db push` existait en deux endroits avec des versions divergentes. Modifier `deploy.sh` n'avait aucun effet car le pipeline CD exécute le script inline dans `deploy.yml`. | **Règle** : La source de vérité du déploiement est **uniquement `deploy.yml`**. `deploy.sh` est un script de secours pour déploiement manuel depuis le VPS. Toute modification du processus de déploiement doit se faire dans `deploy.yml`.

- **`prisma db push` tente de régénérer le client en production** | Dans un container Docker de production, `node_modules` est en lecture seule (layers de l'image). `prisma db push` appelle automatiquement `generate` et échoue avec `Can't write to /app/node_modules/prisma`. | **Règle** : Toujours utiliser `prisma db push --skip-generate` en production. Le Prisma client est déjà généré lors du `docker build` — le régénérer au runtime est inutile et dangereux.

- **Seuil de couverture `global` Jest cassé par un service peu couvert** | Le seuil `global: { lines: 70 }` calcule la moyenne sur tous les fichiers de `collectCoverageFrom`. Un seul service à 45% fait tomber la moyenne sous 70%, même si les autres sont bien couverts. | **Règle** : Utiliser des seuils **par fichier** (`'./src/services/sales.service.ts': { lines: 85 }`) pour que chaque service soit jugé indépendamment. Augmenter les seuils progressivement au fil des nouvelles suites de tests.

- **`workflow_dispatch` absent du pipeline CD** | Sans ce trigger, le déploiement ne peut être déclenché que par un `git push`. Impossible de redéployer sans faire un commit factice. | **Règle** : Toujours ajouter `workflow_dispatch` dans les workflows de déploiement pour permettre le re-déploiement manuel depuis l'interface GitHub Actions sans commit.

- **Warnings de dépréciation Node 20 sur GitHub Actions** | Les actions comme `actions/checkout@v4` tournent sur Node 20 qui sera obsolète. | **Règle** : Mettre à jour les actions (`v4.2.2`, `v4.6.0`) et ajouter `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` au workflow pour supprimer les warnings.

- **`appleboy/ssh-action` échoue avec `ssh: no key found` (ED25519)** | L'action SSH buggue souvent avec les clés récentes au format `OPENSSH` (ex: `ed25519`). | **Règle** : Toujours générer et utiliser une clé classique RSA au format PEM pour GitHub Actions (`ssh-keygen -m PEM -t rsa -b 4096`).

- **Secrets inaccessibles à cause de `environment: production`** | Si le workflow déclare `environment: production`, GitHub ignore les "Repository Secrets" si l'environnement "production" est configuré (même vide). | **Règle** : Pour un déploiement simple, supprimer `environment: production` du workflow afin de forcer la lecture des secrets globaux du dépôt.

## 2026-05-10 — Audit Qualité React (react-doctor)

- **`setForm({...form, ...})` → stale closure** | 21 occurrences dans le projet : copier l'état courant depuis la closure au lieu de lire la valeur à jour. Si un autre setState s'exécute entre deux renders, la valeur est écrasée. | **Règle** : Toujours utiliser la forme fonctionnelle `setForm(prev => ({ ...prev, champ: valeur }))` — garantit que `prev` est la valeur la plus récente, sans dépendance à la closure.

- **Labels de formulaire sans `htmlFor`** | 58 `<label>` sans `htmlFor` lié à l'`id` du champ — les lecteurs d'écran ne peuvent pas associer le label au contrôle. | **Règle** : Chaque `<label>` doit avoir `htmlFor="id-du-champ"` et le `<input>` correspondant doit avoir `id="id-du-champ"`. Alternative : imbriquer le `<input>` directement dans le `<label>`.

- **`key={index}` sur des listes filtrables/triables** | 7 occurrences : utiliser l'index comme `key` provoque des bugs visuels et des problèmes d'état local (inputs non réinitialisés) dès que la liste est réordonnée ou filtrée. | **Règle** : Toujours utiliser un identifiant stable et unique : `key={item.id}` ou `key={item.slug}`. N'utiliser `key={index}` que sur des listes statiques non modifiables.

- **Classes Tailwind par défaut (`gray`, `indigo`, `slate`)** | 716 occurrences dans le projet — ces palettes sont les tokens "template" de Tailwind, elles donnent un aspect générique. | **Règle** : Définir les couleurs de marque dans `tailwind.config.js` (ex: `primary`, `brand`) et les neutrals sur `zinc` ou `neutral`. Éviter `gray/indigo/slate` dans le code applicatif.

- **Éléments cliquables sans handler clavier** | 9 `<div onClick>` sans `onKeyDown`/`onKeyUp`/`onKeyPress` — utilisateurs clavier et lecteurs d'écran ne peuvent pas activer l'élément. | **Règle** : Préférer `<button>` pour les éléments cliquables. Si un `<div>` est inévitable, ajouter `role="button"`, `tabIndex={0}` et `onKeyDown={e => e.key === 'Enter' && handler()}`.

- **`new Date()` directement dans le JSX** | 57 occurrences — `new Date()` renvoie une valeur différente à chaque render, ce qui causerait un hydration mismatch en SSR et déclenche des re-renders inutiles. | **Règle** : Initialiser les dates dans un `useState` ou `useMemo`, ou dans un `useEffect` si la valeur doit être client-only.

- **`npx react-doctor` nécessite Node ≥ 22** | La commande échoue avec Node 18 (bindings natifs `oxc-parser` incompatibles). | **Règle** : Avant de lancer `react-doctor`, s'assurer d'être sur Node 22+ : `nvm use 22`. Revenir à la version de dev après : `nvm use 18` (ou la version du projet).

## 2026-05-11 — Audit & Corrections Phase 14

- **`backend/.env` deja gitignore** | L'audit initial a signale un `.env` commite, mais `git check-ignore` a confirme qu'il est bien ignore (le pattern `.env` dans `.gitignore` match tous les niveaux). | **Regle** : Toujours verifier avec `git check-ignore <fichier>` avant d'acter une fuite de secret. `git ls-files | grep .env` confirme qu'aucun `.env` n'est tracke.

- **Schema `stock_movements` incomplet dans `tenant.service.ts`** | Les colonnes `batch_number` et `expiry_date` etaient absentes du `CREATE TABLE`, mais `stock.service.ts` les referencait dans ses requetes. | **Regle** : Chaque fois qu'on ajoute une colonne dans un service, verifier qu'elle existe dans la creation de schema dans `tenant.service.ts`. Ajouter un grep croise : chercher les references de colonnes dans les services ET dans le CREATE TABLE correspondant.

- **Cast `::uuid` dans les valeurs de parametres** | `supplierReturn.service.ts` avait `${data.warehouseId}::uuid` dans la valeur du parametre au lieu de `$2::uuid` dans le SQL. Le cast etait ignore par PostgreSQL. | **Regle** : Les casts PostgreSQL (`::type`) doivent TOUJOURS etre dans le template SQL, jamais dans la valeur des parametres injectes. Pattern correct : `` `... $2::uuid ...` `` avec `data.warehouseId` comme valeur brute.

- **`require('jsonwebtoken').decode()` vs `jwt.decode()`** | `auth.service.ts` utilisait `require('jsonwebtoken')` (CommonJS dynamic) alors que `jwt` etait deja importe en ESM. | **Regle** : Ne jamais utiliser `require()` dans un projet ESM/TypeScript. Exporter le module `jwt` depuis `jwt.ts` via `export { jwt }` la ou il est deja importe, puis l'importer dans les services qui en ont besoin.

- **Dynamic `import()` dans un handler Express** | `billing.controller.ts` faisait `await import('../services/billing.service')` dans chaque appel webhook, alors que `billingService` etait deja importe statiquement en haut du fichier. | **Regle** : Les imports dynamiques dans les handlers sont inutiles si le module est deja importe statiquement. Ne les utiliser que pour le code-splitting ou les modules conditionnels (ex: Stripe desactive).

- **Imports au milieu du fichier `app.ts`** | `import clientsRoutes` et `import salesRoutes` etaient au milieu des `app.use()`, ce qui est syntaxiquement correct (les imports ES6 sont hoistes) mais trompeur pour la maintenance. | **Regle** : Tous les imports doivent etre en haut du fichier (0-30 premieres lignes). Jamais d'imports au milieu meme si JS le permet.

- **`Error` vs `AppError` dans les services** | 10 `throw new Error(...)` metier retournaient des 500 au lieu de 400/404. | **Regle** : Toute erreur metier previsible (stock insuffisant, ressource introuvable, validation) doit utiliser une sous-classe de `AppError` (BadRequestError, NotFoundError, ConflictError). Les `new Error(...)` bruts sont reserves aux bugs imprevus.

- **API Keys stockees en clair** | Le service `encryption.service.ts` (AES-256-GCM) existait mais n'etait pas utilise pour les cles API. | **Regle** : Des qu'un outil de chiffrement existe dans le codebase, l'utiliser pour TOUTES les donnees sensibles au repos. Les API keys sont un cas classique : on ne les montre qu'a la creation, on les stocke chiffrees.

- **`ENCRYPTION_MASTER_KEY` vs `ENCRYPTION_KEY`** | Le service `encryption.service.ts` lisait `ENCRYPTION_MASTER_KEY` mais `docker-compose.prod.yml` passait `ENCRYPTION_KEY`. | **Regle** : Toujours verifier la coherence des noms de variables d'environnement entre le code qui les lit et le docker-compose qui les definit. Un `grep` du nom dans les deux sens (code -> compose et compose -> code) previent ce genre de mismatch.

- **`prisma db push --accept-data-loss` en production** | La commande utilisee dans `deploy.yml` est destructive et peut supprimer des colonnes/donnees sans preavis. | **Regle** : En production, toujours utiliser `prisma migrate deploy` (migrations versionnees). `prisma db push` est reserve au developpement. Verifier que les migrations existent avant de changer la commande.

- **Backups locaux non chiffres sans copie hors-site** | `backup-postgres.sh` stockait les `.sql.gz` en clair localement sans copie distante. | **Regle** : Toujours chiffrer les backups au repos (openssl enc -aes-256-cbc) et prevoir une copie hors-site (S3/rclone). Parametrer via variables d'environnement pour ne pas exposer les cles dans le script.

- **asyncHandler pour eliminer try/catch** | Chaque controleur repete `try { ... } catch (error) { next(error) }` 3-5 fois. | **Regle** : Creer un wrapper `asyncHandler` des le debut du projet. L'appliquer dans les routes : `router.get('/', asyncHandler(ctrl.list))`. Le controleur n'a plus besoin de try/catch — les erreurs sont automatiquement forwardees a `next()`.

- **generateKey avec `[object Object]`** | `cache.service.ts` utilisait `${params[key]}` qui produit `[object Object]` pour les parametres objets. | **Regle** : Toujours verifier le type des valeurs dans les fonctions de generation de cle de cache : utiliser `JSON.stringify()` pour les objets, `null` pour les valeurs null/undefined.

- **`compression` manquant** | Aucun middleware de compression n'etait configure sur Express, les reponses JSON etaient envoyees sans gzip. | **Regle** : Ajouter `app.use(compression())` des le debut du projet Express. Cela compresse toutes les reponses (JSON, HTML) et reduit la bande passante de ~70%.

- **Plan inconnu dans `planLimit.middleware.ts`** | Si un tenant avait un plan non present dans la config PLANS, `PLANS[plan]` renvoyait `undefined` → crash 500. | **Regle** : Toujours utiliser un fallback (`|| PLANS.starter`) quand on accede a un dictionnaire de configuration par une cle venant de la base de donnees.

- **`node` package installe dans frontend** | `node: ^25.9.0` etait dans les `dependencies` du frontend. Ce package npm est un shim Node.js pour le navigateur, rarement necessaire. | **Regle** : Verifier regulierement les dependances avec `npm ls --depth=0` pour detecter les paquets accidentels. Si `node` est dans dependencies frontend, le retirer.

- **formatDate duplique 11 fois** | Chaque page definissait sa propre fonction `formatDate` avec `toLocaleDateString('fr-FR')`. | **Regle** : Des le premier composant qui affiche une date, creer un utilitaire partage dans `lib/`. Centraliser les formats (date, datetime, heure) pour eviter la duplication.

- **WarehousesPage bypassait React Query** | La page utilisait `useEffect` + `api.get()` + `setState` au lieu du hook `useWarehouses()`, cassant la coherence du cache React Query. | **Regle** : Toujours utiliser les hooks React Query existants pour les lectures. Pour les mutations, utiliser `queryClient.invalidateQueries()` pour la coherence du cache.

- **Conflit d'import `Warehouse` (icone vs type)** | Le nom `Warehouse` etait utilise a la fois pour l'icone Lucide et le type de donnees. | **Regle** : Renommer les imports d'icones Lucide en conflit avec des noms de types/metier : `import { Warehouse as WarehouseIcon }`.

## 2026-05-11 — Phase 13 (react-doctor 78→90/100)

- **react-doctor en mode interactif uniquement** | `npx react-doctor 2>&1 | head` bloquait silencieusement car la commande attend une saisie interactive. | **Règle** : Toujours lancer `react-doctor` directement dans le terminal (`nvm use 22 && npx react-doctor@latest`) et répondre `yes` à "scan only changed files".

- **`filter().map()` double itération** | react-doctor signale chaque combinaison `filter().map()` comme double iteration inutile. | **Règle** : Utiliser `.reduce<T[]>()` pour combiner filtre + transformation en un seul passage.

- **`border-l-4` flaggé comme "AI-generated UI tell"** | react-doctor considère les `border-l-4 border-*-500` comme un signe de génération automatique non intentionnel. | **Règle** : Remplacer par `shadow-[inset_3px_0_0_0_theme(colors.primary.500)]` pour un résultat visuel identique mais idiomatique.

- **Gradient text flaggé comme "décoratif"** | Les classes `bg-gradient-to-r bg-clip-text text-transparent` sur les titres sont signalées comme décoratives non accessibles. | **Règle** : Remplacer par des couleurs solides sémantiques (`text-white`, `text-primary-400`).

- **`new Date()` dans le JSX en prop** | react-doctor signale les `new Date()` dans les expressions JSX comme créant une nouvelle instance à chaque render. | **Règle** : Hoister les calculs basés sur `Date.now()` / `Date.parse()` en variables `const` avant le `return (`, ou les déplacer à portée module si statiques.

- **`w-N h-N` au lieu de `size-N`** | Tailwind v3.4+ introduit le shorthand `size-N` pour remplacer `w-N h-N`. react-doctor le signale systématiquement. | **Règle** : Utiliser `size-N` dès la création d'un élément carré. Faire un grep `w-\d h-\d` périodique pour corriger les occurrences existantes.

## 2026-05-11 — Phase 14 (Audit Production)

- **Vérifier avant d'implémenter** | Les items Phase 14 (tenant.service.ts colonnes, ::uuid cast, prisma migrate deploy) avaient été listés comme "à corriger" mais étaient **déjà corrects** dans le code. Temps perdu à re-vérifier. | **Règle** : Avant de marquer un item comme "à corriger" dans todo.md, toujours grep le code source pour confirmer que le problème existe réellement.

- **Import de classe d'erreur manquant dans les tests** | `ConflictError` était défini dans `utils/errors.ts` et utilisé dans `middleware.test.ts`, mais jamais importé — provoquant `TS2304: Cannot find name 'ConflictError'`. | **Règle** : Après toute modification de `utils/errors.ts` (ajout/renommage de classe), lancer `npx tsc --noEmit` dans `backend/` immédiatement pour détecter les tests qui référencent la classe sans l'importer.

- **`.env.example` incomplet après ajout de features** | Des variables ajoutées en Phase 7 (`BACKUP_ENCRYPTION_KEY`, `SMTP_*`, `BACKUP_S3_DEST`) n'étaient pas documentées dans `.env.example`. | **Règle** : Toute nouvelle variable d'environnement doit être ajoutée simultanément dans `.env.example` (racine + `backend/.env.example`) au même commit que son introduction dans le code.
