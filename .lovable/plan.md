# Improvement Plan

## Goals
1. Make the movie import pipeline resilient to timeouts so 50-page runs don't lose progress.
2. Add a manual "Relaxed Import Mode" that temporarily lowers quality thresholds to discover more movies.
3. Finish the frontend performance refactor started earlier (Movies.tsx search and MovieDetailModal).

## Changes

### 1. Import Pipeline Resumption
- Add `last_processed_page` and `continuation_token` fields to `sync_history`.
- Update `import-new-movies-pipeline` to accept an optional `resumeFromPage` parameter.
- On timeout (`COMPLETED_PARTIAL`), save the last successfully processed page.
- UI: add a "Resume Last Import" button in Account → Data Pipeline when previous run is partial.

### 2. Relaxed Import Mode
- Add a "Relaxed Mode" toggle in the Data Pipeline UI (manual runs only).
- When enabled, lower thresholds:
  - Minimum rating: 6.0 → 5.0
  - Vote tiers: current year 300 → 150, last year 500 → 250, older 1000 → 500
- Pass a `relaxed: true` flag to the edge function; apply thresholds only when flag is set.
- Default mode stays strict to preserve catalog quality.

### 3. Frontend Performance Refactor
- Refactor `Movies.tsx` search/filter to use server-side search with a debounced query instead of client-side filtering of all movies.
- Split `MovieDetailModal` into smaller lazy-loaded chunks (header, cast, recommendations, actions).
- Keep existing UI behavior unchanged.

## Out of Scope
- New recommendation algorithm
- Subscription/payment changes
- Mobile redesign

## Verification
- Run manual import in both strict and relaxed modes.
- Simulate timeout and verify resume continues from correct page.
- Check Lighthouse scores and network tab for reduced payload on Movies page.
