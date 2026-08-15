# Brno4You

Erasmus student registration portal for **Brno4You**: collect personal data, upload ID documents, verify fields with OpenAI `gpt-4o-mini`, and manage applications from an admin panel.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- **Supabase** (shared free project `Blacktesto db`) — Postgres tables `brno4you_*` + SECURITY DEFINER RPCs; files in `brno4you_files`
- OpenAI Vision (`gpt-4o-mini`) for cheap ID field extraction

## Setup

```bash
cp .env.example .env.local
# fill URL, anon key, BRNO4YOU_SERVER_SECRET (must match DB brno4you_config.server_secret),
# ADMIN_PASSWORD, SESSION_SECRET, OPENAI_API_KEY
npm install
npm run dev
```

### Env vars

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key (server uses RPCs only) |
| `BRNO4YOU_SERVER_SECRET` | Shared secret for `brno4you_*` RPCs |
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
