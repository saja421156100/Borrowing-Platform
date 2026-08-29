# Phase 6 - Add Item + My Items

This phase keeps all Phase 1-5 changes and connects item management to the Laravel API.

## Frontend
- `add-item.html` now creates real items through `POST /api/items`.
- Categories are loaded from `GET /api/categories`.
- Item images are uploaded with `multipart/form-data` and previewed before submission.
- The same page supports editing via `add-item.html?id={itemId}`.
- Edit mode verifies the signed-in user is the item owner and sends the update to the API.
- `my-items.html` now loads the signed-in user's real items from `GET /api/my-items`.
- Added status filters, pagination, edit links, and delete actions.
- Delete errors such as active borrowing conflicts are shown to the user.

## Backend
- `my-items` includes review count and average rating for item cards.
- Item create/update no longer accept `status` from the client. Item status is controlled by the borrowing workflow.
- Deleting an item with a pending, approved, or borrowed borrowing is blocked with HTTP 409.
- Existing ownership checks remain enforced for update/delete.

## Database
No new migration is required for Phase 6.
