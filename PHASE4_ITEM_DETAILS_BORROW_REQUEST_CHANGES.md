# Phase 4 — Item Details + Borrow Request

- Connected `item-details.html` to the real `GET /api/items/{id}` endpoint.
- Removed mock item lookup from the item-details flow.
- Added real borrowing date inputs with client-side date checks.
- Connected **Request to borrow** to `POST /api/borrowings` using JWT auth.
- Unauthenticated users are redirected to login and returned to the same item page afterward.
- Handles duplicate requests, own-item requests, unavailable items, validation errors, and backend connection errors.
- Prevents past borrowing start dates in both frontend and backend validation.
- Disables the form after a successful request to avoid accidental duplicate submissions.
- Keeps borrowing free; no price/payment logic was added.
