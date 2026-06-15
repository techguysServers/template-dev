-- Exécuté automatiquement au premier démarrage de Postgres (docker-entrypoint-initdb.d).
-- Active les extensions utiles. pgvector pour les embeddings / RAG.

CREATE EXTENSION IF NOT EXISTS vector;       -- recherche vectorielle (pgvector)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- recherche fuzzy / trigram

-- Base dédiée à Keycloak (le service keycloak du compose s'y connecte)
SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
