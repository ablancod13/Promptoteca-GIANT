# Promptoteca GIANT

MVP piloto de una plataforma web colaborativa y gamificada de prompts para IA aplicada a enfermedades infecciosas, microbiologia clinica, investigacion, docencia y productividad sanitaria.

## Stack

- Next.js + TypeScript
- Supabase Auth/Postgres/RLS/pgvector
- OpenAI embeddings server-side (`text-embedding-3-small`)
- Vercel + Supabase para despliegue cloud

## Desarrollo local

```bash
pnpm install
pnpm dev
```

Copia `.env.example` a `.env.local` y rellena las variables cuando tengas Supabase/OpenAI. Sin credenciales, la app funciona con datos semilla locales y busqueda textual.

## Verificacion

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Supabase

1. Aplica `supabase/migrations/001_initial_schema.sql`.
2. Carga `supabase/seed.sql`.
3. Activa verificacion de email en Supabase Auth.
4. Genera embeddings de prompts visibles y guardalos en `prompt_embeddings`.
5. Usa `match_prompts_semantic` para recuperar resultados vectoriales.

## Nota legal

Los textos legales incluidos son borradores operativos. Deben revisarse antes de abrir el piloto publico.
