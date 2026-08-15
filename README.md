# Verno4U (Brno4You)

Erasmus student registration portal for **Verno4U**: collect personal data, upload ID documents, verify fields with OpenAI `gpt-4o-mini`, and manage applications from an admin panel.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- **Supabase** (shared free project `Blacktesto db`) — Postgres tables `verno4u_*` + SECURITY DEFINER RPCs; files in `verno4u_files`
- OpenAI Vision (`gpt-4o-mini`) for cheap ID field extraction
- No Redis / no Vercel KV

## Setup

```bash
cp .env.example .env.local
# fill URL, anon key, VERNO4U_SERVER_SECRET (must match DB verno4u_config.server_secret),
# ADMIN_PASSWORD, SESSION_SECRET, OPENAI_API_KEY
npm install
npm run dev
```

### Env vars

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key (server uses RPCs only) |
| `VERNO4U_SERVER_SECRET` | Shared secret for `verno4u_*` RPCs |
| `OPENAI_API_KEY` | ID verification |
| `ADMIN_PASSWORD` | Admin login |
| `SESSION_SECRET` | Cookie session hashing |

## Flows

- Students: `/apply` → form + ID upload → one `gpt-4o-mini` verify → mismatch warning (correct or dismiss)
- Admin: `/admin/login` → list → student detail → generate PDF from template registry

## Extending documents

Add a generator under `src/lib/documents/` and register it in `src/lib/documents/registry.ts`.

## Deploy

Repo: [github.com/daniele96l/brno4you](https://github.com/daniele96l/brno4you) · Live: [brno4you.vercel.app](https://brno4you.vercel.app)
