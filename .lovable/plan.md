# Improvement Plan

Based on your answers:
- Top pain point: **Speed / performance**
- Import goal: **Both modes** (strict default + relaxed manual option)
- User-facing priority: **Recommendations**
- Business priority: **Near-term monetization**

## 1. Performance: finish frontend optimization
- Refactor `Movies.tsx` search/filter so it does not re-render the full grid on every keystroke.
- Split `MovieDetailModal` into smaller lazy-loaded chunks (poster, metadata, similar movies, actions).
- Keep existing TanStack Query caching rules (staleTime 5m, gcTime 10m).

## 2. Import pipeline: complete relaxed + resume mode
- Finish the `relaxedMode` / `resumePage` controls in the admin UI for `import-new-movies-pipeline`.
- Store and display resume metadata in sync history.
- Add a visible toggle so a manual run can choose strict or relaxed thresholds.

## 3. Recommendations: improve similarity surface
- Add a "Because you watched X" row on the movie detail modal using the existing similarity algorithm.
- Cache top-N similar movies per movie in a lightweight derived table or materialized query to avoid runtime recomputation.
- Expose a "More like this" section on the home page for logged-in users.

## 4. Monetization: add subscription gating
- Introduce a `pro` subscription tier in `profiles`.
- Gate watchlist size and advanced filters behind the pro tier.
- Add a paywall modal triggered when a free user hits the limit.

## Out of scope for this plan
- Changing the core similarity algorithm, database architecture, movie card, watchlist rules, or discover mode logic unless required by the above work.

## Suggested order
1. Performance (quick wins, visible to all users)
2. Relaxed/resume import (improves catalog growth)
3. Recommendations (drives engagement)
4. Monetization gates (builds on watchlist/recommendations)
