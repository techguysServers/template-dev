# Docker — environnement local & images de prod

> ⚠️ **Versions** : les tags d'images ici sont indicatifs. Vérifie la dernière
> version stable (Docker Hub / quay.io) et **épingle un digest `@sha256:...` en prod**.

## Stack de dev local

```bash
# Copie les variables (depuis la racine)
cp .env.example .env

# Démarre Postgres+pgvector, Redis, Keycloak, Mailpit
docker compose -f docker/docker-compose.yml up -d

# Logs
docker compose -f docker/docker-compose.yml logs -f

# Stop (garde les volumes)
docker compose -f docker/docker-compose.yml down

# Stop + purge des données
docker compose -f docker/docker-compose.yml down -v
```

| Service | URL / Port | Usage |
|---|---|---|
| Postgres + pgvector | `localhost:5432` | DB relationnelle + embeddings (RAG) |
| Redis | `localhost:6379` | Cache, queues, rate limiting |
| Keycloak | http://localhost:8080 | Auth / SSO (admin: `admin` / `admin`) |
| Mailpit | http://localhost:8025 | Emails capturés en dev |

## Images applicatives

| Dockerfile | Pour |
|---|---|
| `Dockerfile.node` | API Node (Hono, Fastify, NestJS) |
| `Dockerfile.nextjs` | App Next.js (`output: "standalone"`) |
| `Dockerfile.python` | FastAPI / Django (via `uv`) |

```bash
# Build (depuis la racine du service)
docker build -f docker/Dockerfile.node -t my-api:latest .

# Run
docker run -p 3000:3000 --env-file .env my-api:latest
```

## Bonnes pratiques (appliquées dans ces Dockerfiles)

- **Multi-stage** : deps → build → runtime (image finale minimale)
- **Non-root** : un user dédié, jamais `root` en runtime
- **Cache mounts** : `--mount=type=cache` pour des builds rapides
- **Healthcheck** : endpoint `/health` surveillé
- **Pas de secret dans l'image** : tout via env / secrets au runtime

## pgvector — recherche vectorielle

L'extension `vector` est activée au démarrage (`init-db/01-extensions.sql`).

```sql
-- Exemple de table d'embeddings
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  content text NOT NULL,
  embedding vector(1536)            -- dimension du modèle (ex. OpenAI text-embedding-3-small)
);

-- Index pour la recherche par similarité cosinus
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Recherche des 5 plus proches
SELECT content FROM documents ORDER BY embedding <=> $1 LIMIT 5;
```

Drizzle : `import { vector } from "drizzle-orm/pg-core"` puis `embedding: vector("embedding", { dimensions: 1536 })`.
