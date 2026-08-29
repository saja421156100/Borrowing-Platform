# Phase 5 — Browse connected to the API

## Frontend
- `browse.html` no longer renders `BORROWLY_ITEMS` or `BORROWLY_CATEGORIES` mock data.
- Categories are loaded from `GET /api/categories`.
- Items are loaded from `GET /api/items`.
- Search, category, status and sort filters now call the backend.
- Added real pagination and real total item counts.
- Browse URLs preserve active filters and support legacy `?category=Name` links from the home page.
- Item cards now support nested API category/owner objects and use real item IDs.
- Added loading, empty and API error states.

## Backend
- `GET /api/items` now includes `reviews_count` and `reviews_avg_rating`.
- Added `sort=rating` for Highest Rated ordering.
- `GET /api/categories` now returns `items_count` efficiently instead of loading every item in every category.

## Database
- No migration is required for this phase.
