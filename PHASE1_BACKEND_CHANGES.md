# Borrowly Phase 1 — Items & Ownership

## Completed

- Public item browsing and item details remain available without authentication.
- Creating, updating and deleting items now requires JWT authentication.
- Only the item owner can update or delete an item.
- Client requests can no longer change `user_id`.
- Added `GET /api/my-items` for the authenticated user's listings.
- Added item listing fields:
  - `condition` (`excellent`, `good`, `fair`)
  - `location`
- Borrowly is now treated as a **free borrowing platform**. There is no item price, rental fee, or payment calculation.
- Removed price fields, price filters and price sorting from the Items API.
- Removed mock prices and rental-cost UI from the frontend.

## Database note

Run:

```bash
php artisan migrate
```

A safe cleanup migration is included. If an earlier version already created `price_per_day`, the cleanup migration removes it. If that column was never created, the migration simply does nothing.

## Next recommended phase

Implement received borrow requests so item owners can view incoming requests and approve or reject them.
