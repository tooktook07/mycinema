# Base44 Dev Environment

This is a Vite + React + TypeScript + shadcn-ui frontend (Lovable project) that talks to a hosted Supabase backend.

## Running here
- `docker compose -f docker-compose.base44.yml up -d` starts a `node:22` container with the repo bind-mounted at `/app`, runs `npm install` then `npm run dev` (Vite, port 8080 → host 3000).
- Vite dev server binds 0.0.0.0 and `allowedHosts: true` (in `vite.config.ts`) so the preview's external hostname works.

## Credentials
- The frontend reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build/dev time (`src/integrations/supabase/client.ts`).
- Placeholders in `.env.base44-defaults` let the app boot without real credentials. Provide real values via the Base44 Secrets page (delivered to `/run/base44/app.env`, which overrides the defaults) to enable live Supabase data/auth.
- The `supabase/functions/*` edge functions use additional server-side keys (`SUPABASE_SERVICE_ROLE_KEY`, `TMDB_API_KEY`, `OMDB_API_KEY`) but are NOT needed to run the frontend preview.

## Verify
- `curl -sf http://localhost:3000/` returns the app HTML.
- Live reload applies frontend edits automatically; call `reload_preview` only after compose/env/dependency changes.
