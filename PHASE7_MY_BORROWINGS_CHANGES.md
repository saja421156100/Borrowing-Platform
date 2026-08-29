# Phase 7 — My Borrowings API Integration

## Frontend
- Replaced mock borrowing rows and hard-coded dashboard counts in `frontend/my-borrowings.html`.
- The page now loads the authenticated user's real records from `GET /api/my-borrowings`.
- Added real summary counts for active (approved + borrowed), pending, and returned borrowings.
- Added client-side status filtering for pending, approved, borrowed, returned, and rejected records.
- Added loading, empty, authentication, backend connection, and API error states.
- Added item and owner information from the API response.
- Added direct links to the real item details page using database item IDs.
- Added a visual Overdue state for borrowed records whose due date is in the past. This is presentation-only and does not add a new database status.
- Returned records show the actual return date when available.

## Backend
- No database migration was required.
- Existing authenticated endpoint `GET /api/my-borrowings` already returns the required borrowing, item, and owner data.

## Run
Start Laravel from the main backend folder:

```bash
cd backend
php artisan serve
```

Then log in and open `frontend/my-borrowings.html`.
