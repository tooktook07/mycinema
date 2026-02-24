# Migration Guide: Lovable Cloud → Self-Hosted Supabase

This guide covers transferring this project's backend from Lovable Cloud to a standalone Supabase project.

---

## Prerequisites

- A [Supabase account](https://supabase.com)
- Access to the project's GitHub repository
- Node.js and npm/bun installed locally

---

## Step 1: Create a New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose your organization, set a name, database password, and region
4. Note your **Project URL** and **Anon Key** from Settings → API

---

## Step 2: Export & Apply Database Schema

### Option A: Use Migration Files

This project stores migrations in `supabase/migrations/`. Apply them to your new project:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your new project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

### Option B: Manual SQL Export

If migration files are incomplete, export from Lovable Cloud:

1. Open Lovable → Cloud → Database → Run SQL
2. Export each table's schema using:
   ```sql
   SELECT pg_get_tabledef('public', 'movies');
   ```
3. Run the exported SQL in your new Supabase project's SQL Editor

### Tables to Migrate

| Table | Purpose |
|-------|---------|
| `movies` | Core movie catalog |
| `tv_shows` | TV show catalog |
| `profiles` | User profiles & subscription info |
| `user_roles` | Admin/user role assignments |
| `user_ratings` | User ratings & watchlist |
| `user_activity_logs` | Activity audit trail |
| `sync_history` | TMDB sync run history |
| `system_settings` | App configuration |
| `omdb_api_usage` | OMDb API rate tracking |
| `movie_sync_tracker` | Sync cycle state |
| `tmdb_processed_movies` | Processed TMDB IDs |

---

## Step 3: Migrate Database Functions

The following database functions must be created in your new project. Run these in the SQL Editor:

- `handle_new_user()` — Trigger: auto-creates profile on signup
- `update_updated_at_column()` — Trigger: auto-updates `updated_at`
- `has_role()` — Checks if user has a specific role
- `get_genre_stats()` — Returns genre distribution
- `get_decade_stats()` — Returns decade distribution
- `get_user_stats()` — Returns user statistics JSON
- `get_user_watchlist_count()` — Returns watchlist count
- `get_user_activity_summary()` — Returns activity summary
- `get_effective_rating()` — Returns IMDb or TMDB rating
- `get_current_sync_day()` — Returns current sync cycle day
- `get_automation_health()` — Returns sync health metrics
- `detect_suspicious_activity()` — Security alerting
- `increment_omdb_usage()` — Tracks OMDb API usage
- `update_sync_tracker_cycle()` — Advances sync cycle
- `validate_profile_updates()` — Prevents non-admin subscription changes

All function definitions can be found in `supabase/migrations/` or exported from the current database.

---

## Step 4: Migrate RLS Policies

Row Level Security policies are critical. Key policies include:

- **movies**: Public read, no public write
- **tv_shows**: Public read, no public write
- **profiles**: Users read/update own, admins read/update all
- **user_ratings**: Users CRUD own data only
- **user_roles**: Users read own, admins full CRUD
- **sync_history**: Admins full access, users read own
- **system_settings**: Admins manage, public reads `accessibility_widget_enabled`

Ensure RLS is **enabled** on all tables after creation.

---

## Step 5: Migrate Storage Buckets

1. Create a **public** bucket named `movie-posters` in your new Supabase project
2. Add storage policies:
   ```sql
   -- Public read access
   CREATE POLICY "Public poster access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'movie-posters');
   
   -- Admin upload access
   CREATE POLICY "Admin poster upload"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'movie-posters'
     AND auth.role() = 'authenticated'
   );
   ```
3. Transfer existing poster files (download from Lovable Cloud, upload to new bucket)

---

## Step 6: Deploy Edge Functions

Edge functions live in `supabase/functions/`. Deploy them:

```bash
supabase functions deploy import-tmdb-movies
supabase functions deploy cancel-sync
supabase functions deploy enrich-with-omdb
supabase functions deploy store-posters
supabase functions deploy refresh-movies-pipeline
supabase functions deploy import-new-movies-pipeline
supabase functions deploy log-activity
supabase functions deploy sync-single-movie
supabase functions deploy delete-movie
supabase functions deploy health-check
supabase functions deploy check-movie-import
```

### JWT Verification Settings

Check `supabase/config.toml` for each function's `verify_jwt` setting. Functions with `verify_jwt = false` (pipelines, health-check) are called by cron jobs and don't require auth tokens.

---

## Step 7: Configure Secrets

Set the following secrets in your new Supabase project (Settings → Edge Functions → Secrets):

| Secret | Source |
|--------|--------|
| `TMDB_API_KEY` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| `OMDB_API_KEY` | [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) |
| `CRON_SECRET` | Generate a strong random string |

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in edge functions.

---

## Step 8: Set Up Cron Jobs

The project uses automated pipelines triggered by cron. Set these up using:

- **Supabase Cron** (pg_cron extension), or
- **External scheduler** (e.g., cron-job.org, GitHub Actions)

### Pipelines to Schedule

| Pipeline | Endpoint | Schedule |
|----------|----------|----------|
| Import new movies | `import-new-movies-pipeline` | Daily |
| Refresh existing movies | `refresh-movies-pipeline` | Daily |

Each pipeline authenticates via the `x-cron-secret` header:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/import-new-movies-pipeline \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## Step 9: Update Frontend Environment

Update the `.env` file (or hosting environment variables):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

---

## Step 10: Migrate Data

### Export from Lovable Cloud

Use the Cloud UI to export data table by table (Cloud → Database → Tables → Export), or run:

```sql
-- Example: Export movies as CSV
COPY (SELECT * FROM movies) TO STDOUT WITH CSV HEADER;
```

### Import to New Project

```sql
-- Import via Supabase SQL Editor or psql
\copy movies FROM 'movies.csv' WITH CSV HEADER;
```

**Import order matters** (respect foreign keys):
1. `profiles`
2. `user_roles`
3. `movies`
4. `tv_shows`
5. `user_ratings`
6. `sync_history`
7. `system_settings`
8. `omdb_api_usage`
9. `movie_sync_tracker`
10. `tmdb_processed_movies`
11. `user_activity_logs`

---

## Step 11: Auth Configuration

1. In your new Supabase project, go to Authentication → Settings
2. Configure email auth (disable auto-confirm unless desired)
3. Set the Site URL to your deployed frontend URL
4. Add redirect URLs for login/signup flows

> **Note:** User accounts from Lovable Cloud cannot be migrated directly. Users will need to re-register, or you can use the Supabase Admin API to create accounts programmatically.

---

## Step 12: Verify

Run the health check to confirm everything works:

```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/health-check
```

Expected response: `"overall": "healthy"`

### Checklist

- [ ] All tables created with correct columns
- [ ] RLS policies applied and enabled
- [ ] Database functions and triggers created
- [ ] Storage bucket created with policies
- [ ] Edge functions deployed
- [ ] Secrets configured
- [ ] Cron jobs scheduled
- [ ] Frontend `.env` updated
- [ ] Data imported
- [ ] Auth configured
- [ ] Health check passes
- [ ] Test login/signup flow
- [ ] Test movie browsing
- [ ] Test watchlist functionality
- [ ] Test admin sync features

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| RLS blocking queries | Check policies match exactly; verify `has_role()` function exists |
| Edge function auth errors | Verify `verify_jwt` settings in config match your setup |
| Missing data | Check Supabase 1000-row default limit; use pagination |
| Cron not triggering | Verify `CRON_SECRET` matches between scheduler and edge function |
| Poster images broken | Ensure `movie-posters` bucket is public and files are uploaded |
