# Verno4U (Brno4You)

Erasmus student registration portal for **Verno4U**: collect personal data, upload ID documents, verify fields with OpenAI `gpt-4o-mini`, and manage applications from an admin panel.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Redis (`REDIS_URL`) for students, sessions, document metadata
- Local `uploads/` in development; **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set
- OpenAI Vision (`gpt-4o-mini`) for cheap ID field extraction

No Supabase.

## Setup

```bash
cp .env.example .env.local
# set REDIS_URL, OPENAI_API_KEY, ADMIN_PASSWORD, SESSION_SECRET
npm install
npm run dev
```

Without `REDIS_URL`, an in-memory store is used (data resets on restart).

### Redis

Local: `redis-server` and `REDIS_URL=redis://127.0.0.1:6379`  
Production (Vercel): use [Upstash](https://upstash.com) and paste the Redis URL (`rediss://...`).

### Env vars

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | Redis connection |
| `OPENAI_API_KEY` | ID verification |
| `ADMIN_PASSWORD` | Admin login |
| `SESSION_SECRET` | Cookie session hashing |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (production uploads) |

## Flows

- Students: `/apply` → form + ID upload → one `gpt-4o-mini` verify → mismatch warning (correct or dismiss)
- Admin: `/admin/login` → list → student detail → generate PDF from template registry

## Extending documents

Add a generator under `src/lib/documents/` and register it in `src/lib/documents/registry.ts`.

## Deploy

Push to [github.com/daniele96l/brno4you](https://github.com/daniele96l/brno4you) and deploy on Vercel with the env vars above.
