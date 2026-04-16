# Projet SaaS — Gestion de Stock sur Mesure

## Vue d'ensemble

Application web de gestion de stock **multi-tenant** (SaaS), entièrement personnalisable par client, construite avec React + Node.js. Chaque client dispose de son propre espace isolé, de ses modules activés et de sa configuration.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React + Vite, TailwindCSS, React Query, React Router |
| Backend | Node.js + Express (ou Fastify), Prisma ORM |
| Base de données | PostgreSQL (schema-per-tenant), Redis (cache/sessions) |
| Fichiers | S3-compatible (documents, exports) |
| Auth | JWT + refresh tokens, rôles par tenant |
| Infra | Docker, Railway / Render / VPS |
| Paiements | Stripe (abonnements, plans) |

---

## Architecture en 4 couches

### 1. Frontend — React.js
Interface personnalisable par client (thème, modules actifs, langue).

Modules disponibles :
- Dashboard (KPIs, alertes, graphiques)
- Inventaire (catalogue, mouvements, stocks)
- Commandes (bons de commande, fournisseurs)
- Rapports (exports PDF/Excel, tableaux de bord)
- Paramètres (configuration tenant, utilisateurs, rôles)

### 2. API Gateway — Node.js / Express
- Authentification JWT
- Rate limiting
- Multi-tenant routing (identification du tenant par sous-domaine ou header)
- Versioning d'API (`/api/v1/...`)

### 3. Services métier

| Service | Responsabilités |
|---|---|
| Stock | CRUD articles, mouvements, alertes de seuil |
| Fournisseurs | Catalogue fournisseurs, bons de commande |
| Facturation | Gestion des plans SaaS, comptage de l'usage |
| Rapports | Génération PDF, exports Excel |
| Notifications | Emails, SMS, alertes in-app |

### 4. Couche données
- **PostgreSQL** — données métier (1 schema par tenant)
- **Redis** — cache API, sessions, pub/sub
- **S3** — fichiers, documents, exports
- **Queue** — jobs asynchrones (emails, génération PDF)

---

## Isolation multi-tenant

Approche retenue : **schema-per-tenant** dans PostgreSQL.

```
postgres/
├── schema: public        → tables globales (tenants, plans)
├── schema: tenant_abc    → données du client ABC
├── schema: tenant_xyz    → données du client XYZ
└── schema: tenant_n      → données du client N
```

Chaque tenant est identifié automatiquement via son sous-domaine (`abc.monapp.com`) ou un header HTTP. Les données ne sont jamais partagées entre tenants.

---

## Modules à construire (ordre de priorité)

### Phase 1 — Fondations
1. **Auth & gestion des tenants** — inscription, onboarding, isolation des données
2. **Catalogue produits** — CRUD articles, catégories, unités, codes-barres

### Phase 2 — Cœur métier
3. **Mouvements de stock** — entrées, sorties, transferts, historique complet
4. **Alertes & seuils** — stock minimum, notifications email/in-app
5. **Fournisseurs & bons de commande** — gestion des achats

### Phase 3 — Valeur ajoutée
6. **Rapports & exports** — tableaux de bord, PDF, Excel
7. **Facturation SaaS** — plans d'abonnement, limites d'usage (Stripe)

---

## Système de personnalisation (sur mesure)

Le cœur de la flexibilité repose sur un système de **feature flags** par tenant.

```json
{
  "tenant_id": "abc",
  "modules": {
    "stock": true,
    "fournisseurs": true,
    "facturation": false,
    "rapports": true,
    "multi_entrepot": false
  },
  "theme": {
    "primary_color": "#2563EB",
    "logo_url": "https://..."
  },
  "plan": "pro"
}
```

Chaque client active/désactive les modules dont il a besoin. Les plans tarifaires (Starter, Pro, Enterprise) définissent les limites d'usage (nb d'articles, d'utilisateurs, de transactions/mois).

---

## Structure des dossiers (recommandée)

```
/
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # Composants réutilisables
│   │   ├── pages/              # Pages par module
│   │   ├── hooks/              # Custom hooks (useStock, useAuth...)
│   │   ├── services/           # Appels API
│   │   └── store/              # État global (Zustand ou Context)
│   └── ...
│
├── backend/                    # Node.js + Express
│   ├── src/
│   │   ├── routes/             # Endpoints par domaine
│   │   ├── controllers/        # Logique de traitement
│   │   ├── services/           # Services métier
│   │   ├── middleware/         # Auth, tenant, rate limit
│   │   ├── prisma/             # Schéma et migrations DB
│   │   └── jobs/               # Jobs asynchrones
│   └── ...
│
├── docker-compose.yml          # Dev local (postgres, redis)
└── README.md
```

---

## Modèle de données (simplifié)

```sql
-- Tenants (schema public)
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  slug VARCHAR UNIQUE,        -- ex: "abc" pour abc.monapp.com
  name VARCHAR,
  plan VARCHAR,               -- starter | pro | enterprise
  config JSONB,               -- feature flags, thème
  created_at TIMESTAMP
);

-- Produits (schema tenant_xxx)
CREATE TABLE products (
  id UUID PRIMARY KEY,
  sku VARCHAR UNIQUE,
  name VARCHAR,
  category_id UUID,
  unit VARCHAR,
  min_stock INT,
  created_at TIMESTAMP
);

-- Mouvements de stock
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  type VARCHAR,               -- IN | OUT | TRANSFER | ADJUSTMENT
  quantity INT,
  reference VARCHAR,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMP
);
```

---

## Plans tarifaires (SaaS)

| Feature | Starter | Pro | Enterprise |
|---|---|---|---|
| Produits | 500 | 10 000 | Illimité |
| Utilisateurs | 3 | 15 | Illimité |
| Entrepôts | 1 | 5 | Illimité |
| Rapports | Basiques | Avancés | Custom |
| API Access | Non | Oui | Oui |
| Support | Email | Prioritaire | Dédié |

---

## Prochaines étapes

- [ ] Initialiser le monorepo (frontend + backend)
- [ ] Configurer Docker Compose (PostgreSQL + Redis)
- [ ] Modéliser le schéma Prisma complet
- [ ] Implémenter l'auth JWT + middleware multi-tenant
- [ ] Créer le CRUD produits (premier module)
- [ ] Mettre en place le système de feature flags
- [ ] Intégrer Stripe pour la facturation
