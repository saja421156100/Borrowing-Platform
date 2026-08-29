# Phase 3 — Frontend Borrow Requests Integration

## What changed

- Connected `frontend/borrow-requests.html` to `GET /api/received-borrow-requests`.
- Added status filtering through the backend `status` query parameter.
- Added real owner actions:
  - `PATCH /api/borrowings/{id}/approve`
  - `PATCH /api/borrowings/{id}/reject`
- Requests refresh after an action so automatically rejected competing requests are reflected immediately.
- Added loading, empty, error, and disabled-button states.
- Added a `Requests` link to the main navbar.
- Connected the existing login form to `POST /api/login` because the requests page requires a JWT.
- JWT is stored in `sessionStorage` by default, or `localStorage` when `Remember me` is checked.
- Added an authenticated API helper in `frontend/assets/js/app.js`.
- Unauthenticated/expired sessions redirect back to login and return to the requested page after successful authentication.

## Local development

The frontend API helper currently defaults to:

`http://127.0.0.1:8000/api`

Start Laravel from the main backend directory:

`php artisan serve`

If the backend runs at another URL, set `window.BORROWLY_API_BASE` before loading `assets/js/app.js`, or change the default at the top of that file.

## No database migration required

Phase 3 only connects the existing frontend UI to the Phase 2 API.
