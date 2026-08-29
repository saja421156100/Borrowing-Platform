# Phase 2 — Owner Borrow Requests

This phase adds the missing owner-side borrowing request workflow.

## New authenticated endpoints

- `GET /api/received-borrow-requests`
  - Returns requests made for items owned by the authenticated user.
  - Optional filter: `?status=pending|approved|borrowed|returned|rejected`.

- `PATCH /api/borrowings/{id}/approve`
  - Only the owner of the requested item can approve.
  - Only `pending` requests can be approved.
  - The item becomes `unavailable` (reserved) after approval.
  - Other pending requests for the same item are automatically rejected.

- `PATCH /api/borrowings/{id}/reject`
  - Only the owner of the requested item can reject.
  - Only `pending` requests can be rejected.

## Borrow request creation improvements

`POST /api/borrowings` now:

- Prevents users from borrowing their own items.
- Prevents duplicate active requests from the same user for the same item.
- Allows different users to send pending requests for the same available item.
- Uses a database transaction and row locking to keep request/approval state consistent.

## Viewing a request

`GET /api/borrowings/{id}` can now be viewed by either:

- the borrower who created the request, or
- the owner of the requested item.

## Status behavior

- `pending -> approved`: item becomes `unavailable` (reserved).
- `approved -> borrowed`: item becomes `borrowed`.
- `borrowed -> returned`: item becomes `available` and `returned_at` is set.
- `pending -> rejected`: item availability is unchanged.

No new database migration is required for this phase.
